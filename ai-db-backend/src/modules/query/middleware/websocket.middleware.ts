// src/modules/query/middleware/websocket.middleware.ts

import * as ws from "ws";
import { Request } from "express";
import { createContextLogger } from "../../../config/logger";
import { verifyWebSocketToken } from "../../auth/middleware/verification.middleware";

const wsLogger = createContextLogger("WebSocketMiddleware");

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  error?: string;
}

/**
 * Initialize WebSocket handlers
 */
export function initializeWebSocketHandlers(wss: ws.Server) {
  wsLogger.info("Initializing WebSocket handlers");
  
  wss.on('connection', async (socket: ws.WebSocket, req: Request) => {
    // Handle WebSocket connection (now async)
    await handleWebSocketConnection(socket, req);
  });
}


/**
 * Handle WebSocket connection - now an async function
 */
async function handleWebSocketConnection(socket: ws.WebSocket, req: Request) {
  const ip = req.socket.remoteAddress;
  wsLogger.info(`WebSocket connection from ${ip}`);
  
  sendMessage(socket, {
    type: "connected",
    message: "Connected to EasyData WebSocket API"
  });
  
  // Handle authentication
  const token = extractTokenFromRequest(req);
  if (!token) {
    sendMessage(socket, {
      type: "error",
      message: "Authentication required",
      error: "No token provided"
    });
    socket.close();
    return;
  }
  
  try {
    // Verify the token - now properly awaited
    const userId = await verifyWebSocketToken(token);
    if (!userId) {
      sendMessage(socket, {
        type: "error",
        message: "Authentication failed",
        error: "Invalid or expired token"
      });
      socket.close();
      return;
    }
    
    // Check for userId in query params for redundancy
    const queryParams = new URLSearchParams(req.url?.split('?')[1] || '');
    const queryUserId = queryParams.get('userId');
    
    // Compare with token userId if provided (convert both to strings for comparison)
    if (queryUserId && queryUserId !== userId.toString()) {
      wsLogger.warn(`User ID mismatch: token=${userId}, query=${queryUserId}`);
      sendMessage(socket, {
        type: "error",
        message: "Authentication failed",
        error: "User ID mismatch"
      });
      socket.close();
      return;
    }
    
    // Store user ID with socket
    (socket as any).userId = userId;
    wsLogger.info(`User ${userId} authenticated via WebSocket`);
    
    // Add event listeners
    socket.on('message', (message) => handleSocketMessage(socket, message));
    socket.on('close', () => handleSocketClose(socket));
    socket.on('error', (error) => handleSocketError(socket, error));
  } catch (error) {
    wsLogger.error(`Error authenticating WebSocket: ${(error as Error).message}`);
    sendMessage(socket, {
      type: "error",
      message: "Authentication failed",
      error: (error as Error).message
    });
    socket.close();
  }
}

/**
 * Extract token from request
 */
function extractTokenFromRequest(req: Request): string | null {
  // Check query parameters
  const url = req.url || '';
  const queryString = url.split('?')[1] || '';
  const params = new URLSearchParams(queryString);
  const queryToken = params.get('token');
    
  if (queryToken) {
    return queryToken;
  }
  
  // Check authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Handle incoming socket message
 */
async function handleSocketMessage(socket: ws.WebSocket, data: ws.RawData) {
  const userId = (socket as any).userId;
  
  if (!userId) {
    sendMessage(socket, {
      type: "error",
      message: "Not authenticated"
    });
    socket.close();
    return;
  }
  
  try {
    const messageStr = data.toString('utf8');
    const message = JSON.parse(messageStr);
    
    // Validate userId in message if provided
    if (message.data && message.data.userId && message.data.userId.toString() !== userId.toString()) {
      wsLogger.warn(`User ID mismatch in message: socket=${userId}, message=${message.data.userId}`);
      sendMessage(socket, {
        type: "error",
        message: "User ID mismatch in message",
        error: "Authentication failed"
      });
      return;
    }
    
    // Import controllers dynamically to avoid circular dependencies
    const { processWebSocketQuery } = await import('../controllers/ai-query.controller');
    
    // Handle message based on type
    switch (message.type) {
      case 'query':
        // Always use userId from socket for security
        const queryData = {
          ...message.data,
          userId // Ensure userId is added correctly
        };
        
        await processWebSocketQuery(socket, userId, queryData);
        break;
        
      case 'ping':
        sendMessage(socket, { 
          type: 'pong',
          data: { timestamp: Date.now() }
        });
        break;
        
      default:
        sendMessage(socket, {
          type: "error",
          message: "Unknown message type",
          error: `Message type '${message.type}' not supported`
        });
    }
  } catch (error) {
    wsLogger.error(`Error processing WebSocket message: ${(error as Error).message}`);
    sendMessage(socket, {
      type: "error",
      message: "Failed to process message",
      error: (error as Error).message
    });
  }
}

/**
 * Handle socket close event
 */
function handleSocketClose(socket: ws.WebSocket) {
  const userId = (socket as any).userId;
  if (userId) {
    wsLogger.info(`WebSocket disconnected for user ${userId}`);
  } else {
    wsLogger.info('WebSocket disconnected (unauthenticated)');
  }
}

/**
 * Handle socket error
 */
function handleSocketError(socket: ws.WebSocket, error: Error) {
  const userId = (socket as any).userId;
  wsLogger.error(`WebSocket error ${userId ? `for user ${userId}` : ''}: ${error.message}`);
  
  sendMessage(socket, {
    type: "error",
    message: "WebSocket error occurred",
    error: error.message
  });
}

/**
 * Send a message through the WebSocket
 */
export function sendMessage(socket: ws.WebSocket, message: WebSocketMessage) {
  if (socket.readyState === ws.WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export default { initializeWebSocketHandlers, sendMessage };
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
  
  wss.on('connection', (socket: ws.WebSocket, req: Request) => {
    // Handle WebSocket connection
    handleWebSocketConnection(socket, req);
  });
}


/**
 * Handle WebSocket connection
 */
function handleWebSocketConnection(socket: ws.WebSocket, req: Request) {
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
  
  // Verify the token
  const userId = verifyWebSocketToken(token);
  if (!userId) {
    sendMessage(socket, {
      type: "error",
      message: "Authentication failed",
      error: "Invalid or expired token"
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
}

/**
 * Extract token from request
 */
function extractTokenFromRequest(req: Request): string | null {
  // Check query parameters
  const queryToken = req.url?.split('?')[1]?.split('&')
    .find(param => param.startsWith('token='))
    ?.split('=')[1];
    
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
    
    // Import controllers dynamically to avoid circular dependencies
    const { processWebSocketQuery } = await import('../controllers/ai-query.controller');
    
    // Handle message based on type
    switch (message.type) {
      case 'query':
        await processWebSocketQuery(socket, userId, message.data);
        break;
        
      case 'ping':
        sendMessage(socket, { type: 'pong' });
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
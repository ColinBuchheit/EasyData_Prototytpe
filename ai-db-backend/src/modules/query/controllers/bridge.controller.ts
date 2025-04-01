// src/modules/query/controllers/bridge.controller.ts

import { Response } from "express";
import { createContextLogger } from "../../../config/logger";
import { AuthRequest } from "../../auth/middleware/verification.middleware";
import { asyncHandler } from "../../../shared/utils/errorHandler";
import { QueryService } from "../services/query.service";
import { ConnectionsService } from "../../database/services/connections.service";
import { SchemaService } from "../../database/services/schema.service";
import { getMongoClient } from "../../../config/db";

const bridgeLogger = createContextLogger("BridgeController");

/**
 * Execute a query specifically for the AI Agent Network
 * This endpoint matches the expected format in utils/backend_bridge.py
 */
export const executeQueryForAIAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { query, db_info, user_id } = req.body;
    
    if (!query || !db_info || !user_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required parameters: query, db_info, or user_id" 
      });
    }
    
    bridgeLogger.info(`Executing query for AI agent, user: ${user_id}`);
    
    // Translate user_id to number if it's a string
    const userId = typeof user_id === 'string' ? parseInt(user_id, 10) : user_id;
    
    // Extract dbId from db_info
    const dbId = db_info.id || db_info.dbId;
    
    if (!dbId) {
      return res.status(400).json({
        success: false,
        message: "Missing database ID in db_info"
      });
    }
    
    // Execute query through standard service
    const result = await QueryService.executeQuery(userId, {
      dbId,
      query
    });
    
    return res.json({
      success: result.success,
      result: result.rows,
      message: result.message,
      error: result.error
    });
  } catch (error) {
    bridgeLogger.error(`Error executing query for AI agent: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to execute query",
      error: (error as Error).message
    });
  }
});

/**
 * Fetch schema information for the AI Agent Network
 * This endpoint matches the expected format in utils/backend_bridge.py
 */
export const fetchSchemaForAIAgent = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { db_info, user_id } = req.body;
    
    if (!db_info || !user_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required parameters: db_info or user_id" 
      });
    }
    
    // Translate user_id to number if it's a string
    const userId = typeof user_id === 'string' ? parseInt(user_id, 10) : user_id;
    
    // Extract dbId from db_info
    const dbId = db_info.id || db_info.dbId;
    
    if (!dbId) {
      return res.status(400).json({
        success: false,
        message: "Missing database ID in db_info"
      });
    }
    
    bridgeLogger.info(`Fetching schema for AI agent, user: ${userId}, db: ${dbId}`);
    
    // Get database connection
    const connection = await ConnectionsService.getConnectionById(userId, dbId);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: `Database with ID ${dbId} not found or user doesn't have access to it.`
      });
    }
    
    // Get tables
    const tables = await ConnectionsService.fetchTablesFromConnection(connection);
    
    // Get schema for each table
    const schema: Record<string, any> = {};
    for (const table of tables) {
      try {
        schema[table] = await ConnectionsService.fetchSchemaFromConnection(connection, table);
      } catch (error) {
        bridgeLogger.warn(`Failed to fetch schema for table ${table}: ${(error as Error).message}`);
        schema[table] = [];
      }
    }
    
    // Get metadata if available
    let metadata = null;
    try {
      metadata = await SchemaService.getDbMetadata(userId, dbId);
    } catch (error) {
      // If metadata fetch fails, just continue without it
      bridgeLogger.warn(`Failed to fetch metadata: ${(error as Error).message}`);
    }
    
    return res.json({
      success: true,
      schema: {
        tables,
        columns: schema,
        db_type: connection.db_type,
        metadata
      }
    });
  } catch (error) {
    bridgeLogger.error(`Error fetching schema for AI agent: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch schema",
      error: (error as Error).message
    });
  }
});

/**
 * Store conversation context for the AI Agent Network
 * This endpoint matches the expected format in utils/backend_bridge.py
 */
export const storeConversationContext = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, context, conversation_id, prompt, query, output } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required parameter: user_id" 
      });
    }
    
    // Translate user_id to number if it's a string
    const userId = typeof user_id === 'string' ? parseInt(user_id, 10) : user_id;
    
    bridgeLogger.info(`Storing conversation context for user: ${userId}`);
    
    const client = await getMongoClient();
    
    // Store context in MongoDB
    await client.db().collection('conversation_contexts').updateOne(
      { userId, conversation_id: conversation_id || 'default' },
      { 
        $set: { 
          userId,
          context,
          prompt,
          query,
          output,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    return res.json({
      success: true,
      message: "Conversation context stored successfully"
    });
  } catch (error) {
    bridgeLogger.error(`Error storing conversation context: ${(error as Error).message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to store conversation context",
      error: (error as Error).message
    });
  }
});
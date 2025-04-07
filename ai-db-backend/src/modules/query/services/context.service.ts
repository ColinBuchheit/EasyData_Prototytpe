// src/modules/query/services/context.service.ts

import { createContextLogger } from "../../../config/logger";
import { getMongoClient } from "../../../config/db";
import { ConnectionsService } from "../../database/services/connections.service";
import { SchemaService } from "../../database/services/schema.service";
import { ContextSwitchResult, DatabaseMatch, QueryContext } from "../models/context.model";
import { getRedisClient } from "../../../config/redis";


const contextLogger = createContextLogger("ContextService");

export class ContextService {
  /**
   * Detects which database to use based on query content
   */
  // src/modules/query/services/context.service.ts (partial with fixes)

  /**
   * Detects which database to use based on query content
   */
  static async detectDatabaseFromQuery(userId: number, query: string): Promise<DatabaseMatch[] | null> {
    try {
      // Get all user's databases
      const userDatabases = await ConnectionsService.getUserConnections(userId);
      if (!userDatabases || userDatabases.length === 0) return null;
      
      // If only one database exists, use it with high confidence
      if (userDatabases.length === 1) {
        return [{
          dbId: userDatabases[0].id,
          confidence: 1.0,
          reason: "Only one database available"
        }];
      }
      
      // Initialize matches array
      const matches: DatabaseMatch[] = [];
      
      // 1. Check for explicit database name mentions
      for (const db of userDatabases) {
        // Match connection name
        if (db.connection_name && query.toLowerCase().includes(db.connection_name.toLowerCase())) {
          matches.push({ 
            dbId: db.id, 
            confidence: 0.9,
            reason: `Explicit mention of connection name "${db.connection_name}"`
          });
          continue;
        }
        
        // Match database type
        if (query.toLowerCase().includes(db.db_type.toLowerCase())) {
          matches.push({ 
            dbId: db.id, 
            confidence: 0.7,
            reason: `Mention of database type "${db.db_type}"`
          });
          continue;
        }
        
        // Match database name
        if (db.database_name && query.toLowerCase().includes(db.database_name.toLowerCase())) {
          matches.push({ 
            dbId: db.id, 
            confidence: 0.8,
            reason: `Mention of database name "${db.database_name}"`
          });
        }
      }
      
      // 2. Check usage history
      const recentUsage = await this.getRecentDatabaseUsage(userId);
      for (const usage of recentUsage) {
        // Boost confidence for recently used databases
        const existingMatch = matches.find(m => m.dbId === usage.dbId);
        if (existingMatch) {
          existingMatch.confidence += 0.1 * Math.min(usage.count, 5); // Max 0.5 boost
          existingMatch.reason += `, Recently used (${usage.count} queries)`;
        } else {
          matches.push({ 
            dbId: usage.dbId, 
            confidence: 0.3 * Math.min(usage.count, 3),
            reason: `Recently used database (${usage.count} queries)`
          });
        }
      }
      
      // Sort by confidence (highest first)
      matches.sort((a, b) => b.confidence - a.confidence);
      
      return matches.length > 0 ? matches : null;
    } catch (error) {
      contextLogger.error(`Error detecting database from query: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Uses AI to select the best database based on schema knowledge
   */
  static async selectDatabaseForQuery(userId: number, query: string): Promise<number | null> {
    try {
      // Get all user's databases with their metadata
      const allMetadata = await SchemaService.getAllDbMetadata(userId);
      if (!allMetadata || allMetadata.length === 0) {
        // Fall back to basic selection
        const matches = await this.detectDatabaseFromQuery(userId, query);
        return matches && matches.length > 0 ? matches[0].dbId : null;
      }
      
      // Get database matches based on name/usage first
      const basicMatches = await this.detectDatabaseFromQuery(userId, query);
      
      // If we have a very high confidence match, use it
      const highConfidenceMatch = basicMatches?.find(m => m.confidence > 0.9);
      if (highConfidenceMatch) {
        return highConfidenceMatch.dbId;
      }
      
      // Import AIAgentService dynamically to avoid circular dependency
      const { AIAgentService } = await import('./ai-agent.service');
      
      // Call AI to match query to the best database based on content
      const aiResponse = await AIAgentService.runOrchestration({
        operation: "match_database",
        userId,
        query,
        databases: allMetadata
      });
      
      if (aiResponse.success && aiResponse.selectedDbId) {
        contextLogger.info(`AI selected database ${aiResponse.selectedDbId} for query`);
        return aiResponse.selectedDbId;
      }
      
      // Fall back to best basic match
      return basicMatches && basicMatches.length > 0 ? basicMatches[0].dbId : null;
    } catch (error) {
      contextLogger.error(`Error selecting database for query: ${(error as Error).message}`);
      
      // Fall back to basic matching
      const matches = await this.detectDatabaseFromQuery(userId, query);
      return matches && matches.length > 0 ? matches[0].dbId : null;
    }
  }

  /**
   * Gets recent database usage stats for a user
   */
  static async getRecentDatabaseUsage(userId: number): Promise<{dbId: number, count: number}[]> {
    try {
      const client = await getMongoClient();
      const result = await client.db().collection('query_history').aggregate([
        { $match: { userId: userId } },
        { $group: { _id: "$dbId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).toArray();
      
      return result.map(r => ({ dbId: Number(r._id), count: r.count }));
    } catch (error) {
      contextLogger.error(`Error getting database usage history: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Detects if user is requesting to switch database context
   */
  static async detectContextSwitch(userId: number, query: string): Promise<ContextSwitchResult> {
    try {
      // Patterns for context switching commands
      const switchPatterns = [
        /(?:use|switch to|query)\s+(?:my|the)?\s+([a-zA-Z0-9_-]+)\s+(?:database|db)/i,
        /(?:now|let's|let me)\s+(?:use|query)\s+(?:my|the)?\s+([a-zA-Z0-9_-]+)/i,
        /(?:connect to|access)\s+(?:my|the)?\s+([a-zA-Z0-9_-]+)/i
      ];
      
      // Extract potential database reference
      let dbReference: string | null = null;
      
      for (const pattern of switchPatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
          dbReference = match[1];
          break;
        }
      }
      
      if (!dbReference) return { switched: false };
      
      // Look for matching database
      const userDatabases = await ConnectionsService.getUserConnections(userId);
      if (!userDatabases || userDatabases.length === 0) {
        return { switched: false, message: "No databases available" };
      }
      
      // Try to match by name, connection name, or type
      const matchedDb = userDatabases.find(db => 
        db.connection_name?.toLowerCase() === dbReference?.toLowerCase() ||
        db.database_name.toLowerCase() === dbReference?.toLowerCase() ||
        db.db_type.toLowerCase() === dbReference?.toLowerCase()
      );
      
      if (matchedDb) {
        // Update user's current database context
        await this.setCurrentDatabaseContext(userId, matchedDb.id);
        
        return { 
          switched: true, 
          dbId: matchedDb.id,
          message: `Switched to ${matchedDb.connection_name || matchedDb.database_name} (${matchedDb.db_type})`
        };
      }
      
      return { 
        switched: false,
        message: `Could not find a database matching "${dbReference}"`
      };
    } catch (error) {
      contextLogger.error(`Error detecting context switch: ${(error as Error).message}`);
      return { switched: false, message: "Error processing database switch" };
    }
  }

  /**
   * Stores the current database context in Redis
   */
  static async setCurrentDatabaseContext(userId: number, dbId: number): Promise<void> {
    try {
      const redisClient = await getRedisClient();
      await redisClient.set(`user:${userId}:current_db`, dbId.toString(), "EX", 86400); // 24hr expiry
      
      // Also record this in the database for history
      const client = await getMongoClient();
      await client.db().collection('context_switches').insertOne({
        userId: userId.toString(),
        dbId,
        timestamp: new Date()
      });
    } catch (error) {
      contextLogger.error(`Error setting database context: ${(error as Error).message}`);
    }
  }

  /**
   * Gets the current database context from Redis
   */
  static async getCurrentDatabaseContext(userId: number): Promise<number | null> {
    try {
      const redisClient = await getRedisClient();
      const currentDb = await redisClient.get(`user:${userId}:current_db`);
      
      if (currentDb) {
        return parseInt(currentDb, 10);
      }
      
      // If no current context, get most recently used DB
      const client = await getMongoClient();
      const recentContext = await client.db().collection('context_switches')
        .find({ userId: userId.toString() })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();
        
      if (recentContext.length > 0) {
        return parseInt(recentContext[0].dbId.toString());
      }
      
      return null;
    } catch (error) {
      contextLogger.error(`Error getting current database context: ${(error as Error).message}`);
      return null;
    }
  }
  
  /**
   * Get all database context info for a user
   */
  static async getUserContext(userId: number): Promise<QueryContext | null> {
    try {
      // Get current context
      const currentDbId = await this.getCurrentDatabaseContext(userId);
      
      // Get recent queries
      const client = await getMongoClient();
      const recentQueries = await client.db().collection('query_history')
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();
        
      // Get most recent context switch
      const recentSwitch = await client.db().collection('context_switches')
        .find({ userId: userId.toString() })
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();
        
      const lastSwitchTime = recentSwitch.length > 0 
        ? new Date(recentSwitch[0].timestamp) 
        : new Date();
        
      return {
        userId,
        currentDbId,
        lastSwitchTime,
        recentQueries: recentQueries.map(q => ({
          dbId: q.dbId,
          timestamp: new Date(q.timestamp),
          query: q.queryText
        }))
      };
    } catch (error) {
      contextLogger.error(`Error getting user context: ${(error as Error).message}`);
      return null;
    }
  }
}

export default ContextService;
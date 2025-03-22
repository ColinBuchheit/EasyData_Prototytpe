// New file: src/services/databaseContext.service.ts

import { getRedisClient, getMongoClient } from "../config/db";
import { fetchUserDatabases, fetchDatabaseById } from "./userdb.service";
import { getAllDbMetadata, getDbMetadata } from "./schema.service";
import logger from "../config/logger";
import axios from "axios";

interface DatabaseMatch {
  dbId: number;
  confidence: number;
}

/**
 * Detects which database to use based on natural language query content
 */
export async function detectDatabaseFromQuery(userId: number, query: string): Promise<number | null> {
  try {
    // Get all user's databases
    const userDatabases = await fetchUserDatabases(userId);
    if (!userDatabases || userDatabases.length === 0) return null;
    
    // If only one database exists, use it
    if (userDatabases.length === 1) return userDatabases[0].id;
    
    // Natural language database detection
    const matches: DatabaseMatch[] = [];
    
    // 1. Check for explicit database name mentions
    for (const db of userDatabases) {
      // Match database name
      if (db.connection_name && query.toLowerCase().includes(db.connection_name.toLowerCase())) {
        matches.push({ dbId: db.id, confidence: 0.9 });
        continue;
      }
      
      // Match database type
      if (query.toLowerCase().includes(db.db_type.toLowerCase())) {
        matches.push({ dbId: db.id, confidence: 0.7 });
        continue;
      }
      
      // Match database name in query
      if (db.database_name && query.toLowerCase().includes(db.database_name.toLowerCase())) {
        matches.push({ dbId: db.id, confidence: 0.8 });
      }
    }
    
    // 2. Check usage history
    const recentUsage = await getRecentDatabaseUsage(userId);
    for (const usage of recentUsage) {
      // Boost confidence for recently used databases
      const existingMatch = matches.find(m => m.dbId === usage.dbId);
      if (existingMatch) {
        existingMatch.confidence += 0.1 * Math.min(usage.count, 5); // Max 0.5 boost
      } else {
        matches.push({ dbId: usage.dbId, confidence: 0.3 * Math.min(usage.count, 3) });
      }
    }
    
    // Find highest confidence match
    if (matches.length > 0) {
      matches.sort((a, b) => b.confidence - a.confidence);
      return matches[0].dbId;
    }
    
    // Default to most recently used database
    if (recentUsage.length > 0) {
      return recentUsage[0].dbId;
    }
    
    // If no match found, return first database
    return userDatabases[0].id;
    
  } catch (error) {
    logger.error(`❌ Error detecting database from query: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Uses AI to select the best database based on schema knowledge
 */
export async function selectDatabaseForQuery(userId: number, query: string): Promise<number | null> {
  try {
    // Get all user's databases with their metadata
    const allMetadata = await getAllDbMetadata(userId);
    if (!allMetadata || allMetadata.length === 0) {
      // Fall back to basic selection
      return detectDatabaseFromQuery(userId, query);
    }
    
    // Call AI to match query to the best database based on content
    const aiResponse = await axios.post("http://ai-agent-network:5001/run", {
      operation: "match_database",
      userId,
      query,
      databases: allMetadata
    });
    
    if (aiResponse.data.success && aiResponse.data.selectedDbId) {
      logger.info(`🤖 AI selected database ${aiResponse.data.selectedDbId} for query`);
      return aiResponse.data.selectedDbId;
    }
    
    // Fall back to basic selection
    return detectDatabaseFromQuery(userId, query);
    
  } catch (error) {
    logger.error(`❌ Error selecting database for query: ${(error as Error).message}`);
    return detectDatabaseFromQuery(userId, query);
  }
}

/**
 * Gets recent database usage stats for a user
 */
async function getRecentDatabaseUsage(userId: number): Promise<{dbId: number, count: number}[]> {
  try {
    const client = await getMongoClient();
    const result = await client.db().collection('query_history').aggregate([
      { $match: { userId: userId.toString() } }, // Ensure userId is string
      { $group: { _id: "$dbId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();
    
    return result.map(r => ({ dbId: parseInt(r._id.toString()), count: r.count }));
  } catch (error) {
    logger.error(`❌ Error getting database usage history: ${(error as Error).message}`);
    return [];
  }
}

interface ContextSwitchResult {
  switched: boolean;
  dbId?: number;
  message?: string;
}

/**
 * Detects if user is requesting to switch database context
 */
export async function detectContextSwitch(userId: number, query: string): Promise<ContextSwitchResult> {
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
    const userDatabases = await fetchUserDatabases(userId);
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
      await setCurrentDatabaseContext(userId, matchedDb.id);
      
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
    logger.error(`❌ Error detecting context switch: ${(error as Error).message}`);
    return { switched: false, message: "Error processing database switch" };
  }
}

/**
 * Stores the current database context in Redis
 */
export async function setCurrentDatabaseContext(userId: number, dbId: number): Promise<void> {
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
    logger.error(`❌ Error setting database context: ${(error as Error).message}`);
  }
}

/**
 * Gets the current database context from Redis
 */
export async function getCurrentDatabaseContext(userId: number): Promise<number | null> {
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
    logger.error(`❌ Error getting current database context: ${(error as Error).message}`);
    return null;
  }
}
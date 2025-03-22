// New file: src/services/multiDbQuery.service.ts

import { fetchDatabaseById, runQueryOnUserDB } from "./userdb.service";
import type { UserDatabase } from "../models/userDatabase.model";
import logger from "../config/logger";
import axios from "axios";

interface MultiDbQueryResult {
  success: boolean;
  results?: Record<string, any>;
  error?: string;
}

export async function handleMultiDatabaseQuery(
  userId: number, 
  query: string,
  dbIds: number[]
): Promise<MultiDbQueryResult> {
  try {
    logger.info(`🔍 Processing multi-database query for user ${userId} across ${dbIds.length} databases`);
    
    if (dbIds.length === 0) {
      return { success: false, error: "No databases specified" };
    }
    
    // Fetch database connections
    const databases: UserDatabase[] = [];
    for (const dbId of dbIds) {
      const db = await fetchDatabaseById(userId, dbId);
      if (db) databases.push(db);
    }
    
    if (databases.length === 0) {
      return { success: false, error: "Could not access any of the specified databases" };
    }
    
    // Call the AI agent to decompose query per database
    const aiResponse = await axios.post("http://ai-agent-network:5001/run", {
      task: "multi_db_query",
      query,
      databases: databases.map(db => ({
        id: db.id,
        dbType: db.db_type,
        dbName: db.database_name
      }))
    });
    
    if (!aiResponse.data.success) {
      return { success: false, error: aiResponse.data.error || "Failed to analyze multi-database query" };
    }
    
    // Execute sub-queries
    const results: Record<string, any> = {};
    const subQueries = aiResponse.data.subQueries;
    
    for (const dbId in subQueries) {
      try {
        const db = databases.find(d => d.id === parseInt(dbId));
        if (!db) continue;
        
        const subQuery = subQueries[dbId];
        const result = await runQueryOnUserDB(db, subQuery);
        
        results[dbId] = {
          dbName: db.connection_name || db.database_name,
          dbType: db.db_type,
          data: result
        };
      } catch (dbError) {
        logger.error(`❌ Error executing subquery on database ${dbId}: ${(dbError as Error).message}`);
        results[dbId] = { error: (dbError as Error).message };
      }
    }
    
    // Return aggregated results
    return {
      success: true,
      results
    };
    
  } catch (error) {
    logger.error(`❌ Error executing multi-database query: ${(error as Error).message}`);
    return { success: false, error: (error as Error).message };
  }
}
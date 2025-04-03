// src/modules/analytics/services/index.service.ts

import { getMongoClient } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";

const indexLogger = createContextLogger("AnalyticsIndexes");

export class IndexService {
  /**
   * Create all required indexes for analytics collections
   */
  static async createAllIndexes(): Promise<boolean> {
    try {
      const client = await getMongoClient();
      
      // Usage metrics indexes
      await client.db().collection('usage_metrics').createIndex({ userId: 1 });
      await client.db().collection('usage_metrics').createIndex({ timestamp: 1 });
      await client.db().collection('usage_metrics').createIndex({ action: 1 });
      await client.db().collection('usage_metrics').createIndex({ 'details.dbId': 1 });
      await client.db().collection('usage_metrics').createIndex({ userId: 1, timestamp: 1 });
      await client.db().collection('usage_metrics').createIndex({ action: 1, timestamp: 1 });
      
      // Performance metrics indexes
      await client.db().collection('performance_metrics').createIndex({ userId: 1 });
      await client.db().collection('performance_metrics').createIndex({ timestamp: 1 });
      await client.db().collection('performance_metrics').createIndex({ dbId: 1 });
      await client.db().collection('performance_metrics').createIndex({ queryType: 1 });
      await client.db().collection('performance_metrics').createIndex({ success: 1 });
      await client.db().collection('performance_metrics').createIndex({ executionTimeMs: 1 });
      await client.db().collection('performance_metrics').createIndex({ userId: 1, timestamp: 1 });
      await client.db().collection('performance_metrics').createIndex({ dbId: 1, timestamp: 1 });
      
      // Security metrics indexes
      await client.db().collection('security_metrics').createIndex({ eventType: 1 });
      await client.db().collection('security_metrics').createIndex({ severity: 1 });
      await client.db().collection('security_metrics').createIndex({ timestamp: 1 });
      await client.db().collection('security_metrics').createIndex({ userId: 1 });
      await client.db().collection('security_metrics').createIndex({ sourceIp: 1 });
      await client.db().collection('security_metrics').createIndex({ resolved: 1 });
      await client.db().collection('security_metrics').createIndex({ resolved: 1, severity: 1 });
      
      // Query history indexes
      await client.db().collection('query_history').createIndex({ userId: 1 });
      await client.db().collection('query_history').createIndex({ timestamp: 1 });
      await client.db().collection('query_history').createIndex({ dbId: 1 });
      await client.db().collection('query_history').createIndex({ executionTimeMs: 1 });
      
      indexLogger.info("Successfully created all analytics indexes");
      return true;
    } catch (error) {
      indexLogger.error(`Error creating analytics indexes: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Check if indexes exist and create them if missing
   */
  static async ensureIndexes(): Promise<boolean> {
    try {
      const client = await getMongoClient();
      
      // Check if indexes exist on usage_metrics
      const usageIndexes = await client.db().collection('usage_metrics').indexes();
      const hasUserIdIndex = usageIndexes.some(idx => 
        idx.key && idx.key.userId === 1 && Object.keys(idx.key).length === 1);
      
      if (!hasUserIdIndex) {
        indexLogger.info("Missing indexes detected, creating all required indexes");
        return await this.createAllIndexes();
      }
      
      indexLogger.info("Required indexes already exist");
      return true;
    } catch (error) {
      indexLogger.error(`Error checking analytics indexes: ${(error as Error).message}`);
      return false;
    }
  }
}

export default IndexService;
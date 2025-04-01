// src/modules/database/services/clients/dynamodbClient.ts
import { IDatabaseClient, handleDatabaseError, HealthCheckResult } from "./interfaces";
import { UserDatabase } from "../../models/connection.model";
import {
  DynamoDBClient,
  ScanCommand,
  ListTablesCommand,
  DescribeTableCommand,
  QueryCommand,
  GetItemCommand,
  AttributeDefinition,
  AttributeValue
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import logger from "../../../../config/logger";
import { connectWithRetry } from "../../../../shared/utils/connectionHelpers";
import { connectionCache, getConnectionKey } from "./adapter";

function getConfig(db: UserDatabase) {
  if (!db.username || !db.encrypted_password) {
    throw new Error("❌ Missing DynamoDB credentials (Access Key ID and Secret Access Key).");
  }

  // Default to us-east-1 if region not specified
  const region = db.host || "us-east-1";
  
  return {
    region,
    credentials: {
      accessKeyId: db.username,
      secretAccessKey: db.encrypted_password,
    },
    // Add timeouts for better error handling
    maxAttempts: 3,
    timeout: 10000 // 10 seconds
  };
}

export const dynamodbClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);
    
    if (!connectionCache[key]) {
      try {
        const client = await connectWithRetry(
          async () => {
            const dynamoClient = new DynamoDBClient(getConfig(db));
            // Verify connection with a simple operation
            await dynamoClient.send(new ListTablesCommand({}));
            return dynamoClient;
          },
          `DynamoDB (${db.connection_name || db.username})`
        );
        
        connectionCache[key] = client;
      } catch (error: unknown) {
        const dbError = handleDatabaseError('connect', error, 'DynamoDB');
        logger.error(`❌ Error connecting to DynamoDB: ${dbError.message}`);
        throw dbError;
      }
    }
    
    return connectionCache[key];
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const client = await this.connect(db);
    
    try {
      const result = await client.send(new ListTablesCommand({}));
      const tableNames = result.TableNames || [];
      return tableNames;
    } catch (error: unknown) {
      const dbError = handleDatabaseError('fetchTables', error, 'DynamoDB');
      logger.error(`❌ Error fetching DynamoDB tables: ${dbError.message}`);
      throw dbError;
    }
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const client = await this.connect(db);
    
    try {
      // Sanitize table name to prevent injection
      const sanitizedTable = this.sanitizeInput(table);
      
      const result = await client.send(new DescribeTableCommand({ TableName: sanitizedTable }));
      
      if (!result.Table || !result.Table.AttributeDefinitions) {
        return [];
      }
      
      const attributes = result.Table.AttributeDefinitions;
      
      return attributes.map((attr: AttributeDefinition) => ({
        name: attr.AttributeName || 'unknown',
        type: attr.AttributeType || 'unknown'
      }));
    } catch (error: unknown) {
      const dbError = handleDatabaseError('fetchSchema', error, 'DynamoDB');
      logger.error(`❌ Error fetching schema for DynamoDB table ${table}: ${dbError.message}`);
      throw dbError;
    }
  },

  async runQuery(db: UserDatabase, query: any): Promise<any> {
    const client = await this.connect(db);
    
    try {
      // Check if query is valid
      if (!query) {
        throw new Error("Invalid query: Query cannot be empty");
      }
      
      // Validate required fields
      if (query.operation === "query" && query.params && !query.params.KeyConditionExpression) {
        throw new Error("Invalid query: KeyConditionExpression is required for query operation");
      }
      
      // Support different query types
      if (query.operation === "scan") {
        const params = {
          TableName: this.sanitizeInput(query.table),
          Limit: query.limit || 50,
          ...query.params
        };
        
        const result = await client.send(new ScanCommand(params));
        
        if (!result.Items) {
          return [];
        }
        
        return result.Items.map((item: Record<string, AttributeValue>) => unmarshall(item));
      } 
      else if (query.operation === "query") {
        const result = await client.send(new QueryCommand({
          TableName: this.sanitizeInput(query.table),
          ...query.params
        }));
        
        if (!result.Items) {
          return [];
        }
        
        return result.Items.map((item: Record<string, AttributeValue>) => unmarshall(item));
      }
      else if (query.operation === "getItem") {
        const result = await client.send(new GetItemCommand({
          TableName: this.sanitizeInput(query.table),
          Key: query.key
        }));
        
        return result.Item ? unmarshall(result.Item) : null;
      }
      else {
        // Default to scan
        const tableName = this.sanitizeInput(query.table || query.tableName);
        
        if (!tableName) {
          throw new Error("Invalid query: TableName is required");
        }
        
        const result = await client.send(new ScanCommand({ TableName: tableName }));
        
        if (!result.Items) {
          return [];
        }
        
        return result.Items.map((item: Record<string, AttributeValue>) => unmarshall(item));
      }
    } catch (error: unknown) {
      const dbError = handleDatabaseError('query', error, 'DynamoDB', JSON.stringify(query));
      logger.error(`❌ Error executing DynamoDB query: ${dbError.message}`);
      throw dbError;
    }
  },
  
  async disconnect(db: UserDatabase): Promise<void> {
    const key = getConnectionKey(db);
    
    if (connectionCache[key]) {
      // DynamoDB client doesn't have an explicit close method
      // But we can destroy the client instance
      delete connectionCache[key];
      logger.info(`✅ DynamoDB client removed for ${db.connection_name || db.username}`);
    }
  },

  async testConnection(db: UserDatabase): Promise<boolean> {
    try {
      const client = new DynamoDBClient(getConfig(db));
      await client.send(new ListTablesCommand({}));
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`DynamoDB connection test failed: ${errorMessage}`);
      return false;
    }
  },

  async checkHealth(db: UserDatabase): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const client = new DynamoDBClient(getConfig(db));
      
      // Test basic connectivity by listing tables
      const result = await client.send(new ListTablesCommand({
        Limit: 1 // Only need one table to confirm connection works
      }));
      
      const tableCount = result.TableNames ? result.TableNames.length : 0;
      
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      
      return {
        isHealthy: true,
        latencyMs,
        message: `Connection healthy. Tables available: ${tableCount}`,
        timestamp: new Date()
      };
    } catch (error: unknown) {
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        isHealthy: false,
        latencyMs,
        message: `Health check failed: ${errorMessage}`,
        timestamp: new Date()
      };
    }
  },

  // Utility function to sanitize inputs
  sanitizeInput(input: string): string {
    if (!input) return '';
    
    // Remove potentially dangerous characters
    // Note: DynamoDB has strict naming rules so this is less complex than SQL
    return input
      .replace(/[^\w.-]/g, '') // Only allow alphanumeric, underscore, period, and hyphen
      .trim();
  }
};
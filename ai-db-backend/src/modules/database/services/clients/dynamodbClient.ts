// src/services/userdbClients/dynamodbClient.ts
import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../../../models/userDatabase.model";
import {
  DynamoDBClient,
  ScanCommand,
  ListTablesCommand,
  DescribeTableCommand,
  QueryCommand,
  GetItemCommand
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
  };
}

export const dynamodbClient: IDatabaseClient = {
  async connect(db: UserDatabase) {
    const key = getConnectionKey(db);
    
    if (!connectionCache[key]) {
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
    }
    
    return connectionCache[key];
  },

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const client = await this.connect(db);
    
    try {
      const result = await client.send(new ListTablesCommand({}));
      return result.TableNames || [];
    } catch (error) {
      logger.error(`❌ Error fetching DynamoDB tables: ${(error as Error).message}`);
      throw new Error(`Failed to fetch tables: ${(error as Error).message}`);
    }
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const client = await this.connect(db);
    
    try {
      const result = await client.send(new DescribeTableCommand({ TableName: table }));
      const attributes = result.Table?.AttributeDefinitions || [];
      
      return attributes.map((attr: { AttributeName: any; AttributeType: any; }) => ({
        name: attr.AttributeName,
        type: attr.AttributeType
      }));
    } catch (error) {
      logger.error(`❌ Error fetching schema for table ${table}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch schema: ${(error as Error).message}`);
    }
  },

  async runQuery(db: UserDatabase, query: any): Promise<any> {
    const client = await this.connect(db);
    
    try {
      // Support different query types
      if (query.operation === "scan") {
        const params = {
          TableName: query.table,
          Limit: query.limit || 50,
          ...query.params
        };
        
        const result = await client.send(new ScanCommand(params));
        return (result.Items || []).map((item: any) => unmarshall(item));
      } 
      else if (query.operation === "query") {
        const result = await client.send(new QueryCommand({
          TableName: query.table,
          ...query.params
        }));
        
        return (result.Items || []).map((item: any) => unmarshall(item));
      }
      else if (query.operation === "getItem") {
        const result = await client.send(new GetItemCommand({
          TableName: query.table,
          Key: query.key
        }));
        
        return result.Item ? unmarshall(result.Item) : null;
      }
      else {
        // Default to scan
        const result = await client.send(new ScanCommand({ 
          TableName: query.table || query.tableName 
        }));
        
        return (result.Items || []).map((item: any) => unmarshall(item));
      }
    } catch (error) {
      logger.error(`❌ Error executing DynamoDB query: ${(error as Error).message}`);
      throw new Error(`Query execution failed: ${(error as Error).message}`);
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
  }
};
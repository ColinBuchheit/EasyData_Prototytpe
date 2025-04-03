// src/shared/utils/connectionTester.ts
import { createContextLogger } from "../../config/logger";
import { getMongoClient } from "../../config/db";
import { getRedisClient } from "../../config/redis";
import axios from "axios";

const testLogger = createContextLogger("ConnectionTester");

export interface ConnectionTestResult {
  service: string;
  connected: boolean;
  error?: string;
  details?: any;
}

/**
 * Test all required service connections
 */
export async function testAllConnections(): Promise<ConnectionTestResult[]> {
  testLogger.info("🔍 Testing all service connections...");
  
  const results = await Promise.allSettled([
    testMongoConnection(),
    testRedisConnection(),
    testAIAgentConnection()
  ]);
  
  const connectionResults: ConnectionTestResult[] = [];
  
  // Process results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      connectionResults.push(result.value);
    } else {
      // Handle rejected promises
      let serviceName = "Unknown";
      if (index === 0) serviceName = "MongoDB";
      else if (index === 1) serviceName = "Redis";
      else if (index === 2) serviceName = "AI Agent Network";
      
      connectionResults.push({
        service: serviceName,
        connected: false,
        error: result.reason?.message || "Unknown error"
      });
    }
  });
  
  return connectionResults;
}

/**
 * Test MongoDB connection
 */
async function testMongoConnection(): Promise<ConnectionTestResult> {
  try {
    testLogger.info("Testing MongoDB connection...");
    const client = await getMongoClient();
    const adminDb = client.db().admin();
    
    // Run a simple command to verify connection
    const result = await adminDb.ping();
    
    if (result && result.ok === 1) {
      // Get server info for details
      const serverInfo = await adminDb.serverInfo();
      testLogger.info(`✅ Successfully connected to MongoDB. Version: ${serverInfo.version}`);
      
      return {
        service: "MongoDB",
        connected: true,
        details: {
          version: serverInfo.version,
          uri: process.env.MONGO_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//******:******@') || 'mongodb://localhost:27017/easydatabase'
        }
      };
    } else {
      throw new Error("MongoDB ping returned unexpected result");
    }
  } catch (error) {
    testLogger.error(`❌ MongoDB connection test failed: ${(error as Error).message}`);
    return {
      service: "MongoDB",
      connected: false,
      error: (error as Error).message
    };
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection(): Promise<ConnectionTestResult> {
  try {
    testLogger.info("Testing Redis connection...");
    const client = await getRedisClient();
    
    // Test connection with PING command
    const pingResult = await client.ping();
    
    if (pingResult === 'PONG') {
      testLogger.info(`✅ Successfully connected to Redis`);
      
      return {
        service: "Redis",
        connected: true,
        details: {
          url: process.env.REDIS_URL?.replace(/:\/\/([^:]+):([^@]+)@/, '://******:******@') || 'redis://localhost:6379'
        }
      };
    } else {
      throw new Error("Redis ping returned unexpected result");
    }
  } catch (error) {
    testLogger.error(`❌ Redis connection test failed: ${(error as Error).message}`);
    return {
      service: "Redis",
      connected: false,
      error: (error as Error).message
    };
  }
}

/**
 * Test AI Agent Network connection
 */
async function testAIAgentConnection(): Promise<ConnectionTestResult> {
  try {
    const AI_AGENT_URL = process.env.AI_AGENT_API || 'http://localhost:5001';
    const AI_API_KEY = process.env.AI_API_KEY || '';
    
    testLogger.info(`Testing AI Agent Network connection to ${AI_AGENT_URL}...`);
    
    const response = await axios.get(`${AI_AGENT_URL}/api/v1/health`, {
      timeout: 5000,
      headers: { 'Authorization': `Bearer ${AI_API_KEY}` }
    });
    
    if (response.data.status === 'ok') {
      testLogger.info(`✅ Successfully connected to AI Agent Network`);
      
      return {
        service: "AI Agent Network",
        connected: true,
        details: {
          url: AI_AGENT_URL,
          version: response.data.version || 'unknown'
        }
      };
    } else {
      throw new Error(`AI Agent returned non-ok status: ${response.data.message || 'Unknown status'}`);
    }
  } catch (error) {
    testLogger.error(`❌ AI Agent Network connection test failed: ${(error as Error).message}`);
    return {
      service: "AI Agent Network",
      connected: false,
      error: (error as Error).message
    };
  }
}
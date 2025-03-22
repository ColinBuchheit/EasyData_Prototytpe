import { ObjectId } from "mongodb";
import { getMongoClient } from "../config/db"; // Uses the integrated db.ts file

const COLLECTION = "conversations";

/**
 * ✅ Save a new conversation
 */
export async function saveConversation(
  userId: string,
  agentName: string,
  message: string,
  response: string | null,
  agentLogs: any[] = [],
  context: Record<string, any> = {}
) {
  const client = await getMongoClient();
  const db = client.db();

  const result = await db.collection(COLLECTION).insertOne({
    userId,
    agentName,
    message,
    response,
    agentLogs,
    context,
    status: "active",
    timestamp: new Date()
  });

  return { _id: result.insertedId };
}

/**
 * ✅ Get all conversations for a user
 */
export async function fetchUserConversations(userId: string, limit = 10, skip = 0) {
  const client = await getMongoClient();
  const db = client.db();

  return db.collection(COLLECTION)
    .find({ userId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

/**
 * ✅ Get a specific conversation by ID
 */
export async function fetchConversationById(conversationId: string, userId: string) {
  const client = await getMongoClient();
  const db = client.db();

  return db.collection(COLLECTION).findOne({
    _id: new ObjectId(conversationId),
    userId
  });
}

/**
 * ✅ Delete a conversation by ID
 */
export async function removeConversation(conversationId: string, userId: string) {
  const client = await getMongoClient();
  const db = client.db();

  const result = await db.collection(COLLECTION).deleteOne({
    _id: new ObjectId(conversationId),
    userId
  });

  return result.deletedCount === 1;
}

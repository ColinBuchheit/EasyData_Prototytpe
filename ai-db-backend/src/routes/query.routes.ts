import express, { Router, Request, Response } from "express"; // Make sure we have the correct Response type
import expressWs from "express-ws";
import { 
  executeUserQuery, 
  executeUserDBQuery, 
  handleWebSocketAIQuery, 
  processAIOrchestration,
  processAIQueryWithContext  // New function
} from "../controllers/query.controller";
import { verifyToken, AuthRequest } from "../middleware/auth"; // Import AuthRequest
import { WebSocket } from "ws";
import { handleMultiDatabaseQuery } from "../services/multiDbQuery.service"; // Import the service

const router = Router();
const wsInstance = expressWs(express());
wsInstance.applyTo(router);

/**
 * ✅ REST API Route for AppDB Queries
 */
router.post("/execute", verifyToken, executeUserQuery);

/**
 * ✅ REST API Route for UserDB Queries
 */
router.post("/userdb/query", verifyToken, executeUserDBQuery);

/**
 * ✅ WebSocket Route for AI-Generated Queries
 */
router.ws("/ai-query", (ws: WebSocket, req: Request) => {
  handleWebSocketAIQuery(ws, req);
});

router.post("/agent/process", verifyToken, processAIOrchestration);

router.post("/smart-query", verifyToken, processAIQueryWithContext);

// Multi-database query endpoint
router.post("/multi-query", verifyToken, (req: AuthRequest, res: Response) => {
  const userId = req.user.id;
  const { task, dbIds } = req.body;
  
  if (!task || !dbIds || !Array.isArray(dbIds)) {
    res.status(400).json({ success: false, message: "Missing task or dbIds array" });
    return;
  }
  
  handleMultiDatabaseQuery(userId, task, dbIds)
    .then(result => res.json(result))
    .catch(error => res.status(500).json({ 
      success: false, 
      message: "Failed to process multi-database query", 
      error: error.message 
    }));
});


export default router;

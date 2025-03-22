import express, { Router, Request } from "express";
import expressWs from "express-ws";
import { executeUserQuery, executeUserDBQuery, handleWebSocketAIQuery, processAIOrchestration } from "../controllers/query.controller";
import { verifyToken } from "../middleware/auth";
import { WebSocket } from "ws";


// ✅ Apply `express-ws` to `router`, not `app`
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


export default router;

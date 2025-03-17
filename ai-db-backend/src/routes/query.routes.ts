import express, { Router, Request } from "express";
import expressWs from "express-ws";
import { executeUserQuery, handleWebSocketAIQuery } from "../controllers/query.controller";
import { verifyToken } from "../middleware/auth";
import { WebSocket } from "ws";

// ✅ Apply `express-ws` to `router`, not `app`
const router = Router();
const wsInstance = expressWs(express());
wsInstance.applyTo(router); // ✅ Fix: Enables WebSockets on router

/**
 * ✅ REST API Route for User-Submitted Queries
 */
router.post("/execute", verifyToken, executeUserQuery);

/**
 * ✅ WebSocket Route for AI-Generated Queries
 */
router.ws("/ai-query", (ws: WebSocket, req: Request) => {
  handleWebSocketAIQuery(ws, req);
});


export default router;

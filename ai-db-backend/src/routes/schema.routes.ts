import { Router } from "express";
import { verifyToken } from "../middleware/auth";
import { getAllTables, getTableSchema, validateQuerySchema } from "../controllers/schema.controller";

const router = Router();

// ✅ Fetch all tables from the connected database
router.get("/tables", verifyToken, getAllTables);

// ✅ Fetch schema details for a specific table
router.get("/schema/:table", verifyToken, getTableSchema);

// ✅ Validate a query against the database schema
router.post("/validate-query", verifyToken, validateQuerySchema);

export default router;

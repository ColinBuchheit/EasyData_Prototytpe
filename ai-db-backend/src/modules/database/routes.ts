// src/modules/database/routes.ts

import { Router } from "express";
import { verifyTokenMiddleware } from "../auth/middleware/verification.middleware";
import { requireRole } from "../auth/middleware/rbac.middleware";

// Core database controllers
import {
  connectDB,
  checkDBHealth,
  disconnectDB,
  listTables,
  getTableSchema,
  executeQuery
} from "./controllers/core.controller";

// Connection controllers
import {
  createConnection,
  getUserConnections,
  getConnectionById,
  updateConnection,
  deleteConnection,
  testConnection,
  executeConnectionQuery
} from "./controllers/connections.controller";

// Schema controllers
import {
  getAllTables,
  getTableSchema as getSchemaByTable,
  validateQuerySchema,
  getDatabaseMetadata,
  refreshDatabaseMetadata
} from "./controllers/schema.controller";

const router = Router();

// ==============================
// Core Database Routes (AppDB)
// ==============================
router.post("/core/connect", verifyTokenMiddleware, requireRole(["admin"]), connectDB);
router.post("/core/disconnect", verifyTokenMiddleware, requireRole(["admin"]), disconnectDB);
router.get("/core/health", verifyTokenMiddleware, checkDBHealth);
router.get("/core/tables", verifyTokenMiddleware, requireRole(["admin"]), listTables);
router.get("/core/schema/:table", verifyTokenMiddleware, requireRole(["admin"]), getTableSchema);
router.post("/core/query", verifyTokenMiddleware, executeQuery);

// ==============================
// User Database Connection Routes
// ==============================
router.post("/connections", verifyTokenMiddleware, createConnection);
router.get("/connections", verifyTokenMiddleware, getUserConnections);
router.get("/connections/:id", verifyTokenMiddleware, getConnectionById);
router.put("/connections/:id", verifyTokenMiddleware, updateConnection);
router.delete("/connections/:id", verifyTokenMiddleware, deleteConnection);
router.post("/connections/test", verifyTokenMiddleware, testConnection);
router.post("/connections/query", verifyTokenMiddleware, executeConnectionQuery);

// ==============================
// Schema Routes
// ==============================
router.get("/schema/tables", verifyTokenMiddleware, getAllTables);
router.get("/schema/:table", verifyTokenMiddleware, getSchemaByTable);
router.post("/schema/validate", verifyTokenMiddleware, validateQuerySchema);
router.get("/schema/metadata/:id", verifyTokenMiddleware, getDatabaseMetadata);
router.post("/schema/metadata/:id/refresh", verifyTokenMiddleware, refreshDatabaseMetadata);

export default router;
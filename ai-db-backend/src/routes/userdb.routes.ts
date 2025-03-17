import { Router } from "express";
import { verifyToken } from "../middleware/auth";
import {
  createUserDatabase,
  getUserDatabases,
  getUserDatabaseById,
  updateUserDatabase,
  deleteUserDatabase
} from "../controllers/userdb.controller";

const router = Router();

/**
 * ✅ Create a new database connection.
 */
router.post("/", verifyToken, createUserDatabase);

/**
 * ✅ Get all databases owned by the user.
 */
router.get("/", verifyToken, getUserDatabases);

/**
 * ✅ Get details of a specific database connection.
 */
router.get("/:id", verifyToken, getUserDatabaseById);

/**
 * ✅ Update a database connection's details.
 */
router.put("/:id", verifyToken, updateUserDatabase);

/**
 * ✅ Delete a database connection.
 */
router.delete("/:id", verifyToken, deleteUserDatabase);

export default router;

import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth";
import {
  getAllUsers,
  getUserProfile,
  getUserByIdController,
  updateUser,
  updateUserPassword,
  deleteUser
} from "../controllers/user.controller";

const router = Router();

/**
 * ✅ Fetch all users (Admin-only, paginated)
 */
router.get("/", verifyToken, requireRole(["admin"]), getAllUsers);

/**
 * ✅ Fetch logged-in user's profile
 */
router.get("/profile", verifyToken, getUserProfile);

/**
 * ✅ Fetch a specific user's details (Admin or Self)
 */
router.get("/:id", verifyToken, getUserByIdController);

/**
 * ✅ Update user details (Self or Admin)
 */
router.put("/:id", verifyToken, updateUser);

/**
 * ✅ Change password for logged-in user
 */
router.post("/change-password", verifyToken, updateUserPassword);

/**
 * ✅ Delete a user (Admin only)
 */
router.delete("/:id", verifyToken, requireRole(["admin"]), deleteUser);

export default router;

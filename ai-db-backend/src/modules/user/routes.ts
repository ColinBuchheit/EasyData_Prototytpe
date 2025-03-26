// src/modules/user/routes.ts

import { Router } from "express";
import { verifyTokenMiddleware } from "../auth/middleware/verification.middleware";
import { requireRole } from "../auth/middleware/rbac.middleware";

// Import controllers
import {
  getUserProfile,
  getOtherUserProfile,
  updateUserProfile
} from "./controllers/profile.controller";

import {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences
} from "./controllers/preference.controller";

import {
  listUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  changeUserStatus,
  changeUserRole
} from "./controllers/admin.controller";

const router = Router();

// ==============================
// Profile Routes
// ==============================
router.get("/profile", verifyTokenMiddleware, getUserProfile);
router.get("/profile/:userId", verifyTokenMiddleware, getOtherUserProfile);
router.put("/profile", verifyTokenMiddleware, updateUserProfile);

// ==============================
// Preferences Routes
// ==============================
router.get("/preferences", verifyTokenMiddleware, getUserPreferences);
router.put("/preferences", verifyTokenMiddleware, updateUserPreferences);
router.post("/preferences/reset", verifyTokenMiddleware, resetUserPreferences);

// ==============================
// Admin User Management Routes
// ==============================
router.get("/admin/users", verifyTokenMiddleware, requireRole(["admin"]), listUsers);
router.get("/admin/users/:userId", verifyTokenMiddleware, requireRole(["admin"]), getUserDetails);
router.post("/admin/users", verifyTokenMiddleware, requireRole(["admin"]), createUser);
router.put("/admin/users/:userId", verifyTokenMiddleware, requireRole(["admin"]), updateUser);
router.delete("/admin/users/:userId", verifyTokenMiddleware, requireRole(["admin"]), deleteUser);
router.put("/admin/users/:userId/status", verifyTokenMiddleware, requireRole(["admin"]), changeUserStatus);
router.put("/admin/users/:userId/role", verifyTokenMiddleware, requireRole(["admin"]), changeUserRole);

export default router;
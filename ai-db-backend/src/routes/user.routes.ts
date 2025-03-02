import { Router } from "express";
import { getAllUsers, getUserById, updateUser, deleteUser } from "../controllers/users.controller";
import { verifyToken, AuthRequest } from "../middleware/auth"; // ✅ Use `AuthRequest`
import { authorizeRoles } from "../middleware/rbac";
import rateLimit from "express-rate-limit";
import logger from "../config/logger";

const router = Router();

// ✅ Rate limiter for fetching user data to prevent API abuse
const userLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { error: "Too many requests, please try again later." }
});

// ✅ Apply authentication to all user routes
router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

// ✅ GET all users (Admin-only)
router.get("/", authorizeRoles(["admin"]), userLimiter, async (req: AuthRequest, res) => { // ✅ Use `AuthRequest`
  logger.info(`✅ Admin ${req.user.id} accessed all users.`);
  await getAllUsers(req, res);
});

// ✅ GET specific user (Admins or self)
router.get("/:id", authorizeRoles(["admin", "user"]), userLimiter, async (req: AuthRequest, res) => { // ✅ Use `AuthRequest`
  const userId = req.params.id;

  // ✅ Users can only access their own data unless they are admin
  if (req.user.role !== "admin" && req.user.id !== Number(userId)) {
    logger.warn(`🚫 Unauthorized access attempt by User ${req.user.id} to User ${userId}`);
    res.status(403).json({ error: "You are not allowed to view this profile." });
    return;
  }

  logger.info(`✅ User ${req.user.id} accessed profile of User ${userId}`);
  await getUserById(req, res);
});

// ✅ UPDATE user profile (Self or Admin)
router.put("/:id", async (req: AuthRequest, res) => { // ✅ Use `AuthRequest`
  const userId = req.params.id;
  const { username, role } = req.body;

  // ✅ Validate input fields
  if (username && typeof username !== "string") {
    res.status(400).json({ error: "Invalid username format." });
    return;
  }

  if (role && !["user", "admin", "read-only"].includes(role)) {
    res.status(400).json({ error: "Invalid role. Allowed roles: user, admin, read-only." });
    return;
  }

  // ✅ Users can only update their own profile unless they are admin
  if (req.user.role !== "admin" && req.user.id !== Number(userId)) {
    res.status(403).json({ error: "You can only update your own profile." });
    return;
  }

  logger.info(`✅ User ${req.user.id} updated profile of User ${userId}`);
  await updateUser(req, res);
});

// ✅ DELETE user (Admin-only)
router.delete("/:id", authorizeRoles(["admin"]), async (req: AuthRequest, res) => { // ✅ Use `AuthRequest`
  logger.info(`⚠️ Admin ${req.user.id} deleted User ${req.params.id}`);
  await deleteUser(req, res);
});

export default router;

import { Router, Request, Response } from "express";
import { getAllUsers, getUserById, updateUser, deleteUser } from "../controllers/users.controller";
import { verifyToken, AuthRequest } from "../middleware/auth";
import { authorizeRoles } from "../middleware/rbac";

const router = Router();

// ✅ Apply authentication to all user routes
router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

// ✅ Fix: Explicit return type for async functions (`Promise<void>`)
router.get("/", authorizeRoles(["admin"]), async (req: Request, res: Response): Promise<void> => {
  await getAllUsers(req, res);
});

// ✅ Fix: Use `AuthRequest` to ensure `req.user` exists
router.get("/:id", authorizeRoles(["admin", "user"]), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.params.id;

  // ✅ Users can only access their own data unless they are admin
  if (req.user.role !== "admin" && req.user.id !== Number(userId)) {
    res.status(403).json({ error: "You are not allowed to view this profile." });
    return;
  }

  await getUserById(req, res);
});

// ✅ Fix: Ensure function returns `Promise<void>`
router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.params.id;
  const { username, role } = req.body;

  // ✅ Validate input fields
  if (username && typeof username !== "string") {
    res.status(400).json({ error: "Invalid username format." });
    return;
  }
  if (role && !["user", "admin"].includes(role)) {
    res.status(400).json({ error: "Invalid role." });
    return;
  }

  // ✅ Users can only update their own profile unless they are admin
  if (req.user.role !== "admin" && req.user.id !== Number(userId)) {
    res.status(403).json({ error: "You can only update your own profile." });
    return;
  }

  await updateUser(req, res);
});

// ✅ Fix: Ensure only admins can delete users
router.delete("/:id", authorizeRoles(["admin"]), async (req: Request, res: Response): Promise<void> => {
  await deleteUser(req, res);
});

export default router;

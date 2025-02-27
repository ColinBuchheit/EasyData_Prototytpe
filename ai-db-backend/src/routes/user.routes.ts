// src/routes/users.routes.ts
import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/users.controller';
import { verifyToken } from '../middleware/auth';
import { authorizeRoles } from '../middleware/rbac';

const router = Router();

// All user routes require a valid JWT token.
router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Retrieve all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                     example: 1
 *                   username:
 *                     type: string
 *                     example: "adminuser"
 *                   role:
 *                     type: string
 *                     example: "admin"
 *       500:
 *         description: Server error.
 */
router.get('/', authorizeRoles(['admin']), getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Retrieve a specific user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user ID.
 *     responses:
 *       200:
 *         description: User data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                   example: 1
 *                 username:
 *                   type: string
 *                   example: "adminuser"
 *                 role:
 *                   type: string
 *                   example: "admin"
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */
router.get('/:id', authorizeRoles(['admin', 'user']), getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user's information (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user to update.
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Data to update for the user.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "newusername"
 *               role:
 *                 type: string
 *                 example: "user"
 *     responses:
 *       200:
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                   example: 1
 *                 username:
 *                   type: string
 *                   example: "newusername"
 *                 role:
 *                   type: string
 *                   example: "user"
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */
router.put('/:id', authorizeRoles(['admin']), updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deleted"
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */
router.delete('/:id', authorizeRoles(['admin']), deleteUser);

export default router;

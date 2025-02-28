import { Router } from 'express';
import { addUserDatabase, getUserDatabases, deleteUserDatabase } from '../controllers/userdb.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: UserDatabases
 *   description: API for managing user database connections securely
 */

/**
 * @swagger
 * /api/databases:
 *   post:
 *     summary: Store a new database connection securely
 *     tags: [UserDatabases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               db_type:
 *                 type: string
 *                 example: "postgres"
 *               host:
 *                 type: string
 *                 example: "localhost"
 *               port:
 *                 type: number
 *                 example: 5432
 *               username:
 *                 type: string
 *                 example: "myuser"
 *               password:
 *                 type: string
 *                 example: "mypassword"
 *               database_name:
 *                 type: string
 *                 example: "easydatabase"
 *     responses:
 *       201:
 *         description: Database connection saved successfully.
 */
router.post('/databases', verifyToken, addUserDatabase);
router.get('/databases/:user_id', verifyToken, getUserDatabases);
router.delete('/databases/:id', verifyToken, deleteUserDatabase);

export default router;

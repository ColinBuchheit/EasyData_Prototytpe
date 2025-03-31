// src/modules/user/services/user.service.ts

import { pool } from "../../../config/db";
import { createContextLogger } from "../../../config/logger";
import { AuthService } from "../../auth/services/auth.service";
import { User, UserCreationData, UserListOptions, UserRole, UserStatus, UserUpdateData, UserWithAuth } from "../model/user.model";
import { hashPassword, comparePassword } from "../../auth/services/password.service";


const userLogger = createContextLogger("UserService");

export class UserService {
  /**
   * Get user by ID
   */
  static async getUserById(userId: number): Promise<User | null> {
    try {
      const result = await pool.query(
        `SELECT id, username, email, role, status, created_at as "createdAt", 
         updated_at as "updatedAt", last_login_at as "lastLoginAt"
         FROM users WHERE id = $1`,
        [userId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      userLogger.error(`Error fetching user ${userId}: ${(error as Error).message}`);
      throw new Error(`Failed to fetch user: ${(error as Error).message}`);
    }
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<UserWithAuth | null> {
    try {
      const result = await pool.query(
        `SELECT id, username, email, password_hash, role, status, created_at as "createdAt", 
         updated_at as "updatedAt", last_login_at as "lastLoginAt"
         FROM users WHERE username = $1`,
        [username]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      userLogger.error(`Error fetching user by username: ${(error as Error).message}`);
      throw new Error(`Failed to fetch user: ${(error as Error).message}`);
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<UserWithAuth | null> {
    try {
      const result = await pool.query(
        `SELECT id, username, email, password_hash, role, status, created_at as "createdAt", 
         updated_at as "updatedAt", last_login_at as "lastLoginAt"
         FROM users WHERE email = $1`,
        [email]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      userLogger.error(`Error fetching user by email: ${(error as Error).message}`);
      throw new Error(`Failed to fetch user: ${(error as Error).message}`);
    }
  }

  /**
   * List users with pagination and filtering
   */
  static async listUsers(options: UserListOptions = {}): Promise<{ users: User[]; total: number }> {
    try {
      const {
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortDirection = 'desc',
        status,
        role,
        search
      } = options;
      
      // Build WHERE clause
      const whereConditions = [];
      const queryParams: any[] = [];
      
      if (status) {
        queryParams.push(status);
        whereConditions.push(`status = $${queryParams.length}`);
      }
      
      if (role) {
        queryParams.push(role);
        whereConditions.push(`role = $${queryParams.length}`);
      }
      
      if (search) {
        queryParams.push(`%${search}%`);
        whereConditions.push(`(username ILIKE $${queryParams.length} OR email ILIKE $${queryParams.length})`);
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';
      
      // Sort column mapping
      const sortColumnMap: Record<string, string> = {
        id: 'id',
        username: 'username',
        email: 'email',
        role: 'role',
        status: 'status',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        lastLoginAt: 'last_login_at'
      };
      
      // Validate sort column
      const sortColumn = sortColumnMap[sortBy] || 'created_at';
      const direction = sortDirection === 'asc' ? 'ASC' : 'DESC';
      
      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users
        ${whereClause}
      `;
      
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total, 10);
      
      // Get paginated results
      queryParams.push(limit, offset);
      const query = `
        SELECT id, username, email, role, status, 
               created_at as "createdAt", updated_at as "updatedAt", last_login_at as "lastLoginAt"
        FROM users
        ${whereClause}
        ORDER BY ${sortColumn} ${direction}
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `;
      
      const result = await pool.query(query, queryParams);
      
      return {
        users: result.rows,
        total
      };
    } catch (error) {
      userLogger.error(`Error listing users: ${(error as Error).message}`);
      throw new Error(`Failed to list users: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new user
   */
  static async createUser(userData: UserCreationData): Promise<User> {
    try {
      // Check if username or email already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [userData.username, userData.email]
      );
      
      if (existingUser.rows.length > 0) {
        throw new Error('Username or email already exists');
      }
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Set default role if not provided
      const role = userData.role || 'user';
      
      // Insert new user
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, username, email, role, status, created_at as "createdAt", updated_at as "updatedAt"`,
        [userData.username, userData.email, hashedPassword, role, 'active']
      );
      
      userLogger.info(`Created new user: ${userData.username} (${userData.email})`);
      return result.rows[0];
    } catch (error) {
      userLogger.error(`Error creating user: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Update user
   */
  static async updateUser(userId: number, userData: UserUpdateData): Promise<User> {
    try {
      // Check if user exists
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Build SET clause
      const setValues = [];
      const queryParams: any[] = [];
      
      if (userData.username !== undefined) {
        // Check if username is already taken
        if (userData.username !== existingUser.username) {
          const usernameCheck = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND id != $2',
            [userData.username, userId]
          );
          
          if (usernameCheck.rows.length > 0) {
            throw new Error('Username already exists');
          }
        }
        
        queryParams.push(userData.username);
        setValues.push(`username = $${queryParams.length}`);
      }
      
      if (userData.email !== undefined) {
        // Check if email is already taken
        if (userData.email !== existingUser.email) {
          const emailCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [userData.email, userId]
          );
          
          if (emailCheck.rows.length > 0) {
            throw new Error('Email already exists');
          }
        }
        
        queryParams.push(userData.email);
        setValues.push(`email = $${queryParams.length}`);
      }
      
      if (userData.role !== undefined) {
        queryParams.push(userData.role);
        setValues.push(`role = $${queryParams.length}`);
      }
      
      if (userData.status !== undefined) {
        queryParams.push(userData.status);
        setValues.push(`status = $${queryParams.length}`);
      }
      
      // Add updated_at
      setValues.push(`updated_at = NOW()`);
      
      // If nothing to update, return existing user
      if (setValues.length === 1) {
        return existingUser;
      }
      
      // Add user ID parameter
      queryParams.push(userId);
      
      const query = `
        UPDATE users
        SET ${setValues.join(', ')}
        WHERE id = $${queryParams.length}
        RETURNING id, username, email, role, status, 
                  created_at as "createdAt", updated_at as "updatedAt", last_login_at as "lastLoginAt"
      `;
      
      const result = await pool.query(query, queryParams);
      
      userLogger.info(`Updated user ${userId}`);
      return result.rows[0];
    } catch (error) {
      userLogger.error(`Error updating user ${userId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Update user's password
   */
  static async updatePassword(
    userId: number, 
    newPassword: string,
    options: { 
      currentPassword?: string;
      isReset?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      // If not a password reset, verify current password
      if (!options.isReset && options.currentPassword) {
        const user = await this.getUserById(userId);
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }
  
        // Verify current password
        const userWithAuth = await this.getUserByUsername(user.username);
        if (!userWithAuth) {
          throw new Error("User not found");
        }
  
        const isValidPassword = await comparePassword(options.currentPassword, userWithAuth.password_hash);
        if (!isValidPassword) {
          return false;
        }
      }
  
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password
      const result = await pool.query(
        `UPDATE users
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2`,
        [hashedPassword, userId]
      );
      
      if (result.rowCount === 0) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      userLogger.info(`Updated password for user ${userId}`);
      return true;
    } catch (error) {
      userLogger.error(`Error updating password for user ${userId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Update user's last login time
   */
  static async updateLastLogin(userId: number): Promise<void> {
    try {
      await pool.query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
        [userId]
      );
      
      userLogger.info(`Updated last login time for user ${userId}`);
    } catch (error) {
      userLogger.error(`Error updating last login for user ${userId}: ${(error as Error).message}`);
      // Non-critical operation, so just log error rather than throwing
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(userId: number): Promise<boolean> {
    try {
      // Check if user exists
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Delete user
      const result = await pool.query(
        `DELETE FROM users WHERE id = $1`,
        [userId]
      );
      
      userLogger.info(`Deleted user ${userId}`);
      return (result.rowCount ?? 0) > 0;

    } catch (error) {
      userLogger.error(`Error deleting user ${userId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Change user status
   */
  static async changeStatus(userId: number, status: UserStatus): Promise<User> {
    try {
      const result = await pool.query(
        `UPDATE users
         SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, username, email, role, status, 
                   created_at as "createdAt", updated_at as "updatedAt", last_login_at as "lastLoginAt"`,
        [status, userId]
      );
      
      if (result.rowCount === 0) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      userLogger.info(`Changed status for user ${userId} to ${status}`);
      return result.rows[0];
    } catch (error) {
      userLogger.error(`Error changing status for user ${userId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Change user role
   */
  static async changeRole(userId: number, role: UserRole): Promise<User> {
    try {
      const result = await pool.query(
        `UPDATE users
         SET role = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, username, email, role, status, 
                   created_at as "createdAt", updated_at as "updatedAt", last_login_at as "lastLoginAt"`,
        [role, userId]
      );
      
      if (result.rowCount === 0) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      userLogger.info(`Changed role for user ${userId} to ${role}`);
      return result.rows[0];
    } catch (error) {
      userLogger.error(`Error changing role for user ${userId}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Validate credentials
   */
  static async validateCredentials(username: string, password: string): Promise<User | null> {
    try {
      // Get user with password hash
      const user = await this.getUserByUsername(username);
      
      if (!user || user.status !== 'active') {
        return null;
      }
      
      // Verify password
      const isValid = await comparePassword(password, user.password_hash);

      
      if (!isValid) {
        return null;
      }
      
      // Update last login time
      await this.updateLastLogin(user.id);
      
      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      userLogger.error(`Error validating credentials: ${(error as Error).message}`);
      return null;
    }
  }
}

export default UserService;
import { Request, Response } from 'express';
import pool from '../config/db';
import { encrypt, decrypt } from '../utils/encryption';
import logger from '../config/logger';

/**
 * Stores a new database connection securely.
 */
export const addUserDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, db_type, host, port, username, password, database_name } = req.body;

    if (!user_id || !db_type || !host || !port || !username || !password || !database_name) {
      res.status(400).json({ message: '❌ Missing required parameters.' });
      return;
    }

    const encryptedPassword = encrypt(password);

    await pool.query(
      `INSERT INTO user_databases (user_id, db_type, host, port, username, encrypted_password, database_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user_id, db_type, host, port, username, encryptedPassword, database_name]
    );

    logger.info(`✅ Database connection for ${username} saved successfully.`);
    res.status(201).json({ message: '✅ Database connection saved successfully' });
  } catch (error) {
    const err = error as Error;
    logger.error('❌ Error saving database connection:', err);
    res.status(500).json({ message: 'Failed to save database connection', error: err.message });
  }
};

/**
 * Retrieves all databases for a user (WITHOUT decrypting passwords).
 */
export const getUserDatabases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      res.status(400).json({ message: '❌ User ID is required.' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT id, db_type, host, port, username, database_name FROM user_databases WHERE user_id = $1',
      [user_id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: '❌ No database connections found for this user.' });
      return;
    }

    logger.info(`✅ Retrieved database connections for user ${user_id}.`);
    res.status(200).json(rows);
  } catch (error) {
    const err = error as Error;
    logger.error('❌ Error retrieving database connections:', err);
    res.status(500).json({ message: 'Failed to retrieve database connections', error: err.message });
  }
};

/**
 * Deletes a user’s database connection.
 */
export const deleteUserDatabase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: '❌ Database ID is required.' });
      return;
    }

    const result = await pool.query('DELETE FROM user_databases WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      res.status(404).json({ message: '❌ Database connection not found.' });
      return;
    }

    logger.info(`✅ Deleted database connection ID: ${id}`);
    res.status(200).json({ message: '✅ Database connection deleted successfully' });
  } catch (error) {
    const err = error as Error;
    logger.error('❌ Error deleting database connection:', err);
    res.status(500).json({ message: 'Failed to delete database connection', error: err.message });
  }
};

/**
 * Securely retrieves and decrypts the database password.
 */
export const getDatabasePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ message: '❌ Database ID is required.' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT encrypted_password FROM user_databases WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: '❌ Database connection not found.' });
      return;
    }

    const decryptedPassword = decrypt(rows[0].encrypted_password);

    logger.info(`✅ Retrieved password for database ID: ${id}`);

    // 🔹 Instead of sending plaintext passwords, require a frontend request with authentication
    res.status(200).json({ message: '✅ Password retrieved successfully', password: decryptedPassword });
  } catch (error) {
    const err = error as Error;
    logger.error('❌ Error retrieving database password:', err);
    res.status(500).json({ message: 'Failed to retrieve database password', error: err.message });
  }
};

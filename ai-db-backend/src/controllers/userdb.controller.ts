import { Request, Response } from "express";
import {
  createDatabaseConnection,
  fetchUserDatabases,
  fetchDatabaseById,
  updateDatabaseConnection,
  deleteDatabaseConnection
} from "../services/userdb.service";
import logger from "../config/logger";
import { AuthRequest } from "../middleware/auth";
import { analyzeAndStoreDbSchema } from "../services/schema.service";


/**
 * ✅ Create a new database connection.
 */
export const createUserDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dbType, host, port, username, password, dbName } = req.body;

    if (!dbType || !host || !port || !username || !password || !dbName) {
      res.status(400).json({ message: "❌ All database connection details are required." });
      return;
    }

    const newConnection = await createDatabaseConnection(req.user.id, { dbType, host, port, username, password, dbName });
    
    // Schedule schema analysis in the background
    analyzeAndStoreDbSchema(req.user.id, newConnection.id)
      .then(metadata => {
        if (metadata) {
          logger.info(`✅ Schema analysis complete for DB ${newConnection.id}`);
        }
      })
      .catch(err => {
        logger.error(`❌ Background schema analysis failed: ${err.message}`);
      });
    
    res.status(201).json({ 
      success: true, 
      message: "✅ Database connection created and schema analysis started.", 
      data: newConnection 
    });
  } catch (error) {
    logger.error(`❌ Error creating database connection: ${(error as Error).message}`);
    res.status(500).json({ message: "Error creating database connection." });
  }
};

/**
 * ✅ Get all databases owned by the user.
 */
export const getUserDatabases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const databases = await fetchUserDatabases(req.user.id);
    res.json({ success: true, data: databases });
  } catch (error) {
    logger.error(`❌ Error fetching user databases: ${(error as Error).message}`);
    res.status(500).json({ message: "Error fetching user databases." });
  }
};

/**
 * ✅ Get details of a specific database connection.
 */
export const getUserDatabaseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dbId = Number(req.params.id);

    if (isNaN(dbId)) {
      res.status(400).json({ message: "❌ Invalid database ID." });
      return;
    }

    const database = await fetchDatabaseById(req.user.id, dbId);
    if (!database) {
      res.status(404).json({ message: "❌ Database connection not found." });
      return;
    }

    res.json({ success: true, data: database });
  } catch (error) {
    logger.error(`❌ Error fetching database connection: ${(error as Error).message}`);
    res.status(500).json({ message: "Error fetching database connection." });
  }
};

/**
 * ✅ Update a database connection's details.
 */
export const updateUserDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dbId = Number(req.params.id);
    const { dbType, host, port, username, password, dbName } = req.body;

    if (isNaN(dbId)) {
      res.status(400).json({ message: "❌ Invalid database ID." });
      return;
    }

    const updatedDatabase = await updateDatabaseConnection(req.user.id, dbId, { dbType, host, port, username, password, dbName });
    res.json({ success: true, message: "✅ Database connection updated.", data: updatedDatabase });
  } catch (error) {
    logger.error(`❌ Error updating database connection: ${(error as Error).message}`);
    res.status(500).json({ message: "Error updating database connection." });
  }
};

/**
 * ✅ Delete a database connection.
 */
export const deleteUserDatabase = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dbId = Number(req.params.id);

    if (isNaN(dbId)) {
      res.status(400).json({ message: "❌ Invalid database ID." });
      return;
    }

    await deleteDatabaseConnection(req.user.id, dbId);
    res.json({ success: true, message: "✅ Database connection deleted." });
  } catch (error) {
    logger.error(`❌ Error deleting database connection: ${(error as Error).message}`);
    res.status(500).json({ message: "Error deleting database connection." });
  }
};

import { Request, Response } from "express";
import { fetchAllTables, fetchTableSchema, validateQueryAgainstSchema } from "../services/schema.service";
import logger from "../config/logger";
import { AuthRequest } from "../middleware/auth";

/**
 * ✅ Get all tables for a given database type.
 */
export const getAllTables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dbType = typeof req.query.dbType === "string" ? req.query.dbType : ""; // ✅ Ensures dbType is a string

    if (!dbType) {
      res.status(400).json({ message: "❌ Missing database type." });
      return;
    }

    const tables = await fetchAllTables(dbType);
    res.json({ success: true, tables });
  } catch (error) {
    logger.error(`❌ Error fetching tables: ${(error as Error).message}`);
    res.status(500).json({ message: "Error fetching tables." });
  }
};

/**
 * ✅ Get the schema for a specific table.
 */
export const getTableSchema = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dbType = typeof req.query.dbType === "string" ? req.query.dbType : ""; // ✅ Ensures dbType is a string
    const tableName = typeof req.params.table === "string" ? req.params.table : ""; // ✅ Ensures tableName is a string

    if (!dbType || !tableName) {
      res.status(400).json({ message: "❌ Missing database type or table name." });
      return;
    }

    const schema = await fetchTableSchema(dbType, tableName);
    res.json({ success: true, schema });
  } catch (error) {
    logger.error(`❌ Error fetching schema for table ${req.params.table}: ${(error as Error).message}`);
    res.status(500).json({ message: "Error fetching table schema." });
  }
};

/**
 * ✅ Validate a query against the schema.
 */
export const validateQuerySchema = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dbType = typeof req.body.dbType === "string" ? req.body.dbType : ""; // ✅ Ensures dbType is a string
    const query = typeof req.body.query === "string" ? req.body.query : ""; // ✅ Ensures query is a string

    if (!dbType || !query) {
      res.status(400).json({ message: "❌ Missing database type or query." });
      return;
    }

    const isValid = await validateQueryAgainstSchema(query, dbType);
    if (!isValid) {
      res.status(400).json({ message: "❌ Query validation failed." });
      return;
    }

    res.json({ success: true, message: "✅ Query is valid." });
  } catch (error) {
    logger.error(`❌ Query Schema Validation Failed: ${(error as Error).message}`);
    res.status(500).json({ message: "Error validating query against schema." });
  }
};

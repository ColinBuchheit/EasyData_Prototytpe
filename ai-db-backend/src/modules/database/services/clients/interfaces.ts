// src/modules/database/services/clients/interfaces.ts

import type { UserDatabase } from "../../models/connection.model";

export interface IDatabaseClient {
  /**
   * Connects to the target database
   */
  connect(db: UserDatabase): Promise<any>;

  /**
   * Returns a list of all tables or collections
   */
  fetchTables(db: UserDatabase): Promise<string[]>;

  /**
   * Returns the schema for a specific table or collection
   */
  fetchSchema(db: UserDatabase, table: string): Promise<any>;

  /**
   * Executes a user query on the target DB
   */
  runQuery(db: UserDatabase, query: any): Promise<any>;

  /**
   * Tests the database connection
   */
  testConnection(db: UserDatabase): Promise<boolean>;

  /**
   * Closes connections and performs cleanup
   */
  disconnect(db: UserDatabase): Promise<void>;
}
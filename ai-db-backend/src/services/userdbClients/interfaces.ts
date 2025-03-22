import type { UserDatabase } from "../../models/userDatabase.model";

export interface IDatabaseClient {
  /**
   * Connects to the target database (optional if lazy-loaded).
   */
  connect(db: UserDatabase): Promise<void>;

  /**
   * Returns a list of all tables or collections.
   */
  fetchTables(db: UserDatabase): Promise<string[]>;

  /**
   * Returns the schema for a specific table or collection.
   */
  fetchSchema(db: UserDatabase, table: string): Promise<any>;

  /**
   * Executes a user query on the target DB.
   * SQL for SQL DBs, JSON or structured object for NoSQL.
   */
  runQuery(db: UserDatabase, query: any): Promise<any>;

  /**
   * Optional method to close or clean up connections.
   */
  disconnect?(db: UserDatabase): Promise<void>;
}

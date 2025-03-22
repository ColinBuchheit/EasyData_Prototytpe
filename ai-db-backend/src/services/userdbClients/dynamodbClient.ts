import { IDatabaseClient } from "./interfaces";
import { UserDatabase } from "../../models/userDatabase.model";
import {
  DynamoDBClient,
  ScanCommand,
  ListTablesCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";

function getClient(db: UserDatabase): DynamoDBClient {
  return new DynamoDBClient({
    region: "us-east-1", // or configurable
    credentials: {
      accessKeyId: db.username!,
      secretAccessKey: db.encrypted_password!,
    },
  });
}

export const dynamodbClient: IDatabaseClient = {
  async connect(db: UserDatabase) {},

  async fetchTables(db: UserDatabase): Promise<string[]> {
    const client = getClient(db);
    const result = await client.send(new ListTablesCommand({}));
    return result.TableNames || [];
  },

  async fetchSchema(db: UserDatabase, table: string): Promise<any> {
    const client = getClient(db);
    const result = await client.send(new DescribeTableCommand({ TableName: table }));
    return result.Table?.AttributeDefinitions || [];
  },

  async runQuery(db: UserDatabase, query: any): Promise<any> {
    const client = getClient(db);
    const result = await client.send(new ScanCommand({ TableName: query.table }));
    return result.Items || [];
  }
};

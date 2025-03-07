import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import logger from "../config/logger";

// ✅ Initialize Azure Key Vault Client
const keyVaultName = process.env.AZURE_KEY_VAULT_NAME || "my-keyvault";
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const azureClient = new SecretClient(vaultUrl, credential);

/**
 * ✅ Fetches database credentials securely from Azure Key Vault.
 */
export async function fetchCloudCredentials(userId: number, dbType: string): Promise<any | null> {
  try {
    const secretName = `db-credentials-${userId}-${dbType}`;
    const secret = await azureClient.getSecret(secretName);

    if (!secret.value) {
      logger.warn(`⚠️ No secret value found for ${secretName}`);
      return null;
    }

    return JSON.parse(secret.value);
  } catch (error) {
    logger.error(`❌ Failed to fetch Azure credentials for ${dbType}:`, error);
    return null;
  }
}

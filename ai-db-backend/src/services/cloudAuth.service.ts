import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import logger from "../config/logger";

// ✅ Initialize Azure Key Vault Client
const keyVaultName = process.env.AZURE_KEY_VAULT_NAME || "my-keyvault";
const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
const credential = new DefaultAzureCredential();
const client = new SecretClient(vaultUrl, credential);

/**
 * Fetches database credentials securely from Azure Key Vault.
 */
export async function fetchCloudCredentials(userId: number, dbType: string, cloudProvider: string): Promise<any | null> {
  try {
    if (cloudProvider === "azure") {
      const secretName = `db-credentials-${userId}-${dbType}`;
      const secret = await client.getSecret(secretName);

      if (secret.value) {
        return JSON.parse(secret.value);
      }
    }
    
    logger.error(`❌ Unsupported cloud provider: ${cloudProvider}`);
    return null;
  } catch (error) {
    logger.error(`❌ Failed to fetch credentials from Azure Key Vault: ${error}`);
    return null;
  }
}

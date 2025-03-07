import crypto from 'crypto';
import logger from '../config/logger';

const ALGORITHM = 'aes-256-cbc';

// ✅ Ensure the encryption key is exactly 32 bytes
const SECRET_KEY = crypto.createHash('sha256')
  .update(process.env.ENCRYPTION_KEY || '')
  .digest().slice(0, 32); // ✅ Explicitly enforce 32 bytes

/**
 * Encrypts a given text using AES-256-CBC.
 * @param text - The text to encrypt.
 * @returns Encrypted text in base64 format (`iv:ciphertext`).
 */
export const encrypt = (text: string): string => {
  try {
    const iv = crypto.randomBytes(16); // ✅ Generate a new IV per encryption
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error(`❌ Encryption failed: ${(error as Error).message}`);
    throw new Error("Encryption error. Please try again.");
  }
};

/**
 * Decrypts an encrypted text.
 * @param encryptedText - The encrypted text (`iv:ciphertext`).
 * @returns Decrypted text or `null` if decryption fails.
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted text format.");
    }
    
    const [iv, encrypted] = parts;
    
    // ✅ Validate IV length
    if (Buffer.from(iv, 'hex').length !== 16) {
      throw new Error("Invalid IV length. Expected 16 bytes.");
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.warn("❌ Decryption failed. Possibly due to an incorrect key or corrupted data.");
    
    return ""; // ✅ Always return an empty string instead of `null`
  }
};

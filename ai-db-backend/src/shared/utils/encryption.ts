// src/shared/utils/encryption.ts

import crypto from 'crypto';
import { createContextLogger } from "../../config/logger";

const encryptionLogger = createContextLogger("Encryption");

// Constants for encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Get encryption key from environment or create from secret
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    encryptionLogger.warn('ENCRYPTION_KEY not set, using fallback mechanism');
    
    // If no key, create from a secret
    const secretKey = process.env.JWT_SECRET || 'default-fallback-key-not-secure';
    return crypto.createHash('sha256').update(secretKey).digest().slice(0, KEY_LENGTH);
  }
  
  // If key is provided as hex string, convert to buffer
  if (envKey.match(/^[0-9a-f]{64}$/i)) {
    return Buffer.from(envKey, 'hex');
  }
  
  // Otherwise, use it to derive a key
  return crypto.createHash('sha256').update(envKey).digest().slice(0, KEY_LENGTH);
}

// Get the encryption key
const SECRET_KEY = getEncryptionKey();

/**
 * Encrypt sensitive data
 * 
 * @param text The text to encrypt
 * @returns Encrypted data in format: iv:authTag:encryptedData (base64)
 */
export function encrypt(text: string): string {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    encryptionLogger.error(`Encryption failed: ${(error as Error).message}`);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt previously encrypted data
 * 
 * @param encryptedData The encrypted data (iv:authTag:encryptedData)
 * @returns The decrypted text
 */
export function decrypt(encryptedData: string): string {
  try {
    // Split the stored data
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }
    
    const [ivBase64, authTagBase64, encryptedText] = parts;
    
    // Convert from base64
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    encryptionLogger.error(`Decryption failed: ${(error as Error).message}`);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash a password or other sensitive value
 * 
 * @param value The value to hash
 * @returns Hashed value
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Compare a value with a hash to verify it
 * 
 * @param value The value to check
 * @param hash The hash to compare against
 * @returns True if they match
 */
export function compareHash(value: string, hash: string): boolean {
  const valueHash = hashValue(value);
  return crypto.timingSafeEqual(
    Buffer.from(valueHash, 'hex'),
    Buffer.from(hash, 'hex')
  );
}

/**
 * Generate a random string (useful for tokens, etc.)
 * 
 * @param length The length of the string to generate
 * @returns A random string
 */
export function generateRandomString(length = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}
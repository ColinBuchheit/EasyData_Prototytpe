import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ENCRYPTION_KEY as string;
const IV = crypto.randomBytes(16);

/**
 * Encrypts a given text using AES-256-CBC.
 * @param text - The text to encrypt.
 * @returns Encrypted text in base64 format.
 */
export const encrypt = (text: string): string => {
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${IV.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts an encrypted text.
 * @param encryptedText - The encrypted text.
 * @returns Decrypted text.
 */
export const decrypt = (encryptedText: string): string => {
  const [iv, encrypted] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

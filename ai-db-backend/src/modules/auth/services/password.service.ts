// src/modules/auth/services/password.service.ts
import bcrypt from "bcrypt";
import { createContextLogger } from "../../../config/logger";

const passwordLogger = createContextLogger("PasswordService");

/**
 * Hash a password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

/**
 * Compare a password with a hash
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  console.log(`[AUTH DEBUG] Password comparison - Input password length: ${password.length}, Hash length: ${hashedPassword ? hashedPassword.length : 'null'}`);
  try {
    const result = await bcrypt.compare(password, hashedPassword);
    console.log(`[AUTH DEBUG] bcrypt.compare result: ${result}`);
    return result;
  } catch (error) {
    console.log(`[AUTH DEBUG] bcrypt.compare error: ${(error as Error).message}`);
    return false;
  }
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): { valid: boolean; message?: string } => {
  const strongPasswordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
  
  if (!strongPasswordRegex.test(password)) {
    return {
      valid: false,
      message: "Password must be at least 8 characters, include one uppercase letter, and one number."
    };
  }
  
  return { valid: true };
};
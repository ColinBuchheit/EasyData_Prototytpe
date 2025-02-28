// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ENV } from '../config/env';  // ✅ Use ENV instead of direct import
import { registerUser, findUserByUsername } from '../services/user.service';

/**
 * Register a new user.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, role } = req.body;

    // Check if user already exists
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      res.status(400).json({ message: '❌ User already exists' });
      return;
    }

    // Register new user
    const newUser = await registerUser({ username, password, role });

    res.status(201).json({ message: '✅ User registered successfully', user: newUser });
  } catch (error) {
    console.error('❌ Error registering user:', error);
    res.status(500).json({ message: 'Error registering user', error: (error as Error).message });
  }
};

/**
 * Authenticate a user and return a JWT token.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await findUserByUsername(username);
    if (!user) {
      res.status(401).json({ message: '❌ Invalid credentials' });
      return;
    }

    // Validate password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      res.status(401).json({ message: '❌ Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, ENV.JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: '✅ Login successful', token });
  } catch (error) {
    console.error('❌ Error logging in:', error);
    res.status(500).json({ message: 'Error logging in', error: (error as Error).message });
  }
};

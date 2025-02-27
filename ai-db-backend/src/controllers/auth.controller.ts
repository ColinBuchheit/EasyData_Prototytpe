// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { JWT_SECRET } from '../config/env';
import { registerUser, findUserByUsername } from '../services/user.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, role } = req.body;
    const user = await findUserByUsername(username);
    if (user) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }
    const newUser = await registerUser({ username, password, role });
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const user = await findUserByUsername(username);
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
};

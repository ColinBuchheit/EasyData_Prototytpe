// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';

export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return; // Return void explicitly
  }

  jwt.verify(token, JWT_SECRET, (err: Error | null, decoded: any) => {
    if (err) {
      res.status(401).json({ message: 'Unauthorized: Invalid token' });
      return; // Return void explicitly
    }
    req.user = decoded;
    next();
  });
};

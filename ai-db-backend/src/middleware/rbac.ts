// src/middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const authorizeRoles = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({ message: 'Forbidden: Access Denied' });
      return; // Return void explicitly
    }
    next();
  };
};

// src/controllers/users.controller.ts
import { Request, Response } from 'express';
import { getUsers, getUser, updateUserById, deleteUserById } from '../services/user.service';

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await getUsers();
    res.json(users);
    return;
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
    return;
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUser(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
    return;
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error });
    return;
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const updatedUser = await updateUserById(req.params.id, req.body);
    res.json(updatedUser);
    return;
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error });
    return;
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteUserById(req.params.id);
    res.json({ message: 'User deleted' });
    return;
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error });
    return;
  }
};

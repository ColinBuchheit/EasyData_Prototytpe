// src/services/user.service.ts
import bcrypt from 'bcrypt';
import pool from '../config/db';
import { User } from '../models/user.model';

const saltRounds = 10;

export const registerUser = async ({ username, password, role }: { username: string; password: string; role: string; }): Promise<User> => {
  const password_hash = await bcrypt.hash(password, saltRounds);
  const result = await pool.query(
    'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
    [username, password_hash, role]
  );
  return result.rows[0];
};

export const findUserByUsername = async (username: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0] || null;
};

export const getUsers = async (): Promise<User[]> => {
  const result = await pool.query('SELECT id, username, role FROM users');
  return result.rows;
};

export const getUser = async (id: string): Promise<User | null> => {
  const result = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const updateUserById = async (id: string, data: Partial<User>): Promise<User> => {
  const { username, role } = data;
  const result = await pool.query(
    'UPDATE users SET username = COALESCE($1, username), role = COALESCE($2, role) WHERE id = $3 RETURNING id, username, role',
    [username, role, id]
  );
  return result.rows[0];
};

export const deleteUserById = async (id: string): Promise<void> => {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
};

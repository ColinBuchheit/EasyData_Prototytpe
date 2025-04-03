// debug-env.ts
import dotenv from 'dotenv';
dotenv.config();

console.log("Environment variables:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_DATABASE:", process.env.DB_DATABASE);
console.log("DB_TYPE:", process.env.DB_TYPE);
console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("ENCRYPTION_KEY:", process.env.ENCRYPTION_KEY);
console.log("BACKEND_SECRET:", process.env.BACKEND_SECRET);
import { PrismaClient, Prisma } from './client';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export { PrismaClient, Prisma };

// If packaged, resolve Prisma engine and schema path from app directory
if (app && app.isPackaged) {
  const possibleEnginePaths = [
    // asar-unpacked paths (when asar is enabled with asarUnpack)
    path.join(process.resourcesPath, 'app.asar.unpacked', 'dist-electron', 'main', 'database', 'client', 'query_engine-windows.dll.node'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node'),
    // Legacy non-asar paths (fallback)
    path.join(process.resourcesPath, 'app', 'dist-electron', 'main', 'database', 'client', 'query_engine-windows.dll.node'),
    path.join(process.resourcesPath, 'app', 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node'),
    path.join(process.resourcesPath, 'prisma', 'query_engine-windows.dll.node'),
  ];

  for (const enginePath of possibleEnginePaths) {
    if (fs.existsSync(enginePath)) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
      break;
    }
  }

  // Look for .env in resources folder or current working directory
  const envPath = path.join(process.resourcesPath, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const [key, ...rest] = line.split('=');
        if (key && rest.length > 0) {
          const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      });
    } catch (e) {
      console.warn('Failed to parse .env file:', e);
    }
  }
}

// Fallback default DATABASE_URL for local PostgreSQL
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:root@localhost:5432/city_hospital_db?schema=public';
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

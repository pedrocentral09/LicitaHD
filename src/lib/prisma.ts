import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const isRemoteDB = process.env.DATABASE_URL?.includes('proxy') || process.env.DATABASE_URL?.includes('railway') || process.env.DATABASE_URL?.includes('supabase');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemoteDB ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });

  // Listener para capturar erros silenciosos do pool
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

async function test() {
  console.log("Connecting...");
  const isRemoteDB = process.env.DATABASE_URL?.includes('proxy') || process.env.DATABASE_URL?.includes('railway') || process.env.DATABASE_URL?.includes('supabase');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemoteDB ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Running query...");
  try {
    console.time("PrismaQuery");
    const user = await prisma.user.findUnique({ where: { username: "pedro" } });
    console.timeEnd("PrismaQuery");
    console.log("Success! Found user:", user?.username);
    
    if (user?.passwordHash) {
       console.log("Testing bcrypt...");
       console.time("BcryptCompare");
       const bcrypt = require("bcryptjs");
       const isValid = await bcrypt.compare("1805}", user.passwordHash);
       console.timeEnd("BcryptCompare");
       console.log("Bcrypt result:", isValid);
    }
    
  } catch (e: any) {
    console.error("Failed:", e.message);
  } finally {
    await prisma.$disconnect();
    pool.end();
  }
}

test();

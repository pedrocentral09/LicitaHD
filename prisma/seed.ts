import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("1805}", 10);

  const admin = await prisma.user.upsert({
    where: { username: "pedro" },
    update: {
      passwordHash,
      role: "GOD",
    },
    create: {
      username: "pedro",
      name: "Pedro Henrique",
      role: "GOD",
      passwordHash,
    },
  });

  console.log("God User Seeded:", admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

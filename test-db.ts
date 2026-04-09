import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const g = await prisma.procurementGroup.findFirst({ include: { items: true } });
  if (!g || !g.items.length) {
    console.log("No items found");
    return;
  }
  const itemId = g.items[0].id;
  
  console.log('Original items tax:', g.items.map(i => i.taxPercent));
  
  await prisma.purchaseItem.update({
    where: { id: itemId },
    data: { taxPercent: 12.5 }
  });
  
  const b = await prisma.purchaseItem.findUnique({ where: { id: itemId } });
  console.log('Updated tax:', b?.taxPercent);
}

main().catch(console.error).finally(() => prisma.$disconnect());

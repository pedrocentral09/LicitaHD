import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const items = await prisma.purchaseItem.findMany({
    where: {
      costPrice: { not: null },
    },
    include: {
      purchaseOrder: {
        include: { organization: { select: { name: true } } },
      },
    },
  });

  // Filter items with low margin (< 5%)
  const alerts = items.filter((item) => {
    if (!item.costPrice) return false;
    const margin = ((item.unitPriceReturn - item.costPrice) / item.unitPriceReturn) * 100;
    return margin < 5;
  });

  return NextResponse.json(alerts);
}

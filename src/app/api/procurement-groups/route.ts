import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const groups = await prisma.procurementGroup.findMany({
    orderBy: { description: "asc" },
    include: {
      organization: { select: { name: true } },
      items: {
        include: {
          purchaseOrder: { select: { documentNumber: true } },
        },
      },
    },
  });
  return NextResponse.json(groups);
}

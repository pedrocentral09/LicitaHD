import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { name: true } },
      items: true,
    },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const body = await req.json();

  const order = await prisma.purchaseOrder.create({
    data: {
      documentNumber: body.documentNumber,
      organizationId: body.organizationId,
      issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
      status: "DRAFT",
      items: {
        create: body.items.map((item: { description: string; quantity: number; unitPriceReturn: number }) => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceReturn: item.unitPriceReturn,
        })),
      },
    },
    include: { items: true },
  });

  // Auto-create ProcurementGroups per description+org
  for (const item of order.items) {
    const existing = await prisma.procurementGroup.findUnique({
      where: {
        organizationId_description: {
          organizationId: body.organizationId,
          description: item.description,
        },
      },
    });

    if (existing) {
      await prisma.purchaseItem.update({
        where: { id: item.id },
        data: { procurementId: existing.id },
      });
    } else {
      const group = await prisma.procurementGroup.create({
        data: {
          description: item.description,
          organizationId: body.organizationId,
        },
      });
      await prisma.purchaseItem.update({
        where: { id: item.id },
        data: { procurementId: group.id },
      });
    }
  }

  return NextResponse.json(order, { status: 201 });
}

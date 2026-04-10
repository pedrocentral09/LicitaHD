import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

  if (body.documentNumber && body.documentNumber.trim() !== "") {
    const existingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        organizationId: body.organizationId,
        documentNumber: body.documentNumber.trim(),
      },
    });

    if (existingOrder) {
      return NextResponse.json(
        { error: `Ordem de Fornecimento Duplicada! Já existe uma OF registrada com o número '${body.documentNumber}' para este órgão.` },
        { status: 409 }
      );
    }
  }

  const order = await prisma.purchaseOrder.create({
    data: {
      documentNumber: body.documentNumber,
      organizationId: body.organizationId,
      issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
      sellerName: body.sellerName || null,
      status: "DRAFT",
      items: {
        create: body.items.map((item: { description: string; quantity: number; unitPriceReturn: number }) => ({
          description: item.description.trim().toUpperCase(),
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
          description: item.description.trim().toUpperCase(),
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
          description: item.description.trim().toUpperCase(),
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

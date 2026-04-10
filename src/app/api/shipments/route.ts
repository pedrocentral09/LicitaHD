import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { purchaseOrderId, items, invoiceNumber, notes } = body;

    if (!purchaseOrderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "purchaseOrderId e items são obrigatórios." },
        { status: 400 }
      );
    }

    // Validate that all items belong to this OC and quantities don't exceed available
    const oc = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        items: {
          include: {
            shipmentItems: true
          }
        },
        shipments: { select: { shipmentNumber: true } }
      }
    });

    if (!oc) {
      return NextResponse.json({ error: "OC não encontrada." }, { status: 404 });
    }

    // Validate each item
    for (const reqItem of items) {
      const ocItem = oc.items.find((i) => i.id === reqItem.purchaseItemId);
      if (!ocItem) {
        return NextResponse.json(
          { error: `Item ${reqItem.purchaseItemId} não pertence a esta OC.` },
          { status: 400 }
        );
      }

      const alreadyShipped = ocItem.shipmentItems.reduce((s, si) => s + si.quantity, 0);
      const available = ocItem.quantity - alreadyShipped;

      if (reqItem.quantity > available) {
        return NextResponse.json(
          { error: `Item "${ocItem.description}" — saldo disponível: ${available}, solicitado: ${reqItem.quantity}` },
          { status: 400 }
        );
      }
    }

    // Calculate next shipment number
    const maxNumber = oc.shipments.reduce((max, s) => Math.max(max, s.shipmentNumber), 0);
    const nextNumber = maxNumber + 1;

    // Create shipment
    const shipment = await prisma.shipment.create({
      data: {
        shipmentNumber: nextNumber,
        purchaseOrderId,
        invoiceNumber: invoiceNumber || null,
        notes: notes || null,
        items: {
          create: items.map((i: { purchaseItemId: string; quantity: number }) => ({
            purchaseItemId: i.purchaseItemId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // Update OC status to PARTIAL if not already
    if (oc.status !== "PARTIAL" && oc.status !== "DELIVERED") {
      await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: "PARTIAL" },
      });
    }

    return NextResponse.json(shipment, { status: 201 });
  } catch (error: any) {
    console.error("[Shipment Create Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

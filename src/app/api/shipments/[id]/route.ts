import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: any = {};

    if (body.invoiceNumber !== undefined) data.invoiceNumber = body.invoiceNumber || null;
    if (body.notes !== undefined) data.notes = body.notes || null;

    if (body.status === "DISPATCHED") {
      data.status = "DISPATCHED";
      data.dispatchedAt = new Date();
    }

    if (body.status === "DELIVERED") {
      data.status = "DELIVERED";
      data.deliveredAt = new Date();
    }

    if (body.status === "PENDING") {
      data.status = "PENDING";
      data.dispatchedAt = null;
      data.deliveredAt = null;
    }

    const shipment = await prisma.shipment.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            purchaseItem: { select: { unitPriceReturn: true, description: true } }
          }
        },
        purchaseOrder: { select: { organizationId: true, documentNumber: true } }
      },
    });

    // Auto-generate AccountReceivable when shipment is delivered
    if (body.status === "DELIVERED" && shipment.purchaseOrder) {
      // Check if there's already a receivable for this shipment
      const existing = await prisma.accountReceivable.findUnique({
        where: { shipmentId: shipment.id }
      });

      if (!existing) {
        const totalAmount = shipment.items.reduce(
          (sum, si) => sum + si.quantity * si.purchaseItem.unitPriceReturn,
          0
        );

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // 30 dias do vencimento

        const nfe = shipment.invoiceNumber ? ` — NF-e ${shipment.invoiceNumber}` : "";

        await prisma.accountReceivable.create({
          data: {
            title: `OC ${shipment.purchaseOrder.documentNumber} — Remessa #${shipment.shipmentNumber}${nfe}`,
            amount: totalAmount,
            dueDate,
            organizationId: shipment.purchaseOrder.organizationId,
            purchaseOrderId: shipment.purchaseOrderId,
            shipmentId: shipment.id,
            status: "PENDING",
          },
        });
      }
    }

    // If reverted from DELIVERED, delete auto-generated receivable
    if (body.status === "DISPATCHED" || body.status === "PENDING") {
      await prisma.accountReceivable.deleteMany({
        where: { shipmentId: shipment.id }
      });
    }

    // Check if all items of the OC are fully delivered via shipments
    const oc = await prisma.purchaseOrder.findUnique({
      where: { id: shipment.purchaseOrderId },
      include: {
        items: { include: { shipmentItems: { include: { shipment: true } } } },
        shipments: true,
      },
    });

    if (oc) {
      const allItemsFullyDelivered = oc.items.every((item) => {
        const totalShipped = item.shipmentItems
          .filter((si) => si.shipment.status === "DELIVERED")
          .reduce((s, si) => s + si.quantity, 0);
        return totalShipped >= item.quantity;
      });

      if (allItemsFullyDelivered && oc.items.length > 0) {
        await prisma.purchaseOrder.update({
          where: { id: oc.id },
          data: { status: "DELIVERED" },
        });
      } else if (oc.shipments.length > 0 && oc.status !== "PARTIAL") {
        await prisma.purchaseOrder.update({
          where: { id: oc.id },
          data: { status: "PARTIAL" },
        });
      }
    }

    return NextResponse.json({ success: true, shipment });
  } catch (error: any) {
    console.error("[Shipment PATCH Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) {
      return NextResponse.json({ error: "Remessa não encontrada." }, { status: 404 });
    }

    if (shipment.status !== "PENDING") {
      return NextResponse.json(
        { error: "Só é possível excluir remessas com status PENDENTE." },
        { status: 400 }
      );
    }

    await prisma.shipment.delete({ where: { id } });

    // Recalculate OC status
    const remainingShipments = await prisma.shipment.count({
      where: { purchaseOrderId: shipment.purchaseOrderId },
    });

    if (remainingShipments === 0) {
      await prisma.purchaseOrder.update({
        where: { id: shipment.purchaseOrderId },
        data: { status: "QUOTED" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Shipment DELETE Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

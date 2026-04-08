import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Toggle recebimento (se estiver nulo, data atual, senão nulo)
    const item = await prisma.purchaseItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const newReceivedAt = item.receivedAt ? null : new Date();

    const updatedItem = await prisma.purchaseItem.update({
      where: { id },
      data: { receivedAt: newReceivedAt },
    });

    // Check se todos os itens da mesma OC foram entregues
    const allItemsInOc = await prisma.purchaseItem.findMany({
      where: { purchaseOrderId: item.purchaseOrderId },
    });

    const allReceived = allItemsInOc.length > 0 && allItemsInOc.every((i: any) => i.receivedAt !== null);

    if (allReceived) {
      await prisma.purchaseOrder.update({
        where: { id: item.purchaseOrderId },
        data: { status: "DELIVERED" }
      });
    } else {
      // Caso alguém "desfaça" e a OC estivesse marcada como DELIVERED, voltamos ela para QUOTED
      const oc = await prisma.purchaseOrder.findUnique({
        where: { id: item.purchaseOrderId }
      });
      if (oc?.status === "DELIVERED") {
        await prisma.purchaseOrder.update({
          where: { id: item.purchaseOrderId },
          data: { status: "QUOTED" }
        });
      }
    }

    return NextResponse.json({ success: true, item: updatedItem, allReceived });
  } catch (err: any) {
    console.error("[PurchaseItem Receive Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

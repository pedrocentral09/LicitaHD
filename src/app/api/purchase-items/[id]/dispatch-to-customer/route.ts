import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Toggle recebimento final (ao órgão)
    const item = await prisma.purchaseItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const newDeliveredAt = item.deliveredToCustomerAt ? null : new Date();

    const updatedItem = await prisma.purchaseItem.update({
      where: { id },
      data: { deliveredToCustomerAt: newDeliveredAt },
    });

    // Check se todos os itens da mesma OC foram entregues ao cliente final
    const allItemsInOc = await prisma.purchaseItem.findMany({
      where: { purchaseOrderId: item.purchaseOrderId },
    });

    const allDispatched = allItemsInOc.length > 0 && allItemsInOc.every((i: any) => i.deliveredToCustomerAt !== null);

    if (allDispatched) {
      await prisma.purchaseOrder.update({
        where: { id: item.purchaseOrderId },
        data: { status: "DELIVERED" }
      });
      // Importante notar que no workflow anterior, mudar para DELIVERED acionaria o /api/orders/[id]/status
      // Porém aqui estamos atualizando via banco (bypass no webhook do PATCH status).
      // Teremos que disparar a criação "Contas a Receber" aqui também, se necessário, ou usar a pipeline Kanban.
      
      const existingReceivable = await prisma.accountReceivable.findFirst({
        where: { purchaseOrderId: item.purchaseOrderId }
      });

      if (!existingReceivable) {
        const totalAmount = allItemsInOc.reduce((acc: number, cur: any) => acc + ((cur.quantity || 0) * (cur.unitPriceReturn || 0)), 0);
        const ocInfo = await prisma.purchaseOrder.findUnique({ where: { id: item.purchaseOrderId }});
        
        if (ocInfo) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          await prisma.accountReceivable.create({
            data: {
              title: `Valores Referente à OC ${ocInfo.documentNumber}`,
              amount: totalAmount,
              dueDate: dueDate,
              organizationId: ocInfo.organizationId,
              purchaseOrderId: ocInfo.id,
              status: "PENDING"
            }
          });
        }
      }
    } else {
      // Caso revertam a entrega
      const oc = await prisma.purchaseOrder.findUnique({
        where: { id: item.purchaseOrderId }
      });
      if (oc?.status === "DELIVERED") {
        await prisma.purchaseOrder.update({
          where: { id: item.purchaseOrderId },
          data: { status: "RECEIVED" }
        });
      }
    }

    return NextResponse.json({ success: true, item: updatedItem, allDispatched });
  } catch (err: any) {
    console.error("[PurchaseItem Dispatch Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

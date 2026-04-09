import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const session = await getServerSession(authOptions);
    const operatorName = session?.user?.name || null;

    const currentOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let marginToSave = currentOrder.margin;
    
    if (currentOrder.items.length > 0) {
      let totalVenda = 0;
      let totalCustoGlobal = 0;

      for (const item of currentOrder.items) {
         const vendaItem = (item.quantity || 0) * (item.unitPriceReturn || 0);
         const custoProduto = (item.quantity || 0) * (item.costPrice || 0);
         const taxAmount = vendaItem * ((item.taxPercent || 0) / 100);
         
         const custoTotalItem = custoProduto + taxAmount;
         
         totalVenda += vendaItem;
         totalCustoGlobal += custoTotalItem;
      }

      if (totalVenda > 0 && totalCustoGlobal > 0) {
        marginToSave = ((totalVenda - totalCustoGlobal) / totalVenda) * 100;
      }
    }

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: { 
        status: body.status,
        operatorName: operatorName,
        margin: marginToSave
      },
      include: { items: true } // Include items to calculate total for receivable
    });

    // AUTOMATION: If order is delivered, auto-generate Accounts Receivable
    if (body.status === "DELIVERED") {
      const existingReceivable = await prisma.accountReceivable.findFirst({
        where: { purchaseOrderId: id }
      });

      if (!existingReceivable) {
        const totalAmount = order.items.reduce((acc: number, item: any) => acc + ((item.quantity || 0) * (item.unitPriceReturn || 0)), 0);
        
        // Due Date = 30 consecutive days from now
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        await prisma.accountReceivable.create({
          data: {
            title: `Valores Referente à OC ${order.documentNumber}`,
            amount: totalAmount,
            dueDate: dueDate,
            organizationId: order.organizationId,
            purchaseOrderId: order.id,
            status: "PENDING"
          }
        });
      }
    }

    // AUTOMATION: If order is regressed to VALIDATED (Purchasing phase), clean logistics
    if (body.status === "VALIDATED") {
      await prisma.purchaseItem.updateMany({
        where: { purchaseOrderId: id },
        data: { receivedAt: null, deliveredToCustomerAt: null }
      });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("[OrderStatus PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

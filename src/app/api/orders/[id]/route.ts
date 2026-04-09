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

    if (body.documentNumber) {
      await prisma.purchaseOrder.update({
        where: { id },
        data: { documentNumber: body.documentNumber },
      });
    }

    if (body.items && Array.isArray(body.items)) {
      // Find all existing items in this order
      const existingDbItems = await prisma.purchaseItem.findMany({
        where: { purchaseOrderId: id },
        select: { id: true }
      });
      const existingDbIds = existingDbItems.map(i => i.id);

      const payloadIds = body.items.filter((i: any) => !i.id.startsWith("new-")).map((i: any) => i.id);
      
      // Delete items that were removed by the user
      const idsToDelete = existingDbIds.filter(id => !payloadIds.includes(id));
      if (idsToDelete.length > 0) {
        await prisma.purchaseItem.deleteMany({
          where: { id: { in: idsToDelete } }
        });
      }

      // Process Payload
      for (const item of body.items) {
        if (item.id.startsWith("new-")) {
          // Create new item
          await prisma.purchaseItem.create({
            data: {
              description: item.description,
              quantity: Number(item.quantity) || 0,
              unitPriceReturn: Number(item.unitPriceReturn) || 0,
              active: item.active !== undefined ? item.active : true,
              purchaseOrderId: id,
              conversionFactor: 1
            }
          });
        } else {
          // Update existing item
          await prisma.purchaseItem.update({
            where: { id: item.id },
            data: {
              description: item.description,
              quantity: Number(item.quantity) || 0,
              unitPriceReturn: Number(item.unitPriceReturn) || 0,
              active: item.active !== undefined ? item.active : true,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Order PATCH Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "GOD") {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const { id } = await params;

    // Primeiro deleta todos os itens para nao dar erro de FK
    await prisma.purchaseItem.deleteMany({
      where: { purchaseOrderId: id },
    });

    // Depois deleta a ordem de compra
    await prisma.purchaseOrder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Order Delete API]", error);
    return NextResponse.json(
      { error: "Erro ao deletar ordem de compra" },
      { status: 500 }
    );
  }
}


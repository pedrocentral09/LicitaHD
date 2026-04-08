import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

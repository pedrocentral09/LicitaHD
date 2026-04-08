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

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: { 
        status: body.status,
        operatorName: operatorName 
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("[OrderStatus PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

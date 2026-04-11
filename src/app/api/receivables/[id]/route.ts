import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.status) updateData.status = body.status;
    if (body.status === "PAID") {
      updateData.paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    } else if (body.status === "PENDING" || body.status === "OVERDUE") {
      updateData.paidAt = null;
    }
    if (body.paidAt !== undefined && !body.status) {
      updateData.paidAt = body.paidAt ? new Date(body.paidAt) : null;
    }
    if (body.dueDate !== undefined) {
      updateData.dueDate = new Date(body.dueDate);
    }

    const receivable = await prisma.accountReceivable.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(receivable);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.accountReceivable.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.active !== undefined) updateData.active = body.active;

    const costCenter = await prisma.costCenter.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(costCenter);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check usage before deleting
    const usage = await prisma.costCenter.findUnique({
      where: { id },
      include: { _count: { select: { accountReceivables: true, accountPayables: true } } },
    });

    if (usage && (usage._count.accountReceivables > 0 || usage._count.accountPayables > 0)) {
      return NextResponse.json(
        { error: `Centro de custos em uso (${usage._count.accountReceivables + usage._count.accountPayables} registros vinculados). Desative-o em vez de excluir.` },
        { status: 409 }
      );
    }

    await prisma.costCenter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const org = await prisma.organization.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.cnpj !== undefined && { cnpj: body.cnpj || null }),
      ...(body.uf !== undefined && { uf: body.uf || null }),
      ...(body.isAiGenerated !== undefined && { isAiGenerated: body.isAiGenerated }),
    },
  });
  return NextResponse.json(org);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.organization.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

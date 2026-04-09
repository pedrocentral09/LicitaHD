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
      name: body.name,
      cnpj: body.cnpj || null,
      uf: body.uf || null,
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

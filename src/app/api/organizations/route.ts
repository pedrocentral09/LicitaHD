import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { purchaseOrders: true } } },
  });
  return NextResponse.json(orgs);
}

export async function POST(req: Request) {
  const body = await req.json();
  const org = await prisma.organization.create({
    data: {
      name: body.name,
      cnpj: body.cnpj || null,
      uf: body.uf || null,
      isAiGenerated: body.isAiGenerated || false,
    },
  });
  return NextResponse.json(org, { status: 201 });
}

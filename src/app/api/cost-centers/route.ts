import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const costCenters = await prisma.costCenter.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: {
            accountReceivables: true,
            accountPayables: true,
          },
        },
      },
    });
    return NextResponse.json(costCenters);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Código e nome são obrigatórios." }, { status: 400 });
    }

    // Check unique code
    const exists = await prisma.costCenter.findUnique({ where: { code: body.code } });
    if (exists) {
      return NextResponse.json({ error: `Código "${body.code}" já está em uso.` }, { status: 409 });
    }

    const costCenter = await prisma.costCenter.create({
      data: {
        code: body.code.toUpperCase(),
        name: body.name,
        description: body.description || null,
      },
    });

    return NextResponse.json(costCenter, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

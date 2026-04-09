import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const receivables = await prisma.accountReceivable.findMany({
      orderBy: { dueDate: "asc" },
      include: {
        organization: { select: { name: true } },
        purchaseOrder: { select: { documentNumber: true, sellerName: true } }
      },
    });
    return NextResponse.json(receivables);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.title || !body.amount || !body.dueDate || !body.organizationId) {
      return NextResponse.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });
    }

    const receivable = await prisma.accountReceivable.create({
      data: {
        title: body.title,
        amount: parseFloat(body.amount),
        dueDate: new Date(body.dueDate),
        organizationId: body.organizationId,
        purchaseOrderId: body.purchaseOrderId || null,
        status: "PENDING"
      },
    });

    return NextResponse.json(receivable, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

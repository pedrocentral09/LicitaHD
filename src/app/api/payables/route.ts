import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "MERCADORIA",
  "FRETE",
  "IMPOSTO",
  "ALUGUEL",
  "ENERGIA",
  "FOLHA",
  "SERVICO",
  "OUTROS",
] as const;

export async function GET() {
  try {
    // Auto-update overdue
    await prisma.accountPayable.updateMany({
      where: { status: "PENDING", dueDate: { lt: new Date() } },
      data: { status: "OVERDUE" },
    });

    const payables = await prisma.accountPayable.findMany({
      orderBy: { dueDate: "asc" },
      include: {
        organization: { select: { name: true } },
        purchaseOrder: { select: { documentNumber: true } },
        costCenter: { select: { id: true, code: true, name: true } },
      },
    });

    const totalPending = payables
      .filter((p) => p.status === "PENDING")
      .reduce((s, p) => s + p.amount, 0);

    const totalOverdue = payables
      .filter((p) => p.status === "OVERDUE")
      .reduce((s, p) => s + p.amount, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalPaidThisMonth = payables
      .filter((p) => p.status === "PAID" && p.paidAt && new Date(p.paidAt) >= startOfMonth)
      .reduce((s, p) => s + p.amount, 0);

    const totalAll = payables.reduce((s, p) => s + p.amount, 0);

    // Group by category
    const byCategory: Record<string, number> = {};
    payables.forEach((p) => {
      byCategory[p.category] = (byCategory[p.category] || 0) + p.amount;
    });

    return NextResponse.json({
      items: payables,
      categories: CATEGORIES,
      stats: {
        totalPending,
        totalOverdue,
        totalPaidThisMonth,
        totalAll,
        count: payables.length,
        overdueCount: payables.filter((p) => p.status === "OVERDUE").length,
        pendingCount: payables.filter((p) => p.status === "PENDING").length,
        paidCount: payables.filter((p) => p.status === "PAID").length,
        byCategory,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.title || !body.amount || !body.dueDate) {
      return NextResponse.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });
    }

    const payable = await prisma.accountPayable.create({
      data: {
        title: body.title,
        amount: parseFloat(body.amount),
        dueDate: new Date(body.dueDate),
        supplier: body.supplier || null,
        category: body.category || "MERCADORIA",
        notes: body.notes || null,
        organizationId: body.organizationId || null,
        purchaseOrderId: body.purchaseOrderId || null,
        costCenterId: body.costCenterId || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(payable, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

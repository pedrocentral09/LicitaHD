import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { AccountReceivable } from "@prisma/client";

export const dynamic = "force-dynamic";

type ReceivableRow = AccountReceivable;

export async function GET() {
  try {
    // Auto-update overdue status
    await prisma.accountReceivable.updateMany({
      where: {
        status: "PENDING",
        dueDate: { lt: new Date() },
      },
      data: { status: "OVERDUE" },
    });

    const receivables = await prisma.accountReceivable.findMany({
      orderBy: { dueDate: "asc" },
      include: {
        organization: { select: { name: true } },
        purchaseOrder: { select: { documentNumber: true, sellerName: true } },
        shipment: { select: { shipmentNumber: true, invoiceNumber: true, status: true } },
        costCenter: { select: { id: true, code: true, name: true } },
      },
    });

    // Summary stats
    const totalPending = receivables
      .filter((r) => r.status === "PENDING")
      .reduce((s, r) => s + r.amount, 0);

    const totalOverdue = receivables
      .filter((r) => r.status === "OVERDUE")
      .reduce((s, r) => s + r.amount, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalPaidThisMonth = receivables
      .filter((r) => r.status === "PAID" && r.paidAt && new Date(r.paidAt) >= startOfMonth)
      .reduce((s, r) => s + r.amount, 0);

    const totalAll = receivables.reduce((s, r) => s + r.amount, 0);
    const totalPaid = receivables
      .filter((r) => r.status === "PAID")
      .reduce((s, r) => s + r.amount, 0);

    return NextResponse.json({
      items: receivables,
      stats: {
        totalPending,
        totalOverdue,
        totalPaidThisMonth,
        totalAll,
        totalPaid,
        count: receivables.length,
        overdueCount: receivables.filter((r) => r.status === "OVERDUE").length,
        pendingCount: receivables.filter((r) => r.status === "PENDING").length,
        paidCount: receivables.filter((r) => r.status === "PAID").length,
      },
    });
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
        costCenterId: body.costCenterId || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(receivable, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

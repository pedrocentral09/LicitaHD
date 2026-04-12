import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // transaction id
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // accountId => Id de uma AccountPayable ou AccountReceivable
    // type => "PAYABLE" ou "RECEIVABLE"
    const { accountId, type } = body;

    const transaction = await prisma.bankTransaction.findUnique({ where: { id } });
    
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (transaction.status === "RECONCILED") {
      return NextResponse.json({ error: "Transaction already reconciled" }, { status: 400 });
    }

    // Validação estrita de valor (centavo por centavo) conforme exigido:
    if (type === "PAYABLE") {
      const payable = await prisma.accountPayable.findUnique({ where: { id: accountId } });
      if (!payable) return NextResponse.json({ error: "Account Payable not found" }, { status: 404 });
      
      // Checa match absoluto no floating point (com margem minúscula de tolerância para bits de float Javascript)
      if (Math.abs(payable.amount - transaction.amount) > 0.01) {
        return NextResponse.json({ error: "Value mismatch. Exact reconciliation required." }, { status: 400 });
      }

      // Conecta o OFX com a Fatura, e zera a Fatura (marca como PAID)
      await prisma.$transaction([
        prisma.bankTransaction.update({
          where: { id },
          data: { 
            status: "RECONCILED",
            accountPayableId: accountId 
          }
        }),
        prisma.accountPayable.update({
          where: { id: accountId },
          data: { 
            status: "PAID",
            paidAt: transaction.date
          }
        })
      ]);

    } else if (type === "RECEIVABLE") {
      const receivable = await prisma.accountReceivable.findUnique({ where: { id: accountId } });
      if (!receivable) return NextResponse.json({ error: "Account Receivable not found" }, { status: 404 });

      if (Math.abs(receivable.amount - transaction.amount) > 0.01) {
        return NextResponse.json({ error: "Value mismatch. Exact reconciliation required." }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.bankTransaction.update({
          where: { id },
          data: { 
            status: "RECONCILED",
            accountReceivableId: accountId 
          }
        }),
        prisma.accountReceivable.update({
          where: { id: accountId },
          data: { 
            status: "PAID",
            paidAt: transaction.date
          }
        })
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to reconcile", details: error.message }, { status: 500 });
  }
}

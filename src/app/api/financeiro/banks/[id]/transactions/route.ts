import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Lista apenas transações que ainda NÃO foram conciliadas
    const transactions = await prisma.bankTransaction.findMany({
      where: { 
        bankAccountId: id,
        status: "PENDING"
      },
      orderBy: { date: "asc" }
    });

    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

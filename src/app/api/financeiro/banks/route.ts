import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const banks = await prisma.bankAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { transactions: { where: { status: "PENDING" } } }
        }
      }
    });
    return NextResponse.json(banks);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const bank = await prisma.bankAccount.create({
      data: {
        bankName: body.bankName,
        agency: body.agency || null,
        account: body.account,
        accountName: body.accountName,
        balance: body.balance ? parseFloat(body.balance) : 0,
      },
    });
    return NextResponse.json(bank, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 });
  }
}

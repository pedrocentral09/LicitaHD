import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.purchaseItem.findMany({
      where: { taxPercent: null },
      select: { id: true, description: true, costPrice: true, taxPercent: true, procurementId: true },
      take: 5
    });
    const updatedItems = await prisma.purchaseItem.findMany({
      where: { taxPercent: { not: null } },
      select: { id: true, description: true, costPrice: true, taxPercent: true, procurementId: true },
      take: 5
    });
    
    return NextResponse.json({
        nullTaxItems: items,
        updatedTaxItems: updatedItems
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message), stack: e.stack }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = body.id;
  
  try {
      const item = await prisma.purchaseItem.update({
        where: { id },
        data: { taxPercent: body.taxPercent }
      });
      return NextResponse.json({ success: true, item });
  } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
  }
}

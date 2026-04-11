import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.purchaseOrder = {
        issuedAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate + "T23:59:59.999Z") } : {}),
        },
      };
    }

    const items = await prisma.purchaseItem.findMany({
      where: {
        costPrice: { not: null },
        active: true,
        ...dateFilter,
      },
      include: {
        purchaseOrder: {
          select: {
            documentNumber: true,
            status: true,
            issuedAt: true,
            organization: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { description: "asc" }
    });

    const report = items.map((item) => {
      const cost = item.costPrice ?? 0;
      const tax = item.taxPercent ?? 0;
      const sell = item.unitPriceReturn;
      const taxAmount = sell * (tax / 100);
      const totalCost = cost + taxAmount;
      const margin = sell > 0 ? ((sell - totalCost) / sell) * 100 : 0;

      return {
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPriceReturn: sell,
        costPrice: cost,
        taxPercent: tax,
        totalCost,
        margin: Math.round(margin * 100) / 100,
        totalSell: sell * item.quantity,
        totalCostAmount: totalCost * item.quantity,
        profit: (sell - totalCost) * item.quantity,
        orgName: item.purchaseOrder?.organization?.name ?? "-",
        ocNumber: item.purchaseOrder?.documentNumber ?? "-",
        ocStatus: item.purchaseOrder?.status ?? "-",
        issuedAt: item.purchaseOrder?.issuedAt,
      };
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("[MarginsReport API]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

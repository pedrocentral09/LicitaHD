import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const receivable = await prisma.accountReceivable.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true, cnpj: true } },
        purchaseOrder: {
          select: {
            id: true,
            documentNumber: true,
            sellerName: true,
            issuedAt: true,
            status: true,
            items: {
              select: {
                id: true,
                description: true,
                quantity: true,
                unitPriceReturn: true,
                costPrice: true,
                taxPercent: true,
                invoiceNumber: true,
              },
            },
          },
        },
        shipment: {
          include: {
            items: {
              include: {
                purchaseItem: {
                  select: {
                    description: true,
                    quantity: true,
                    unitPriceReturn: true,
                    costPrice: true,
                    taxPercent: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!receivable) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    // Calculate financial metrics from shipment items (if linked to shipment)
    const shipmentItems = receivable.shipment?.items || [];
    let totalRevenue = 0;
    let totalCost = 0;
    let totalTax = 0;

    const itemDetails = shipmentItems.map((si) => {
      const sell = si.quantity * si.purchaseItem.unitPriceReturn;
      const cost = si.quantity * (si.purchaseItem.costPrice || 0);
      const taxPct = si.purchaseItem.taxPercent || 0;
      const taxAmt = sell * (taxPct / 100);
      const profit = sell - cost - taxAmt;
      const margin = sell > 0 ? (profit / sell) * 100 : 0;

      totalRevenue += sell;
      totalCost += cost;
      totalTax += taxAmt;

      return {
        description: si.purchaseItem.description,
        quantity: si.quantity,
        unitPrice: si.purchaseItem.unitPriceReturn,
        costPrice: si.purchaseItem.costPrice || 0,
        taxPercent: taxPct,
        totalSell: sell,
        totalCostAmount: cost,
        taxAmount: taxAmt,
        profit,
        margin: Math.round(margin * 100) / 100,
      };
    });

    // If no shipment, calculate from OC items
    if (itemDetails.length === 0 && receivable.purchaseOrder) {
      receivable.purchaseOrder.items.forEach((item) => {
        const sell = item.quantity * item.unitPriceReturn;
        const cost = item.quantity * (item.costPrice || 0);
        const taxPct = item.taxPercent || 0;
        const taxAmt = sell * (taxPct / 100);
        const profit = sell - cost - taxAmt;
        const margin = sell > 0 ? (profit / sell) * 100 : 0;

        totalRevenue += sell;
        totalCost += cost;
        totalTax += taxAmt;

        itemDetails.push({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPriceReturn,
          costPrice: item.costPrice || 0,
          taxPercent: taxPct,
          totalSell: sell,
          totalCostAmount: cost,
          taxAmount: taxAmt,
          profit,
          margin: Math.round(margin * 100) / 100,
        });
      });
    }

    const totalProfit = totalRevenue - totalCost - totalTax;
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      ...receivable,
      financial: {
        items: itemDetails,
        totalRevenue,
        totalCost,
        totalTax,
        totalProfit,
        overallMargin: Math.round(overallMargin * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error("[Receivable Detail Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

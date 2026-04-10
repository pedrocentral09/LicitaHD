import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const item = await prisma.purchaseItem.update({
    where: { id },
    data: {
      costPrice: body.costPrice !== undefined ? body.costPrice : undefined,
      taxPercent: body.taxPercent !== undefined ? body.taxPercent : undefined,
      conversionFactor: body.conversionFactor !== undefined ? body.conversionFactor : undefined,
      expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : undefined,
      expectedCustomerDelivery: body.expectedCustomerDelivery ? new Date(body.expectedCustomerDelivery) : undefined,
      buyingLocation: body.buyingLocation !== undefined ? body.buyingLocation : undefined,
      ownership: body.ownership !== undefined ? body.ownership : undefined,
      invoiceNumber: body.invoiceNumber !== undefined ? (body.invoiceNumber || null) : undefined,
    },
  });

  return NextResponse.json({ success: true, item });
}

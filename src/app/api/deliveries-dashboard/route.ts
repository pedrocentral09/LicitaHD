import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: {
        purchaseOrders: {
          where: {
            status: "QUOTED"
          },
          orderBy: { documentNumber: "asc" },
          include: {
            items: true
          }
        }
      }
    });

    // Filter out organizations that have no OCs waiting for delivery
    const activeOrgs = organizations.filter((org: any) => org.purchaseOrders.length > 0);

    return NextResponse.json(activeOrgs);
  } catch (error) {
    console.error("[DeliveriesDashboard API]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

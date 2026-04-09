import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "inbound";
    const statusFilter = type === "outbound" ? "RECEIVED" : "QUOTED";

    const organizations = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: {
        purchaseOrders: {
          where: {
            status: statusFilter
          },
          orderBy: { documentNumber: "asc" },
          include: {
            items: true
          }
        }
      }
    });

    // Filter out organizations that have no OCs waiting for delivery in this phase
    const activeOrgs = organizations.filter((org: any) => org.purchaseOrders.length > 0);

    return NextResponse.json(activeOrgs);
  } catch (error) {
    console.error("[DeliveriesDashboard API]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

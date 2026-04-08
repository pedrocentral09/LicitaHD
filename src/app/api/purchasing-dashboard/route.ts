import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: {
        procurementGroups: {
          orderBy: { description: "asc" },
          include: {
            items: {
              where: {
                purchaseOrder: {
                  status: { notIn: ["CANCELED", "QUOTED", "DELIVERED"] }
                }
              },
              include: {
                purchaseOrder: { select: { documentNumber: true, id: true, status: true } }
              }
            }
          }
        },
        purchaseOrders: {
          where: {
            status: { notIn: ["CANCELED", "QUOTED", "DELIVERED"] }
          },
          orderBy: { documentNumber: "asc" },
          include: {
            items: true
          }
        }
      }
    });

    // 1. Map to remove procurement groups that have 0 valid items
    // 2. Filter out organizations that have no active OCs or groups
    const activeOrgs = organizations
      .map((org: any) => ({
        ...org,
        procurementGroups: org.procurementGroups.filter((g: any) => g.items.length > 0)
      }))
      .filter((org: any) => org.purchaseOrders.length > 0 || org.procurementGroups.length > 0);

    return NextResponse.json(activeOrgs);
  } catch (error) {
    console.error("[PurchasingDashboard API]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

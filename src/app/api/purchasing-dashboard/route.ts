import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
                costPrice: null, // Itens SEM custo → ainda em cotação
                purchaseOrder: {
                  status: { notIn: ["CANCELED", "DELIVERED"] }
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
            status: { notIn: ["CANCELED", "DELIVERED"] },
            // Só mostra OCs que tenham pelo menos 1 item sem custo
            items: { some: { costPrice: null } }
          },
          orderBy: { documentNumber: "asc" },
          include: {
            items: {
              where: { costPrice: null } // Só traz itens sem custo
            }
          }
        }
      }
    });

    // Remove procurement groups vazios e orgs sem dados
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

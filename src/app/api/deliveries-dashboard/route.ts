import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Busca OCs que tenham itens COM custo preenchido (prontos pra logística)
    // e que não estejam canceladas ou totalmente entregues
    const organizations = await prisma.organization.findMany({
      orderBy: { name: "asc" },
      include: {
        purchaseOrders: {
          where: {
            status: { notIn: ["CANCELED", "DELIVERED", "DRAFT"] },
            items: { some: { costPrice: { not: null } } }
          },
          orderBy: { documentNumber: "asc" },
          include: {
            items: {
              where: { costPrice: { not: null } }, // Só traz itens com custo
              include: {
                shipmentItems: {
                  include: {
                    shipment: {
                      select: { id: true, status: true, shipmentNumber: true }
                    }
                  }
                }
              }
            },
            shipments: {
              orderBy: { shipmentNumber: "asc" },
              include: {
                items: {
                  include: {
                    purchaseItem: {
                      select: { description: true, quantity: true, unitPriceReturn: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Filter out orgs with no qualifying OCs
    const activeOrgs = organizations.filter((org: any) => org.purchaseOrders.length > 0);

    return NextResponse.json(activeOrgs);
  } catch (error) {
    console.error("[DeliveriesDashboard API]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

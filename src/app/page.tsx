import { prisma } from "@/lib/prisma";
import {
  FileText,
  Building2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getStats() {
  const [totalOrders, totalOrgs, draftOrders, validatedOrders, validItems] = await Promise.all([
    prisma.purchaseOrder.count(),
    prisma.organization.count(),
    prisma.purchaseOrder.count({ where: { status: "DRAFT" } }),
    prisma.purchaseOrder.count({ where: { status: "VALIDATED" } }),
    prisma.purchaseItem.findMany({
      where: {
        purchaseOrder: {
          status: { in: ["VALIDATED", "QUOTED", "DELIVERED"] }
        }
      },
      select: { quantity: true, unitPriceReturn: true, costPrice: true }
    })
  ]);

  const totalSalesValue = validItems.reduce((acc, item) => acc + (item.quantity * item.unitPriceReturn), 0);
  const totalCostValue = validItems.reduce((acc, item) => acc + (item.quantity * (item.costPrice || 0)), 0);
  const totalProfitValue = totalSalesValue - totalCostValue;

  return { totalOrders, totalOrgs, draftOrders, validatedOrders, totalSalesValue, totalProfitValue };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "GOD";

  const stats = await getStats();

  const formattedTotalSales = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(stats.totalSalesValue);

  const formattedProfit = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(stats.totalProfitValue);

  const profitMargin = stats.totalSalesValue > 0 
    ? ((stats.totalProfitValue / stats.totalSalesValue) * 100).toFixed(1) 
    : "0.0";

  const cards: any[] = [
    {
      label: "Vendas Totais",
      value: formattedTotalSales,
      icon: DollarSign,
      color: "from-emerald-500 to-teal-500",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
      span2: true, // we'll use this to make it wider if needed
    },
    {
      label: "Total de OCs",
      value: stats.totalOrders,
      icon: FileText,
      color: "from-indigo-500 to-indigo-600",
      bgLight: "bg-indigo-50",
      textColor: "text-indigo-700",
    },
    {
      label: "Órgãos Cadastrados",
      value: stats.totalOrgs,
      icon: Building2,
      color: "from-sky-500 to-sky-600",
      bgLight: "bg-sky-50",
      textColor: "text-sky-700",
    },
    {
      label: "Aguardando Validação",
      value: stats.draftOrders,
      icon: AlertTriangle,
      color: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50",
      textColor: "text-amber-700",
    },
    {
      label: "Prontas p/ Cotação",
      value: stats.validatedOrders,
      icon: TrendingUp,
      color: "from-violet-500 to-violet-600",
      bgLight: "bg-violet-50",
      textColor: "text-violet-700",
    },
  ];

  if (isAdmin) {
    cards.splice(1, 0, {
      label: "Lucratividade Bruta",
      value: formattedProfit,
      icon: PieChart,
      color: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-700",
      span2: true,
      subtitle: `Margem: ${profitMargin}%`,
      subtitleColor: "text-blue-600"
    });
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Visão geral do Hub de Licitações
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={cn(
              "relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
              card.span2 && "lg:col-span-4 xl:col-span-2"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{card.value}</p>
                {card.subtitle && (
                  <p className={cn("mt-1.5 text-xs font-semibold", card.subtitleColor || "text-zinc-500")}>
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bgLight}`}>
                <card.icon className={`h-6 w-6 ${card.textColor}`} />
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${card.color}`} />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="/ingestao"
            className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 p-4 transition-all hover:border-indigo-400 hover:bg-indigo-50/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">Importar OC</p>
              <p className="text-xs text-zinc-500">Upload de PDF via IA</p>
            </div>
          </a>
          <a
            href="/orgaos"
            className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 p-4 transition-all hover:border-emerald-400 hover:bg-emerald-50/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">Novo Órgão</p>
              <p className="text-xs text-zinc-500">Cadastrar prefeitura</p>
            </div>
          </a>
          <a
            href="/kanban"
            className="flex items-center gap-3 rounded-lg border border-dashed border-zinc-300 p-4 transition-all hover:border-violet-400 hover:bg-violet-50/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">Ver Kanban</p>
              <p className="text-xs text-zinc-500">Acompanhar pedidos</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

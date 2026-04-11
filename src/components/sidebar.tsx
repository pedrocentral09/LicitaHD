"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Upload,
  Kanban,
  ShoppingCart,
  AlertTriangle,
  FileText,
  Building2,
  Truck,
  LogOut,
  Users,
  Database,
  BarChart3,
  FolderTree
} from "lucide-react";
import { cn } from "@/lib/utils";

// Categorias reorganizadas
const navCategories = [
  {
    title: "VISÃO GERAL",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        roles: ["GOD", "OPERATOR", "BUYER", "LOGISTICS"]
      },
      {
        label: "Alertas de Margem",
        href: "/alertas",
        icon: AlertTriangle,
        roles: ["GOD", "BUYER"]
      },
    ]
  },
  {
    title: "OPERAÇÕES & VENDAS",
    items: [
      {
        label: "Ingestão IA",
        href: "/ingestao",
        icon: Upload,
        roles: ["GOD", "OPERATOR"]
      },
      {
        label: "Ordens de Compra",
        href: "/ordens",
        icon: Database,
        roles: ["GOD", "OPERATOR", "BUYER", "LOGISTICS"]
      },
      {
        label: "Kanban de OCs",
        href: "/kanban",
        icon: Kanban,
        roles: ["GOD", "OPERATOR", "BUYER", "LOGISTICS"]
      },
      {
        label: "Painel de Compras",
        href: "/compras",
        icon: ShoppingCart,
        roles: ["GOD", "BUYER"]
      },
      {
        label: "Entregas",
        href: "/entregas",
        icon: Truck,
        roles: ["GOD", "LOGISTICS"]
      },
    ]
  },
  {
    title: "FINANCEIRO",
    items: [
      {
        label: "Contas a Receber",
        href: "/contas-receber",
        icon: FileText,
        roles: ["GOD", "OPERATOR", "BUYER"]
      },
      {
        label: "Contas a Pagar",
        href: "/contas-pagar",
        icon: FileText,
        roles: ["GOD", "OPERATOR", "BUYER"]
      },
      {
        label: "Reequilíbrio",
        href: "/reequilibrio",
        icon: FileText,
        roles: ["GOD", "BUYER"]
      },
      {
        label: "Relatório de Margens",
        href: "/margens",
        icon: BarChart3,
        roles: ["GOD", "BUYER"]
      },
      {
        label: "Centros de Custo",
        href: "/centros-custo",
        icon: FolderTree,
        roles: ["GOD", "OPERATOR"]
      },
    ]
  },
  {
    title: "CADASTROS & ADMIN",
    items: [
      {
        label: "Órgãos / Prefeituras",
        href: "/orgaos",
        icon: Building2,
        roles: ["GOD", "OPERATOR", "BUYER"]
      },
      {
        label: "Controle de Usuários",
        href: "/usuarios",
        icon: Users,
        roles: ["GOD"]
      },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const userRole = session.user?.role || "OPERATOR";
  const userInitials = session.user?.name?.substring(0, 2).toUpperCase() || "US";

  if (pathname === "/login") return null;

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 px-6 sticky top-0 bg-white z-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-sm">
          HL
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-900">Hub Licitações</h1>
          <p className="text-[11px] text-zinc-400">Organizador Inteligente</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 p-4">
        {navCategories.map((category) => {
          const visibleItems = category.items.filter((item) => item.roles.includes(userRole));
          
          if (visibleItems.length === 0) return null;

          return (
            <div key={category.title}>
              <h3 className="mb-2 px-3 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                {category.title}
              </h3>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-indigo-50 text-indigo-700 shadow-sm"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-600" : "text-zinc-400")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="border-t border-zinc-200 p-4 shrink-0 bg-white sticky bottom-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-zinc-900 truncate max-w-[100px]">{session.user?.name}</p>
              <p className="text-[11px] text-zinc-400">{userRole}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="p-2 bg-zinc-50 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-md transition-colors shrink-0"
            title="Sair do sistema"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

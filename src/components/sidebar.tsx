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
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

// Definimos os robôs (roles) permitidos para cada tela
const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["GOD", "OPERATOR", "BUYER", "LOGISTICS"]
  },
  {
    label: "Órgãos / Prefeituras",
    href: "/orgaos",
    icon: Building2,
    roles: ["GOD", "OPERATOR", "BUYER"]
  },
  {
    label: "Ingestão IA",
    href: "/ingestao",
    icon: Upload,
    roles: ["GOD", "OPERATOR"]
  },
  {
    label: "Controle de Usuários",
    href: "/usuarios",
    icon: Users,
    roles: ["GOD"]
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
  {
    label: "Alertas de Margem",
    href: "/alertas",
    icon: AlertTriangle,
    roles: ["GOD", "BUYER"]
  },
  {
    label: "Reequilíbrio",
    href: "/reequilibrio",
    icon: FileText,
    roles: ["GOD", "BUYER"]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null; // Não renderiza nada se não tiver logado (o middleware protegerá também)

  const userRole = session.user?.role || "OPERATOR";
  const userInitials = session.user?.name?.substring(0, 2).toUpperCase() || "US";

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-sm">
          HL
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-900">Hub Licitações</h1>
          <p className="text-[11px] text-zinc-400">Organizador Inteligente</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.filter(item => item.roles.includes(userRole)).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
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
      </nav>

      {/* Footer / User Profile */}
      <div className="border-t border-zinc-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600">
              {userInitials}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">{session.user?.name}</p>
              <p className="text-[11px] text-zinc-400">{userRole}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="p-2 bg-zinc-50 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-md transition-colors"
            title="Sair do sistema"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

"use client";

import { useState, useEffect } from "react";
import { FileText, Building2, Eye, Trash2, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceReturn: number;
}

interface Order {
  id: string;
  documentNumber: string;
  status: string;
  createdAt: string;
  issuedAt: string | null;
  organization: { name: string };
  operatorName: string | null;
  items: OrderItem[];
}

const columns = [
  { key: "DRAFT", label: "Rascunho", color: "border-amber-400", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  { key: "VALIDATED", label: "Validada", color: "border-indigo-400", bg: "bg-indigo-50", badge: "bg-indigo-100 text-indigo-700" },
  { key: "QUOTED", label: "Cotada", color: "border-emerald-400", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
  { key: "DELIVERED", label: "Entregue", color: "border-zinc-400", bg: "bg-zinc-50", badge: "bg-zinc-200 text-zinc-700" },
];

export function KanbanBoard() {
  const { data: session } = useSession();
  const isGod = session?.user?.role === "GOD";

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadOrders() {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm("AÇÃO GOD: Tem certeza que deseja destruir esta ordem de compra permanentemente?")) {
      setDeletingId(id);
      await fetch(`/api/orders/${id}`, { method: "DELETE" });
      setDeletingId(null);
      loadOrders();
    }
  }

  async function moveOrder(id: string, newStatus: string) {
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadOrders();
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className="flex flex-col">
              {/* Column Header */}
              <div className={`mb-3 flex items-center gap-2 rounded-lg border-l-4 ${col.color} ${col.bg} px-4 py-2.5`}>
                <span className="text-sm font-semibold text-zinc-800">{col.label}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${col.badge}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3 min-h-[200px]">
                {colOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer relative"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <span className="text-xs font-bold text-zinc-900">
                          {order.documentNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isGod && (
                          <button
                            onClick={(e) => handleDelete(order.id, e)}
                            disabled={deletingId === order.id}
                            className="p-1 text-zinc-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="GOD: Deletar OC Permanentemente"
                          >
                            {deletingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <Eye className="h-3.5 w-3.5 text-zinc-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Building2 className="h-3 w-3 text-zinc-400" />
                      <span className="text-xs text-zinc-600 truncate">
                        {order.organization.name}
                      </span>
                    </div>

                    {order.operatorName && (
                       <div className="mb-2">
                         <span className="inline-block px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 text-[9px] font-bold text-zinc-500 rounded">
                           OP: {order.operatorName.substring(0,2).toUpperCase()}
                         </span>
                       </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">
                        {order.items.length} item(ns)
                      </span>
                      <span className="text-[11px] font-medium text-emerald-600">
                        R$ {order.items.reduce((s, i) => s + i.quantity * i.unitPriceReturn, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
                {colOrders.length === 0 && (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-200 py-10 text-xs text-zinc-400">
                    Nenhuma OC
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-zinc-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">
                    OC {selectedOrder.documentNumber}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {selectedOrder.organization.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="pb-2 text-left text-xs font-medium text-zinc-500">Descrição</th>
                    <th className="pb-2 text-right text-xs font-medium text-zinc-500">Qtd</th>
                    <th className="pb-2 text-right text-xs font-medium text-zinc-500">Vlr Unit (R$)</th>
                    <th className="pb-2 text-right text-xs font-medium text-zinc-500">Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-zinc-900 max-w-[250px] truncate">{item.description}</td>
                      <td className="py-2.5 text-right text-zinc-700">{item.quantity.toLocaleString("pt-BR")}</td>
                      <td className="py-2.5 text-right text-zinc-700">{item.unitPriceReturn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 text-right font-medium text-zinc-900">
                        {(item.quantity * item.unitPriceReturn).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between border-t border-zinc-200 p-6">
              <div className="flex gap-2">
                {selectedOrder.status === "DRAFT" && (
                  <button
                    onClick={() => {
                      moveOrder(selectedOrder.id, "VALIDATED");
                      setSelectedOrder(null);
                    }}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Validar OC
                  </button>
                )}
                {selectedOrder.status === "VALIDATED" && (
                  <button
                    onClick={() => {
                      moveOrder(selectedOrder.id, "QUOTED");
                      setSelectedOrder(null);
                    }}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Marcar como Cotada
                  </button>
                )}
                {selectedOrder.status === "QUOTED" && (
                  <button
                    onClick={() => {
                      moveOrder(selectedOrder.id, "DELIVERED");
                      setSelectedOrder(null);
                    }}
                    className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Marcar como Entregue
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

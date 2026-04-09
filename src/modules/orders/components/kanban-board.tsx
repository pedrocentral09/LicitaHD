"use client";

import { useState, useEffect } from "react";
import { FileText, Building2, Eye, Trash2, Loader2, Edit2, Check, X } from "lucide-react";
import { useSession } from "next-auth/react";

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceReturn: number;
  costPrice?: number | null;
  taxPercent?: number | null;
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
  { key: "DRAFT", label: "Triagem", color: "border-zinc-300", bg: "bg-white", badge: "bg-zinc-100 text-zinc-600" },
  { key: "VALIDATED", label: "P/ Cotação", color: "border-indigo-300", bg: "bg-indigo-50/50", badge: "bg-indigo-100 text-indigo-700" },
  { key: "QUOTED", label: "Ag. Sede", color: "border-amber-300", bg: "bg-amber-50/50", badge: "bg-amber-100 text-amber-700" },
  { key: "RECEIVED", label: "Estocado", color: "border-sky-300", bg: "bg-sky-50/50", badge: "bg-sky-100 text-sky-700" },
  { key: "DELIVERED", label: "Entregue Final", color: "border-emerald-300", bg: "bg-emerald-50/50", badge: "bg-emerald-100 text-emerald-700" },
];

export function KanbanBoard() {
  const { data: session } = useSession();
  const isGod = session?.user?.role === "GOD";

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit Mode States
  const [editMode, setEditMode] = useState(false);
  const [editDoc, setEditDoc] = useState("");
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  function openModal(order: Order) {
    setSelectedOrder(order);
    setEditMode(false);
    setEditDoc(order.documentNumber);
    // Deep clone the items for safe editing
    setEditItems(JSON.parse(JSON.stringify(order.items)));
  }

  async function saveEdits() {
    if (!selectedOrder) return;
    setSavingEdit(true);
    await fetch(`/api/orders/${selectedOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentNumber: editDoc,
        items: editItems
      })
    });
    setSavingEdit(false);
    setEditMode(false);
    setSelectedOrder(null);
    loadOrders();
  }

  async function loadOrders() {
    const res = await fetch(`/api/orders?_t=${new Date().getTime()}`, {
      cache: "no-store",
    });
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
                    onClick={() => openModal(order)}
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
          <div className="bg-white rounded-xl shadow-2xl w-11/12 max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-zinc-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  {editMode ? (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-zinc-900">OC</span>
                      <input 
                        type="text" 
                        value={editDoc}
                        onChange={(e) => setEditDoc(e.target.value)}
                        className="border border-zinc-300 rounded px-2 py-1 text-sm font-bold text-zinc-900 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                      OC {selectedOrder.documentNumber}
                      <button onClick={() => setEditMode(true)} className="p-1 text-zinc-400 hover:text-indigo-600 ml-1 bg-zinc-100 rounded" title="Editar OC">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </h3>
                  )}
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
                    <th className="pb-2 text-right text-xs font-medium text-zinc-500">Vlr Venda (R$)</th>
                    <th className="pb-2 text-right text-xs font-medium text-zinc-500">Custo (R$)</th>
                    <th className="pb-2 text-right text-xs font-medium text-zinc-500">Imposto</th>
                    <th className="pb-2 text-center text-xs font-medium text-zinc-500">Margem (%)</th>
                    <th className="pb-2 text-right text-xs font-medium text-zinc-500">Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {editMode 
                    ? editItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="py-2.5">
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[index].description = e.target.value;
                              setEditItems(newItems);
                            }}
                            className="w-full text-zinc-900 text-sm border border-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input 
                            type="number" 
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[index].quantity = Number(e.target.value) || 0;
                              setEditItems(newItems);
                            }}
                            className="w-full min-w-[60px] text-right text-zinc-700 text-sm border border-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input 
                            type="number" 
                            step="0.01"
                            value={item.unitPriceReturn}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[index].unitPriceReturn = Number(e.target.value) || 0;
                              setEditItems(newItems);
                            }}
                            className="w-full min-w-[80px] text-right text-zinc-700 text-sm border border-zinc-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
                          />
                        </td>
                        <td className="py-2.5 text-right font-medium text-amber-600 bg-amber-50/50 pr-2">
                          {(item.quantity * item.unitPriceReturn).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                    : selectedOrder.items.map((item) => {
                      let itemMargin: number | null = null;
                      const safeTaxPercent = Number.isNaN(Number(item.taxPercent)) ? 0 : Number(item.taxPercent);
                      const safeCostPrice = Number.isNaN(Number(item.costPrice)) ? 0 : Number(item.costPrice);

                      if (safeCostPrice > 0) {
                         const taxAmount = item.unitPriceReturn * (safeTaxPercent / 100);
                         const custoTotal = safeCostPrice + taxAmount;
                         if (item.unitPriceReturn > 0) {
                           const margin = ((item.unitPriceReturn - custoTotal) / item.unitPriceReturn) * 100;
                           if (!Number.isNaN(margin) && isFinite(margin)) {
                             itemMargin = margin;
                           }
                         }
                      }

                      return (
                        <tr key={item.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors">
                          <td className="p-4 text-zinc-900 font-medium">{item.description}</td>
                          <td className="p-4 text-right text-zinc-700">{item.quantity.toLocaleString("pt-BR")}</td>
                          <td className="p-4 text-right text-zinc-700">{item.unitPriceReturn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 text-right text-zinc-700">{safeCostPrice > 0 ? safeCostPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "-"}</td>
                          <td className="p-4 text-right text-zinc-700">{item.taxPercent !== null && !Number.isNaN(item.taxPercent) ? `${String(item.taxPercent).replace('.', ',')}%` : "0%"}</td>
                          <td className="p-4 text-center">
                            {itemMargin !== null ? (
                              <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full ${itemMargin >= 15 ? 'bg-emerald-100 text-emerald-700' : itemMargin >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                {itemMargin.toFixed(1).replace('.', ',')}%
                              </span>
                            ) : <span className="text-zinc-400 text-xs">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                {!editMode && selectedOrder.items.length > 0 && (() => {
                  let totalSales = 0;
                  let totalCostAmt = 0;
                  
                  selectedOrder.items.forEach(item => {
                    const sale = item.quantity * item.unitPriceReturn;
                    totalSales += sale;
                    
                    const safeTaxPercent = Number.isNaN(Number(item.taxPercent)) ? 0 : Number(item.taxPercent);
                    const safeCostPrice = Number.isNaN(Number(item.costPrice)) ? 0 : Number(item.costPrice);
                    
                    if (safeCostPrice > 0) {
                      const taxAmount = item.unitPriceReturn * (safeTaxPercent / 100);
                      const custoTotal = safeCostPrice + taxAmount;
                      totalCostAmt += item.quantity * custoTotal;
                    }
                  });
                  
                  const totalProfit = totalSales - totalCostAmt;
                  const overallMargin = totalSales > 0 && totalCostAmt > 0 ? (totalProfit / totalSales) * 100 : 0;
                  
                  return (
                    <tfoot className="bg-zinc-50 font-bold text-zinc-900 border-t-2 border-zinc-200">
                      <tr>
                        <td colSpan={2} className="p-4 text-right">TOTALIZADORES:</td>
                        <td className="p-4 text-right text-indigo-700">Venda: {totalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-right text-rose-700">Custo: {totalCostAmt > 0 ? totalCostAmt.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "-"}</td>
                        <td className="p-4"></td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded-full uppercase tracking-wider ${overallMargin >= 15 ? 'bg-emerald-100 text-emerald-800' : overallMargin >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                            {overallMargin.toFixed(1).replace('.', ',')}%
                          </span>
                        </td>
                        <td className="p-4 text-right text-emerald-700">
                           Lucro: {totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>

            <div className="flex justify-between border-t border-zinc-200 p-6">
              <div className="flex gap-2 flex-wrap">
                {editMode ? (
                  <>
                    <button
                      onClick={saveEdits}
                      disabled={savingEdit}
                      className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-bold text-white hover:bg-emerald-700 flex items-center gap-2"
                    >
                      {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Salvar Alterações
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEditDoc(selectedOrder.documentNumber);
                        setEditItems(JSON.parse(JSON.stringify(selectedOrder.items)));
                      }}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancelar Edição
                    </button>
                  </>
                ) : (
                  <>
                    {/* ADVANCE BUTTONS */}
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
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                      >
                        Mandar para Compras
                      </button>
                    )}
                    {selectedOrder.status === "QUOTED" && (
                      <button
                        onClick={() => {
                          moveOrder(selectedOrder.id, "RECEIVED");
                          setSelectedOrder(null);
                        }}
                        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                      >
                        Marcar Recebimento na Sede
                      </button>
                    )}
                    {selectedOrder.status === "RECEIVED" && (
                      <button
                        onClick={() => {
                          moveOrder(selectedOrder.id, "DELIVERED");
                          setSelectedOrder(null);
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        Concluir Entrega ao Cliente
                      </button>
                    )}

                    {/* REGRESS BUTTONS */}
                    {selectedOrder.status === "VALIDATED" && (
                      <button
                        onClick={() => {
                          moveOrder(selectedOrder.id, "DRAFT");
                          setSelectedOrder(null);
                        }}
                        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Desfazer (Voltar para Triagem)
                      </button>
                    )}
                    {selectedOrder.status === "QUOTED" && (
                      <button
                        onClick={() => {
                          moveOrder(selectedOrder.id, "VALIDATED");
                          setSelectedOrder(null);
                        }}
                        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Desfazer (Voltar para Validada)
                      </button>
                    )}
                    {selectedOrder.status === "RECEIVED" && (
                      <button
                        onClick={() => {
                          moveOrder(selectedOrder.id, "QUOTED");
                          setSelectedOrder(null);
                        }}
                        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Desfazer (Voltar para Compras)
                      </button>
                    )}
                    {selectedOrder.status === "DELIVERED" && (
                      <button
                        onClick={() => {
                          moveOrder(selectedOrder.id, "RECEIVED");
                          setSelectedOrder(null);
                        }}
                        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Desfazer (Voltar para Estoque)
                      </button>
                    )}
                  </>
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

"use client";

import React, { useState, useEffect } from "react";
import { FileText, Building2, Eye, EyeOff, Trash2, Edit2, Loader2, Check, X, Plus, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useSession } from "next-auth/react";

interface OrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceReturn: number;
  costPrice?: number | null;
  taxPercent?: number | null;
  active?: boolean;
}

interface Order {
  id: string;
  documentNumber: string;
  status: string;
  createdAt: string;
  issuedAt: string | null;
  organization: { name: string };
  operatorName: string | null;
  margin?: number | null;
  items: OrderItem[];
}

export function OrdensPanel() {
  const { data: session } = useSession();
  const isGod = session?.user?.role === "GOD";

  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit Mode States
  const [editMode, setEditMode] = useState(false);
  const [editDoc, setEditDoc] = useState("");
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Accordion State
  const [expandedOrgs, setExpandedOrgs] = useState<Record<string, boolean>>({});

  function toggleOrg(orgName: string) {
    setExpandedOrgs(prev => ({ ...prev, [orgName]: !prev[orgName] }));
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

  function openModal(order: Order) {
    setSelectedOrder(order);
    setEditMode(false);
    setEditDoc(order.documentNumber);
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

  function addNewItemRow() {
    setEditItems([
      ...editItems,
      {
        id: `new-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPriceReturn: 0,
        active: true
      }
    ]);
  }

  function removeItemRow(idToRemove: string) {
    if (window.confirm("Remover este item da Ordem de Compra?")) {
      setEditItems(editItems.filter(i => i.id !== idToRemove));
    }
  }

  function toggleItemActive(idToToggle: string) {
    setEditItems(editItems.map(i => i.id === idToToggle ? { ...i, active: i.active !== undefined ? !i.active : false } : i));
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm("AÇÃO GOD: Tem certeza que deseja destruir esta ordem de compra permanentemente?")) {
      setDeletingId(id);
      await fetch(`/api/orders/${id}`, { method: "DELETE" });
      setDeletingId(null);
      loadOrders();
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por número da OC ou nome do orgão..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
            <tr>
              <th className="px-6 py-4">OC</th>
              <th className="px-6 py-4">Órgão</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Volumes</th>
              <th className="px-6 py-4 text-right">Valor Total (R$)</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(() => {
              if (orders.length === 0) {
                return (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-zinc-400">
                      Nenhuma Ordem de Compra importada ainda.
                    </td>
                  </tr>
                );
              }

              // Apply search filter
              const filteredOrders = orders.filter(o => 
                o.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                o.organization.name.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (filteredOrders.length === 0) {
                return (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-zinc-400">
                      Nenhuma ordem encontrada para a pesquisa: {searchTerm}
                    </td>
                  </tr>
                );
              }

              // Group orders by organization
              const groupedOrders = filteredOrders.reduce<{ [key: string]: typeof orders }>((acc, order) => {
                const orgName = order.organization.name;
                if (!acc[orgName]) acc[orgName] = [];
                acc[orgName].push(order);
                return acc;
              }, {});

              return Object.entries(groupedOrders).map(([orgName, orgOrders]) => (
                <React.Fragment key={orgName}>
                  {/* Group Header Row */}
                  <tr 
                    className="bg-zinc-100/80 cursor-pointer hover:bg-zinc-200/50 transition"
                    onClick={() => toggleOrg(orgName)}
                  >
                    <td colSpan={6} className="px-6 py-4 font-semibold text-zinc-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expandedOrgs[orgName] ? <ChevronDown className="w-5 h-5 text-zinc-400" /> : <ChevronRight className="w-5 h-5 text-zinc-400" />}
                          <Building2 className="w-5 h-5 text-indigo-500" />
                          <span className="text-base">{orgName}</span>
                          <span className="ml-2 px-2.5 py-0.5 rounded flex items-center justify-center bg-indigo-100 text-xs text-indigo-700 font-bold uppercase tracking-wider">
                            {orgOrders.length} {orgOrders.length === 1 ? 'Ordem' : 'Ordens'}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Order Rows */}
                  {expandedOrgs[orgName] && orgOrders.map((order) => {
                    const totalAmount = order.items.reduce((s, i) => s + (i.quantity * i.unitPriceReturn), 0);
                    
                    const statusColors: any = {
                      DRAFT: "bg-zinc-100 text-zinc-600",
                      VALIDATED: "bg-indigo-100 text-indigo-700",
                      QUOTED: "bg-amber-100 text-amber-700",
                      RECEIVED: "bg-sky-100 text-sky-700",
                      DELIVERED: "bg-emerald-100 text-emerald-700",
                    };

                    return (
                      <tr key={order.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-zinc-900 border-l-4 border-transparent hover:border-indigo-500 pl-10">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            {order.documentNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-zinc-500 text-xs truncate max-w-[200px]">
                          {orgName}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 w-fit">
                            <span className={`px-2 py-1 flex items-center text-xs font-bold rounded-md ${statusColors[order.status] || "bg-zinc-100 text-zinc-700"}`}>
                              {order.status}
                            </span>
                            {order.margin !== null && order.margin !== undefined && (
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center justify-center shadow-sm ${order.margin >= 15 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : order.margin >= 5 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                MRG: {order.margin.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-500">
                          {order.items.length} itens
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600">
                          {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => openModal(order)}
                              className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded flex items-center gap-2 text-xs font-bold hover:bg-indigo-100"
                            >
                              <Eye className="w-3.5 h-3.5" /> Abrir Painel
                            </button>
                            {isGod && (
                              <button
                                onClick={(e) => handleDelete(order.id, e)}
                                disabled={deletingId === order.id}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Excluir Permanentemente"
                              >
                                {deletingId === order.id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Order Detail & Edit Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-11/12 max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="border-b border-zinc-200 p-6 shrink-0 bg-white">
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
                        placeholder="Número da OC"
                      />
                    </div>
                  ) : (
                    <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                      OC {selectedOrder.documentNumber}
                      <button onClick={() => setEditMode(true)} className="p-1.5 text-zinc-400 hover:text-indigo-600 ml-1 bg-zinc-100 rounded" title="Editar Metadados e Itens">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </h3>
                  )}
                  <p className="text-sm text-zinc-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3"/> {selectedOrder.organization.name}
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-right">
                    <div className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">Status Atual</div>
                    <div className="font-bold text-zinc-800">{selectedOrder.status}</div>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

              {/* Modal Body (Scrollable table) */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50">
              {!editMode && (
                <div className="mb-4 flex items-center justify-between bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
                  <div className="text-sm text-zinc-600">
                    Deseja alterar um produto, preço, ou adicionar uma linha manualmente?
                  </div>
                  <button 
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition shadow-sm"
                  >
                    <Edit2 className="w-4 h-4" /> Editar Produtos Manualmente
                  </button>
                </div>
              )}

              {editMode && (
                <div className="mb-4 flex items-center justify-between bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                  <span className="text-sm text-indigo-800 font-medium tracking-tight">
                    Modo de Edição Ativado. Você pode corrigir os dados ou inserir novos volumes manualmente.
                  </span>
                  <button 
                    onClick={addNewItemRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Item Manual
                  </button>
                </div>
              )}

              <table className="w-full text-sm bg-white rounded-lg overflow-hidden border border-zinc-200">
                <thead className="bg-zinc-100">
                  <tr className="border-b border-zinc-200">
                    <th className="p-3 text-left font-semibold text-zinc-600">Descrição do Produto</th>
                    <th className="p-3 text-right font-semibold text-zinc-600 w-24">Qtd</th>
                    <th className="p-3 text-right font-semibold text-zinc-600 w-32">Vlr Unit (R$)</th>
                    <th className="p-3 text-right font-semibold text-zinc-600 w-28">Custo (R$)</th>
                    <th className="p-3 text-right font-semibold text-zinc-600 w-24">Imp (%)</th>
                    <th className="p-3 text-center font-semibold text-zinc-600 w-24">Margem</th>
                    <th className="p-3 text-right font-semibold text-zinc-600 w-32">Total (R$)</th>
                    {editMode && <th className="p-3 w-10 text-center"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {editMode 
                    ? editItems.map((item, index) => (
                      <tr key={item.id} className="hover:bg-zinc-50">
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[index].description = e.target.value;
                              setEditItems(newItems);
                            }}
                            placeholder="Descreva o produto..."
                            className="w-full text-zinc-900 text-sm border border-zinc-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[index].quantity = Number(e.target.value) || 0;
                              setEditItems(newItems);
                            }}
                            className="w-full text-right text-zinc-900 text-sm border border-zinc-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            step="0.01"
                            value={item.unitPriceReturn}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[index].unitPriceReturn = Number(e.target.value) || 0;
                              setEditItems(newItems);
                            }}
                            className="w-full text-right text-zinc-900 text-sm border border-zinc-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </td>
                        <td className="p-3 text-center text-zinc-400 text-xs italic bg-zinc-50/50 hidden md:table-cell" colSpan={3}>
                          (Edição de custo via painel de compras)
                        </td>
                        <td className="p-3 text-right font-medium text-amber-600 bg-amber-50">
                          {(item.quantity * item.unitPriceReturn).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center text-zinc-400">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => toggleItemActive(item.id)}
                              className="p-1.5 hover:text-amber-600 hover:bg-amber-50 rounded text-zinc-400 transition" 
                              title={item.active === false ? "Reativar Item" : "Desativar Item"}
                            >
                              {item.active === false ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-amber-500" />}
                            </button>
                            <button 
                              onClick={() => removeItemRow(item.id)}
                              className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded text-zinc-400 transition" 
                              title="Remover linha"
                            >
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
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
                        <tr key={item.id} className={item.active === false ? "opacity-50" : ""}>
                          <td className={`p-3 text-zinc-900 font-medium ${item.active === false ? "line-through text-zinc-500" : ""}`}>{item.description}</td>
                          <td className="p-3 text-right text-zinc-700">{item.quantity.toLocaleString("pt-BR")}</td>
                          <td className="p-3 text-right text-zinc-700">{item.unitPriceReturn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right text-zinc-700">{safeCostPrice > 0 ? safeCostPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "-"}</td>
                          <td className="p-3 text-right text-zinc-700">{item.taxPercent !== null && !Number.isNaN(item.taxPercent) ? `${String(item.taxPercent).replace('.', ',')}%` : "0%"}</td>
                          <td className="p-3 text-center">
                            {itemMargin !== null ? (
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${itemMargin >= 15 ? 'bg-emerald-100 text-emerald-700' : itemMargin >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                {itemMargin.toFixed(1).replace('.', ',')}%
                              </span>
                            ) : <span className="text-zinc-400 text-xs">-</span>}
                          </td>
                          <td className="p-3 text-right font-bold text-zinc-900">
                            {(item.quantity * item.unitPriceReturn).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                {!editMode && selectedOrder.items.length > 0 && (() => {
                  let totalSales = 0;
                  let totalCostAmt = 0;
                  
                  selectedOrder.items.forEach(item => {
                    if (item.active === false) return; // Ignore deactivated items
                    
                    const sale = item.quantity * item.unitPriceReturn;
                    totalSales += sale;
                    
                    const safeTaxPercent = Number.isNaN(Number(item.taxPercent)) ? 0 : Number(item.taxPercent);
                    const safeCostPrice = Number.isNaN(Number(item.costPrice)) ? 0 : Number(item.costPrice);
                    
                    if (safeCostPrice > 0) {
                      const taxAmount = item.unitPriceReturn * (safeTaxPercent / 100);
                      const custoTotal = safeCostPrice + taxAmount;
                      totalCostAmt += item.quantity * custoTotal;
                    } else {
                      // Se não há custo, vamos assumir que o custo é o que? Assumimos custo zero para não quebrar a soma,
                      // o que gera lucro de 100% no item.
                    }
                  });
                  
                  const totalProfit = totalSales - totalCostAmt;
                  const overallMargin = totalSales > 0 && totalCostAmt > 0 ? (totalProfit / totalSales) * 100 : 0;
                  
                  return (
                    <tfoot className="bg-zinc-50 font-bold text-zinc-900 border-t-2 border-zinc-200">
                      <tr>
                        <td colSpan={2} className="p-3 text-right">TOTALIZADORES:</td>
                        <td className="p-3 text-right text-indigo-700">Venda: {totalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 text-right text-rose-700">Custo: {totalCostAmt > 0 ? totalCostAmt.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "-"}</td>
                        <td className="p-3"></td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded ${overallMargin >= 15 ? 'bg-emerald-100 text-emerald-800' : overallMargin >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                            {overallMargin.toFixed(1).replace('.', ',')}%
                          </span>
                        </td>
                        <td className="p-3 text-right text-emerald-700">
                           Lucro: {totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between border-t border-zinc-200 p-6 bg-white shrink-0">
              <div className="flex gap-3">
                {editMode && (
                  <>
                    <button
                      onClick={saveEdits}
                      disabled={savingEdit}
                      className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
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
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

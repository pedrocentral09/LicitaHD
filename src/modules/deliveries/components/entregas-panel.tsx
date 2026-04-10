"use client";

import { useState, useEffect } from "react";
import { PackageOpen, CheckCircle, Loader2, ChevronDown, ChevronUp, Clock, Undo2, Search, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceReturn: number;
  costPrice: number | null;
  conversionFactor: number;
  expectedDelivery: string | null;
  expectedCustomerDelivery: string | null;
  buyingLocation: string | null;
  ownership: string | null;
  receivedAt: string | null;
  deliveredToCustomerAt: string | null;
  invoiceNumber: string | null;
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
  items: PurchaseItem[];
}

interface OrgDashboard {
  id: string;
  name: string;
  purchaseOrders: PurchaseOrder[];
}

export function EntregasPanel() {
  const [organizations, setOrganizations] = useState<OrgDashboard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"inbound" | "outbound">("inbound");

  async function loadDashboard(tab: "inbound" | "outbound") {
    try {
      const res = await fetch(`/api/deliveries-dashboard?type=${tab}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrganizations(data);
      } else {
        console.error("Dashboard response is not an array:", data);
        setOrganizations([]);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setOrganizations([]);
    }
  }

  useEffect(() => {
    loadDashboard(activeTab);
  }, [activeTab]);

  function toggleOrg(orgId: string) {
    setExpandedOrg((prev) => (prev === orgId ? null : orgId));
  }

  async function saveExpectedDate(itemId: string, dateValue: string) {
    const field = activeTab === "inbound" ? "expectedDelivery" : "expectedCustomerDelivery";
    try {
      await fetch(`/api/purchase-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: dateValue || null })
      });
      // We don't need to loadDashboard here if we just want it to be optimistic, but let's reload to ensure sync
      loadDashboard(activeTab);
    } catch (e) {
      console.error("Failed to save date", e);
    }
  }

  async function saveInvoiceNumber(itemId: string, value: string) {
    try {
      await fetch(`/api/purchase-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceNumber: value.trim() || null })
      });
    } catch (e) {
      console.error("Failed to save invoice number", e);
    }
  }

  async function toggleStatusItem(itemId: string) {
    setSaving(itemId);
    const route = activeTab === "inbound" ? "receive" : "dispatch-to-customer";
    await fetch(`/api/purchase-items/${itemId}/${route}`, {
      method: "PATCH"
    });
    setSaving(null);
    loadDashboard(activeTab);
  }

  async function handleRegression(ocId: string, docNumber: string) {
    if (window.confirm(`Tem certeza que deseja retornar a OC ${docNumber} para a tela de Compras (Cotação)?\n\nIsso removerá a ordem logistica e ela voltará a ser vista pelos compradores.`)) {
      setSaving(`reg-${ocId}`);
      await fetch(`/api/orders/${ocId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "VALIDATED" })
      });
      setSaving(null);
      loadDashboard(activeTab);
    }
  }

  const filteredOrganizations = organizations.map(org => {
    const orgNameMatch = org.name.toLowerCase().includes(searchTerm.toLowerCase());
    const filteredOcs = org.purchaseOrders.filter(oc => 
      orgNameMatch || oc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...org, purchaseOrders: filteredOcs };
  }).filter(org => org.name.toLowerCase().includes(searchTerm.toLowerCase()) || org.purchaseOrders.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        {/* Tabs */}
        <div className="flex border-b border-zinc-200">
          <button
            onClick={() => setActiveTab("inbound")}
            className={cn(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "inbound" ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            )}
          >
            Recebimento na Sede (De Fornecedores)
          </button>
          <button
            onClick={() => setActiveTab("outbound")}
            className={cn(
              "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "outbound" ? "border-emerald-600 text-emerald-600" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            )}
          >
            Envio ao Governo (Para Clientes)
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por prefeitura ou número da OC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white shadow-sm"
          />
        </div>
      </div>

      {filteredOrganizations.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center bg-white mt-6">
          <PackageOpen className="h-12 w-12 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500 font-medium">Nenhuma entrega correspondente pendente</p>
          <p className="text-xs text-zinc-400 mt-1">{searchTerm ? "Tente alterar o termo de busca." : "Ordens de Compra finalizadas aparecerão aqui."}</p>
        </div>
      )}

      {filteredOrganizations.map((org) => {
        const isExpanded = expandedOrg === org.id;

        return (
          <div key={org.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden text-sm">
            <button
              onClick={() => toggleOrg(org.id)}
              className="flex w-full items-center justify-between bg-zinc-50 px-5 py-4 hover:bg-zinc-100 transition-colors border-b border-zinc-100"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-zinc-900 text-lg">{org.name}</span>
                <span className="text-zinc-500 text-xs mt-1 font-medium">
                  {org.purchaseOrders.length} {org.purchaseOrders.length === 1 ? 'Ordem Aguardando Movimentação' : 'Ordens Aguardando Movimentação'}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-zinc-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-zinc-500" />
              )}
            </button>

            {isExpanded && (
              <div className="p-5 bg-white space-y-6">
                {org.purchaseOrders.map((oc) => {
                  const checkCount = oc.items.filter(i => activeTab === "inbound" ? i.receivedAt !== null : (i as any).deliveredToCustomerAt !== null).length;
                  const totalCount = oc.items.length;
                  const progress = totalCount > 0 ? (checkCount / totalCount) * 100 : 0;

                  return (
                    <div key={oc.id} className="border border-zinc-300 rounded-lg overflow-hidden">
                      <div className="bg-zinc-100 px-4 py-3 border-b border-zinc-300 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Clock className={cn("w-4 h-4", activeTab === "inbound" ? "text-amber-500" : "text-emerald-500")} />
                          <span className="font-bold text-zinc-800 text-sm">OC: {oc.documentNumber}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleRegression(oc.id, oc.documentNumber)}
                            disabled={saving === `reg-${oc.id}`}
                            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-200 text-rose-600 rounded text-xs font-bold shadow-sm hover:bg-rose-50 hover:border-rose-300 transition mr-2"
                            title="Retornar Ordem inteira para Cotação (Compras)"
                          >
                            {saving === `reg-${oc.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                            Retornar p/ Cotação
                          </button>
                          
                          <span className="text-xs font-semibold text-zinc-600 bg-white px-3 py-1 rounded border border-zinc-200 shadow-sm mr-2 flex items-center gap-2">
                            {activeTab === "inbound" ? "Recebido" : "Entregue"}: <strong className={activeTab === "inbound" ? "text-amber-700" : "text-emerald-700"}>{checkCount} / {totalCount}</strong>
                            <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden ml-1">
                              <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: activeTab === "inbound" ? "#f59e0b" : "#10b981" }}></div>
                            </div>
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-white overflow-x-auto">
                        <table className="w-full text-xs text-left text-zinc-600 min-w-max">
                          <thead className="bg-zinc-50 text-zinc-400 border-b border-zinc-200 font-medium h-8">
                            <tr>
                              <th className="px-2">Descrição do Item</th>
                              <th className="px-2 w-16">Qtd</th>
                              <th className="px-2 w-20">Caixas</th>
                              <th className="px-2 w-32">Local</th>
                              <th className="px-2 w-32">Titularidade</th>
                              <th className="px-2 w-28">Previsão</th>
                              {activeTab === "outbound" && <th className="px-2 w-36"><div className="flex items-center gap-1"><FileCheck className="w-3 h-3" /> NF-e Venda</div></th>}
                              <th className="px-2 w-32 text-center">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {oc.items.map((item) => {
                              const boxes = item.conversionFactor > 1 ? Math.ceil(item.quantity / item.conversionFactor) : item.quantity;
                              const isChecked = activeTab === "inbound" ? item.receivedAt !== null : item.deliveredToCustomerAt !== null;
                              const expectedDate = activeTab === "inbound" ? item.expectedDelivery : item.expectedCustomerDelivery;

                              return (
                                <tr key={item.id} className={cn("transition-colors", isChecked ? (activeTab === "inbound" ? "bg-amber-50/30" : "bg-emerald-50/50") : "hover:bg-zinc-50")}>
                                  <td className="px-2 py-2.5 font-medium text-zinc-800">
                                    <span className={cn(isChecked && "line-through text-zinc-400")}>{item.description}</span>
                                  </td>
                                  <td className="px-2 py-2.5">{item.quantity}</td>
                                  <td className="px-2 py-2.5">
                                    <span className="bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">{boxes} cx</span>
                                  </td>
                                  <td className="px-2 py-2.5 text-zinc-500">{item.buyingLocation || "-"}</td>
                                  <td className="px-2 py-2.5 text-zinc-500">{item.ownership || "-"}</td>
                                  <td className="px-2 py-2.5 font-medium text-amber-600">
                                    <input
                                      type="date"
                                      defaultValue={expectedDate ? expectedDate.slice(0, 10) : ""}
                                      onBlur={(e) => saveExpectedDate(item.id, e.target.value)}
                                      className="bg-transparent font-medium w-[120px] focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-1 transition-all"
                                      disabled={isChecked}
                                    />
                                  </td>
                                  {activeTab === "outbound" && (
                                    <td className="px-2 py-2.5">
                                      <input
                                        type="text"
                                        placeholder="Nº NF-e"
                                        defaultValue={item.invoiceNumber || ""}
                                        onBlur={(e) => saveInvoiceNumber(item.id, e.target.value)}
                                        className={cn(
                                          "w-full text-xs font-medium px-2 py-1 rounded border transition-all focus:outline-none focus:ring-1",
                                          item.invoiceNumber
                                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 focus:ring-emerald-500"
                                            : "bg-white border-zinc-300 text-zinc-700 focus:ring-indigo-500"
                                        )}
                                      />
                                    </td>
                                  )}
                                  <td className="px-2 py-2.5 text-center">
                                    <button
                                      onClick={() => toggleStatusItem(item.id)}
                                      disabled={saving === item.id}
                                      className={cn(
                                        "flex items-center justify-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold transition-all mx-auto shadow-sm w-28",
                                        isChecked 
                                          ? "bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200" 
                                          : (activeTab === "inbound" ? "bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-500 hover:text-white" : "bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white")
                                      )}
                                    >
                                      {saving === item.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                      ) : isChecked ? (
                                        <>
                                          <Undo2 className="w-3 h-3" />
                                          Desfazer
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-3 h-3" />
                                          {activeTab === "inbound" ? "Dar Baixa" : "Entregue"}
                                        </>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

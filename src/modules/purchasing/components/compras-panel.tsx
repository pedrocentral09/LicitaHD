"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Save, Loader2, ChevronDown, ChevronUp, Package, FileText, Trash2, CheckCircle, Search } from "lucide-react";

interface PurchaseItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceReturn: number;
  costPrice: number | null;
  taxPercent: number | null;
  conversionFactor: number;
  expectedDelivery: string | null;
  expectedCustomerDelivery: string | null;
  buyingLocation: string | null;
  ownership: string | null;
  purchaseOrder?: { documentNumber: string; id: string };
}

interface ProcurementGroup {
  id: string;
  description: string;
  items: PurchaseItem[];
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
  items: PurchaseItem[];
}

interface OrgDashboard {
  id: string;
  name: string;
  procurementGroups: ProcurementGroup[];
  purchaseOrders: PurchaseOrder[];
}

export function ComprasPanel() {
  const [organizations, setOrganizations] = useState<OrgDashboard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "grupo" | "oc">>({});
  const [saving, setSaving] = useState<string | null>(null);

  // Formulários locais
  const [groupDrafts, setGroupDrafts] = useState<Record<string, any>>({});
  const [itemDrafts, setItemDrafts] = useState<Record<string, any>>({});

  async function loadDashboard() {
    try {
      const res = await fetch("/api/purchasing-dashboard");
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
    loadDashboard();
  }, []);

  function toggleOrg(orgId: string) {
    setExpandedOrg((prev) => (prev === orgId ? null : orgId));
    if (!activeTab[orgId]) {
      setActiveTab((prev) => ({ ...prev, [orgId]: "grupo" }));
    }
  }

  const parseNumOrNull = (val: any) => {
    if (val === "" || val == null) return null;
    const n = Number(String(val).replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  };

  async function handleFinalizeOC(oc: any) {
    if (window.confirm(`Tem certeza que deseja finalizar a Cotação da OC ${oc.documentNumber}? \n\nIsso moverá a ordem para as etapas de Entrega Logística.`)) {
      setSaving(`fin-${oc.id}`);
      
      // Auto-save all items in this OC before finalizing
      if (oc.items && oc.items.length > 0) {
        await Promise.all(
          oc.items.map((item: any) => {
            const draft = getItemDraft(item);
            return fetch(`/api/purchase-items/${item.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                costPrice: parseNumOrNull(draft.costPrice),
                taxPercent: parseNumOrNull(draft.taxPercent),
                conversionFactor: parseNumOrNull(draft.conversionFactor) || 1,
                expectedDelivery: draft.expectedDelivery || null,
                buyingLocation: draft.buyingLocation || null,
                ownership: draft.ownership || null,
              }),
            });
          })
        );
      }

      await fetch(`/api/orders/${oc.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "QUOTED" })
      });
      setSaving(null);
      loadDashboard();
    }
  }

  async function handleDeleteOC(ocId: string, docNumber: string) {
    if (window.confirm(`Tem certeza que deseja excluir permanentemente a OC de número ${docNumber}? \n\nIsso removerá a ordem de compra e todos os itens dela do sistema.`)) {
      setSaving(`del-${ocId}`);
      await fetch(`/api/orders/${ocId}`, { method: "DELETE" });
      setSaving(null);
      loadDashboard();
    }
  }

  function getGroupDraft(groupId: string, items: PurchaseItem[]) {
    const base = items[0] || {};
    const defaultData = {
      costPrice: base.costPrice ?? "",
      taxPercent: base.taxPercent ?? "",
      conversionFactor: base.conversionFactor ?? 1,
      expectedDelivery: base.expectedDelivery ? base.expectedDelivery.slice(0, 10) : "",
      expectedCustomerDelivery: base.expectedCustomerDelivery ? base.expectedCustomerDelivery.slice(0, 10) : "",
      buyingLocation: base.buyingLocation ?? "",
      ownership: base.ownership ?? "",
    };
    if (groupDrafts[groupId]) {
      return { ...defaultData, ...groupDrafts[groupId] };
    }
    return defaultData;
  }

  function updateGroupDraft(groupId: string, field: string, value: any) {
    setGroupDrafts((prev) => ({
      ...prev,
      [groupId]: { ...((prev[groupId] as any) || {}), [field]: value },
    }));
  }

  function getItemDraft(item: PurchaseItem) {
    const defaultData = {
      costPrice: item.costPrice ?? "",
      taxPercent: item.taxPercent ?? "",
      conversionFactor: item.conversionFactor ?? 1,
      expectedDelivery: item.expectedDelivery ? item.expectedDelivery.slice(0, 10) : "",
      expectedCustomerDelivery: item.expectedCustomerDelivery ? item.expectedCustomerDelivery.slice(0, 10) : "",
      buyingLocation: item.buyingLocation ?? "",
      ownership: item.ownership ?? "",
    };
    if (itemDrafts[item.id]) {
      return { ...defaultData, ...itemDrafts[item.id] };
    }
    return defaultData;
  }

  function updateItemDraft(itemId: string, field: string, value: any) {
    setItemDrafts((prev) => ({
      ...prev,
      [itemId]: { ...((prev[itemId] as any) || {}), [field]: value },
    }));
  }

  async function saveGroup(groupId: string, items: PurchaseItem[]) {
    const draft = getGroupDraft(groupId, items);
    setSaving(`g-${groupId}`);
    await fetch(`/api/procurement-groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        costPrice: parseNumOrNull(draft.costPrice),
        taxPercent: parseNumOrNull(draft.taxPercent),
        conversionFactor: parseNumOrNull(draft.conversionFactor) || 1,
        expectedDelivery: draft.expectedDelivery || null,
        expectedCustomerDelivery: draft.expectedCustomerDelivery || null,
        buyingLocation: draft.buyingLocation || null,
        ownership: draft.ownership || null,
      }),
    });
    setSaving(null);
    loadDashboard();
  }

  async function saveSingleFieldGroup(groupId: string, field: string, value: any) {
    let valOrNull = value === "" || value == null ? null : value;
    if (valOrNull !== null && field !== "expectedDelivery" && field !== "expectedCustomerDelivery" && field !== "buyingLocation" && field !== "ownership") {
      valOrNull = Number(String(value).replace(',', '.'));
      if (Number.isNaN(valOrNull)) return; // Avoid saving invalid letters/symbols as null
    }
    
    await fetch(`/api/procurement-groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: valOrNull }),
    });
  }

  async function saveSingleFieldItem(itemId: string, field: string, value: any) {
    let valOrNull = value === "" || value == null ? null : value;
    if (valOrNull !== null && field !== "expectedDelivery" && field !== "expectedCustomerDelivery" && field !== "buyingLocation" && field !== "ownership") {
      valOrNull = Number(String(value).replace(',', '.'));
      if (Number.isNaN(valOrNull)) return;
    }

    await fetch(`/api/purchase-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: valOrNull }),
    });
  }

  async function saveItem(item: PurchaseItem) {
    const draft = getItemDraft(item);
    setSaving(`i-${item.id}`);
    await fetch(`/api/purchase-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        costPrice: parseNumOrNull(draft.costPrice),
        taxPercent: parseNumOrNull(draft.taxPercent),
        conversionFactor: parseNumOrNull(draft.conversionFactor) || 1,
        expectedDelivery: draft.expectedDelivery || null,
        expectedCustomerDelivery: draft.expectedCustomerDelivery || null,
        buyingLocation: draft.buyingLocation || null,
        ownership: draft.ownership || null,
      }),
    });
    setSaving(null);
    loadDashboard();
  }

  const filteredOrganizations = organizations.map(org => {
    const orgNameMatch = org.name.toLowerCase().includes(searchTerm.toLowerCase());
    const filteredOcs = org.purchaseOrders.filter(oc => 
      orgNameMatch || oc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...org, purchaseOrders: filteredOcs };
  }).filter(org => org.name.toLowerCase().includes(searchTerm.toLowerCase()) || org.purchaseOrders.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-indigo-500" />
          Painel de Compras de Produtos ({filteredOrganizations.length})
        </h2>
        
        {/* Search Bar */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por prefeitura ou número da OC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {filteredOrganizations.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <ShoppingCart className="h-12 w-12 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500">Nenhuma compra pendente correspondente no momento</p>
        </div>
      )}

      {filteredOrganizations.map((org) => {
        const isExpanded = expandedOrg === org.id;
        const tab = activeTab[org.id] || "grupo";

        return (
          <div key={org.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden text-sm">
            {/* Header / Accordion Toggle */}
            <button
              onClick={() => toggleOrg(org.id)}
              className="flex w-full items-center justify-between bg-zinc-50 px-5 py-4 hover:bg-zinc-100 transition-colors border-b border-zinc-100"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-zinc-900 text-lg">{org.name}</span>
                <span className="text-zinc-500 text-xs mt-1">
                  {org.purchaseOrders.length} OCs vinculadas · {org.procurementGroups.length} itens distintos
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-zinc-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-zinc-500" />
              )}
            </button>

            {isExpanded && (
              <div className="p-5 bg-white">
                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-zinc-200 pb-4">
                  <button
                    onClick={() => setActiveTab((prev) => ({ ...prev, [org.id]: "grupo" }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      tab === "grupo"
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    Comprar Tudo (Lote)
                  </button>
                  <button
                    onClick={() => setActiveTab((prev) => ({ ...prev, [org.id]: "oc" }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      tab === "oc"
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Por Ordem de Compra
                  </button>
                </div>

                {/* Conteúdo Aba - Grupo */}
                {tab === "grupo" && (
                  <div className="space-y-6">
                    <p className="text-xs text-zinc-500 mb-2">
                      Alterações feitas nesta tela serão aplicadas automaticamente em todos os itens que compartilham o mesmo produto.
                    </p>
                    {org.procurementGroups.map((group) => {
                      const totalQty = group.items.reduce((s, i) => s + i.quantity, 0);
                      const draft = getGroupDraft(group.id, group.items);
                      
                      // avgSell of group
                      const avgSell = group.items.reduce((s, i) => s + i.unitPriceReturn, 0) / (group.items.length || 1);
                      let margin = null;
                      if (draft.costPrice && Number(draft.costPrice) > 0) {
                        const taxAmount = avgSell * (Number(draft.taxPercent || 0) / 100);
                        const totalCusto = Number(draft.costPrice) + taxAmount;
                        if (avgSell > 0) {
                          margin = ((avgSell - totalCusto) / avgSell) * 100;
                        }
                      }

                      return (
                        <div key={group.id} className="border border-zinc-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-zinc-900">{group.description}</h4>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                Qtd Total: {totalQty} | OCs: {group.items.map(i => i.purchaseOrder?.documentNumber).filter((v,i,a)=>a.indexOf(v)===i).join(", ")}
                              </p>
                            </div>
                            {margin !== null && (
                              <span className={`px-2 py-1 text-xs font-bold rounded-full ${margin >= 15 ? 'bg-emerald-100 text-emerald-700' : margin >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                M. Simulação: {margin.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mt-2">
                            <div>
                              <label className="text-xs text-zinc-500 mb-1 block">Local de Compra</label>
                              <input
                                type="text"
                                className="w-full border border-zinc-300 rounded px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                                placeholder="Ex: Atacadão"
                                value={draft.buyingLocation}
                                onChange={(e) => updateGroupDraft(group.id, "buyingLocation", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500 mb-1 block">Titularidade (CNPJ)</label>
                              <input
                                type="text"
                                className="w-full border border-zinc-300 rounded px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                                placeholder="Ex: Empresa X"
                                value={draft.ownership}
                                onChange={(e) => updateGroupDraft(group.id, "ownership", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500 mb-1 block">Custo (R$)</label>
                              <input
                                type="text" inputMode="decimal"
                                className="w-full border border-zinc-300 rounded px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                                value={draft.costPrice !== null && draft.costPrice !== "" ? String(draft.costPrice).replace('.', ',') : ""}
                                onChange={(e) => updateGroupDraft(group.id, "costPrice", e.target.value)}
                                onBlur={(e) => saveSingleFieldGroup(group.id, "costPrice", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500 mb-1 block">Imposto (%)</label>
                              <input
                                type="text" inputMode="decimal"
                                className="w-full border border-zinc-300 rounded px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                                placeholder="0"
                                value={draft.taxPercent !== null && draft.taxPercent !== "" ? String(draft.taxPercent).replace('.', ',') : ""}
                                onChange={(e) => updateGroupDraft(group.id, "taxPercent", e.target.value)}
                                onBlur={(e) => saveSingleFieldGroup(group.id, "taxPercent", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500 mb-1 block">Qtd / Caixa</label>
                              <input
                                type="number" step="1"
                                className="w-full border border-zinc-300 rounded px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                value={draft.conversionFactor}
                                onChange={(e) => updateGroupDraft(group.id, "conversionFactor", e.target.value)}
                              />
                            </div>
                            <div className="col-span-2 flex gap-4">
                              <div className="w-1/2">
                                <label className="text-xs text-zinc-500 mb-1 block">Prev. Fornecedor</label>
                                <input
                                  type="date"
                                  className="w-full border border-zinc-300 rounded px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                  value={draft.expectedDelivery}
                                  onChange={(e) => updateGroupDraft(group.id, "expectedDelivery", e.target.value)}
                                />
                              </div>
                              <div className="w-1/2">
                                <label className="text-xs text-zinc-500 mb-1 block">Prev. Gov. (Entrega)</label>
                                <input
                                  type="date"
                                  className="w-full border border-zinc-300 rounded px-3 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                  value={draft.expectedCustomerDelivery}
                                  onChange={(e) => updateGroupDraft(group.id, "expectedCustomerDelivery", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => saveGroup(group.id, group.items)}
                                disabled={saving === `g-${group.id}`}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-3 rounded flex items-center justify-center gap-2 text-sm"
                              >
                                {saving === `g-${group.id}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                                Salvar Lote
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Conteúdo Aba - OC */}
                {tab === "oc" && (
                  <div className="space-y-6">
                    <p className="text-xs text-zinc-500 mb-2">
                      Altere o custo e a previsão de entrega de forma independente para cada Ordem de Compra.
                    </p>
                    {org.purchaseOrders.map((oc) => (
                      <div key={oc.id} className="border border-zinc-300 rounded-lg overflow-hidden">
                        <div className="bg-zinc-100 px-4 py-2 border-b border-zinc-300 flex justify-between items-center">
                          <span className="font-bold text-zinc-800">Ordem de Compra: {oc.documentNumber}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-500 px-2 py-0.5 bg-white rounded border border-zinc-200 shadow-sm mr-2">
                              {oc.items.length} ITENS
                            </span>
                            <button
                              onClick={() => handleFinalizeOC(oc)}
                              disabled={saving === `fin-${oc.id}`}
                              className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded px-2 py-1 transition-colors disabled:opacity-50 font-medium text-xs border border-transparent hover:border-emerald-200"
                              title="Finalizar Cotação e Enviar para Entregas"
                            >
                              {saving === `fin-${oc.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Finalizar Cotação
                            </button>
                            <div className="w-px h-4 bg-zinc-300 mx-1"></div>
                            <button
                              onClick={() => handleDeleteOC(oc.id, oc.documentNumber)}
                              disabled={saving === `del-${oc.id}`}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors disabled:opacity-50"
                              title="Excluir Ordem de Compra"
                            >
                              {saving === `del-${oc.id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          {oc.items.map((item) => {
                            const draft = getItemDraft(item);
                            let margin = null;
                            if (draft.costPrice && Number(draft.costPrice) > 0) {
                              const taxAmount = item.unitPriceReturn * (Number(draft.taxPercent || 0) / 100);
                              const totalCusto = Number(draft.costPrice) + taxAmount;
                              if (item.unitPriceReturn > 0) {
                                margin = ((item.unitPriceReturn - totalCusto) / item.unitPriceReturn) * 100;
                              }
                            }

                            return (
                              <div key={item.id} className="border-b border-dashed border-zinc-200 pb-4 last:border-0 last:pb-0">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="text-sm font-semibold text-zinc-700">{item.description}</div>
                                  {margin !== null && (
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${margin >= 15 ? 'bg-emerald-100 text-emerald-700' : margin >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                      {margin.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-4 items-center">
                                  <div className="w-16">
                                    <label className="text-[10px] text-zinc-400 block">Qtd</label>
                                    <span className="text-xs font-medium">{item.quantity}</span>
                                  </div>
                                  <div className="w-20">
                                    <label className="text-[10px] text-zinc-400 block">Venda (R$)</label>
                                    <span className="text-xs font-medium">{item.unitPriceReturn.toFixed(2)}</span>
                                  </div>
                                  <div className="w-24">
                                    <label className="text-[10px] text-indigo-600 font-bold block">Custo (R$)</label>
                                    <input
                                      type="text" inputMode="decimal"
                                      className="w-full border border-zinc-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                      value={draft.costPrice !== null && draft.costPrice !== "" ? String(draft.costPrice).replace('.', ',') : ""}
                                      onChange={(e) => updateItemDraft(item.id, "costPrice", e.target.value)}
                                      onBlur={(e) => saveSingleFieldItem(item.id, "costPrice", e.target.value)}
                                    />
                                  </div>
                                  <div className="w-20">
                                    <label className="text-[10px] text-indigo-600 font-bold block">Imposto (%)</label>
                                    <input
                                      type="text" inputMode="decimal"
                                      className="w-full border border-zinc-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                      value={draft.taxPercent !== null && draft.taxPercent !== "" ? String(draft.taxPercent).replace('.', ',') : ""}
                                      placeholder="0"
                                      onChange={(e) => updateItemDraft(item.id, "taxPercent", e.target.value)}
                                      onBlur={(e) => saveSingleFieldItem(item.id, "taxPercent", e.target.value)}
                                    />
                                  </div>
                                  <div className="w-32">
                                    <label className="text-[10px] text-zinc-500 block">Local de Compra</label>
                                    <input
                                      type="text"
                                      placeholder="Ex: Atacadão"
                                      className="w-full border border-zinc-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                      value={draft.buyingLocation}
                                      onChange={(e) => updateItemDraft(item.id, "buyingLocation", e.target.value)}
                                    />
                                  </div>
                                  <div className="w-32">
                                    <label className="text-[10px] text-zinc-500 block">Titularidade</label>
                                    <input
                                      type="text"
                                      placeholder="Ex: Empresa X"
                                      className="w-full border border-zinc-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                      value={draft.ownership}
                                      onChange={(e) => updateItemDraft(item.id, "ownership", e.target.value)}
                                    />
                                  </div>
                                  <div className="w-16">
                                    <label className="text-[10px] text-zinc-500 block">Cx</label>
                                    <input
                                      type="number" step="1"
                                      className="w-full border border-zinc-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                      value={draft.conversionFactor}
                                      onChange={(e) => updateItemDraft(item.id, "conversionFactor", e.target.value)}
                                    />
                                  </div>
                                  <div className="w-24">
                                    <label className="text-[10px] text-zinc-500 block">Prev. Fornecedor</label>
                                    <input
                                      type="date"
                                      className="w-full border border-zinc-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                      value={draft.expectedDelivery}
                                      onChange={(e) => updateItemDraft(item.id, "expectedDelivery", e.target.value)}
                                    />
                                  </div>
                                  <div className="w-24">
                                    <label className="text-[10px] text-zinc-500 block">Prev. Governo</label>
                                    <input
                                      type="date"
                                      className="w-full border border-zinc-300 rounded px-2 py-1 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                      value={draft.expectedCustomerDelivery}
                                      onChange={(e) => updateItemDraft(item.id, "expectedCustomerDelivery", e.target.value)}
                                    />
                                  </div>
                                  <div className="ml-auto">
                                    <button
                                      onClick={() => saveItem(item)}
                                      disabled={saving === `i-${item.id}`}
                                      className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium py-1 px-3 rounded text-xs flex items-center justify-center gap-1 border border-indigo-200"
                                    >
                                      {saving === `i-${item.id}` ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3" />}
                                      Salvar Item
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

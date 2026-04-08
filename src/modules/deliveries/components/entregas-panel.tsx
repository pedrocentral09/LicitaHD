"use client";

import { useState, useEffect } from "react";
import { PackageOpen, CheckCircle, Loader2, ChevronDown, ChevronUp, Clock, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PurchaseItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceReturn: number;
  costPrice: number | null;
  conversionFactor: number;
  expectedDelivery: string | null;
  buyingLocation: string | null;
  ownership: string | null;
  receivedAt: string | null;
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
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function loadDashboard() {
    try {
      const res = await fetch("/api/deliveries-dashboard");
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
  }

  async function toggleReceiveItem(itemId: string) {
    setSaving(itemId);
    await fetch(`/api/purchase-items/${itemId}/receive`, {
      method: "PATCH"
    });
    setSaving(null);
    loadDashboard();
  }

  return (
    <div className="space-y-4">
      {organizations.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <PackageOpen className="h-12 w-12 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500 font-medium">Nenhuma entrega pendente no momento</p>
          <p className="text-xs text-zinc-400 mt-1">Ordens de Compra finalizadas pelo setor de compras aparecerão aqui.</p>
        </div>
      )}

      {organizations.map((org) => {
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
                  {org.purchaseOrders.length} Ordem(ns) Aguardando Recebimento
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
                  const receivedCount = oc.items.filter(i => i.receivedAt !== null).length;
                  const totalCount = oc.items.length;
                  const progress = totalCount > 0 ? (receivedCount / totalCount) * 100 : 0;

                  return (
                    <div key={oc.id} className="border border-zinc-300 rounded-lg overflow-hidden">
                      <div className="bg-zinc-100 px-4 py-3 border-b border-zinc-300 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-500" />
                          <span className="font-bold text-zinc-800 text-sm">OC: {oc.documentNumber}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-zinc-600 bg-white px-3 py-1 rounded border border-zinc-200 shadow-sm mr-2 flex items-center gap-2">
                            Entregue: <strong className="text-emerald-700">{receivedCount} / {totalCount}</strong>
                            <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden ml-1">
                              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
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
                              <th className="px-2 w-32 text-center">Recebido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {oc.items.map((item) => {
                              const boxes = item.conversionFactor > 1 ? Math.ceil(item.quantity / item.conversionFactor) : item.quantity;
                              const isReceived = item.receivedAt !== null;

                              return (
                                <tr key={item.id} className={cn("transition-colors", isReceived ? "bg-emerald-50/50" : "hover:bg-zinc-50")}>
                                  <td className="px-2 py-2.5 font-medium text-zinc-800">
                                    <span className={cn(isReceived && "line-through text-zinc-400")}>{item.description}</span>
                                  </td>
                                  <td className="px-2 py-2.5">{item.quantity}</td>
                                  <td className="px-2 py-2.5">
                                    <span className="bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">{boxes} cx</span>
                                  </td>
                                  <td className="px-2 py-2.5 text-zinc-500">{item.buyingLocation || "-"}</td>
                                  <td className="px-2 py-2.5 text-zinc-500">{item.ownership || "-"}</td>
                                  <td className="px-2 py-2.5 font-medium text-amber-600">
                                    {item.expectedDelivery ? new Date(item.expectedDelivery).toLocaleDateString('pt-BR') : "-"}
                                  </td>
                                  <td className="px-2 py-2.5 text-center">
                                    <button
                                      onClick={() => toggleReceiveItem(item.id)}
                                      disabled={saving === item.id}
                                      className={cn(
                                        "flex items-center justify-center gap-1.5 px-3 py-1 rounded text-[11px] font-bold transition-all mx-auto shadow-sm w-24",
                                        isReceived 
                                          ? "bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200" 
                                          : "bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white"
                                      )}
                                    >
                                      {saving === item.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                      ) : isReceived ? (
                                        <>
                                          <Undo2 className="w-3 h-3" />
                                          Desfazer
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-3 h-3" />
                                          Dar Baixa
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

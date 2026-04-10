"use client";

import { useState, useEffect } from "react";
import {
  PackageOpen,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  Undo2,
  Search,
  Plus,
  Truck,
  FileCheck,
  Package,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ------------- Types -------------
interface ShipmentItemData {
  id: string;
  quantity: number;
  purchaseItem: {
    description: string;
    quantity: number;
    unitPriceReturn: number;
  };
}

interface ShipmentData {
  id: string;
  shipmentNumber: number;
  invoiceNumber: string | null;
  status: "PENDING" | "DISPATCHED" | "DELIVERED";
  notes: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: ShipmentItemData[];
}

interface ShipmentItemRef {
  shipment: { id: string; status: string; shipmentNumber: number };
  quantity: number;
}

interface PurchaseItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceReturn: number;
  costPrice: number | null;
  conversionFactor: number;
  buyingLocation: string | null;
  ownership: string | null;
  shipmentItems: ShipmentItemRef[];
}

interface PurchaseOrder {
  id: string;
  documentNumber: string;
  issuedAt: string | null;
  items: PurchaseItem[];
  shipments: ShipmentData[];
}

interface OrgDashboard {
  id: string;
  name: string;
  purchaseOrders: PurchaseOrder[];
}

// ------------- Component -------------
export function EntregasPanel() {
  const [organizations, setOrganizations] = useState<OrgDashboard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Shipment creation modal state
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [modalOC, setModalOC] = useState<PurchaseOrder | null>(null);
  const [shipmentSelections, setShipmentSelections] = useState<
    Record<string, number>
  >({});
  const [shipmentInvoice, setShipmentInvoice] = useState("");
  const [shipmentNotes, setShipmentNotes] = useState("");

  async function loadDashboard() {
    try {
      const res = await fetch("/api/deliveries-dashboard");
      const data = await res.json();
      if (Array.isArray(data)) setOrganizations(data);
      else setOrganizations([]);
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

  // ---------- Shipment Modal Logic ----------
  function openShipmentModal(oc: PurchaseOrder) {
    setModalOC(oc);
    setShipmentSelections({});
    setShipmentInvoice("");
    setShipmentNotes("");
    setShowShipmentModal(true);
  }

  function getAvailableQty(item: PurchaseItem): number {
    const shipped = item.shipmentItems.reduce((s, si) => s + si.quantity, 0);
    return Math.max(0, item.quantity - shipped);
  }

  function getItemsWithAvailability(oc: PurchaseOrder) {
    return oc.items
      .map((item) => ({
        ...item,
        available: getAvailableQty(item),
      }))
      .filter((item) => item.available > 0);
  }

  async function createShipment() {
    if (!modalOC) return;

    const items = Object.entries(shipmentSelections)
      .filter(([, qty]) => qty > 0)
      .map(([purchaseItemId, quantity]) => ({ purchaseItemId, quantity }));

    if (items.length === 0) {
      alert("Selecione pelo menos 1 item para a remessa.");
      return;
    }

    setSaving("create-shipment");
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: modalOC.id,
          items,
          invoiceNumber: shipmentInvoice.trim() || null,
          notes: shipmentNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Erro: ${err.error}`);
      } else {
        setShowShipmentModal(false);
        loadDashboard();
      }
    } catch (e) {
      console.error("Failed to create shipment:", e);
    }
    setSaving(null);
  }

  // ---------- Shipment Actions ----------
  async function updateShipmentStatus(
    shipmentId: string,
    status: "DISPATCHED" | "DELIVERED" | "PENDING"
  ) {
    setSaving(`status-${shipmentId}`);
    await fetch(`/api/shipments/${shipmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(null);
    loadDashboard();
  }

  async function updateShipmentInvoice(shipmentId: string, value: string) {
    await fetch(`/api/shipments/${shipmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceNumber: value.trim() || null }),
    });
  }

  async function deleteShipment(shipmentId: string) {
    if (!confirm("Excluir esta remessa? Ação irreversível.")) return;
    setSaving(`del-${shipmentId}`);
    await fetch(`/api/shipments/${shipmentId}`, { method: "DELETE" });
    setSaving(null);
    loadDashboard();
  }

  // ---------- Filter ----------
  const filtered = organizations
    .map((org) => {
      const orgMatch = org.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const ocs = org.purchaseOrders.filter(
        (oc) =>
          orgMatch ||
          oc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return { ...org, purchaseOrders: ocs };
    })
    .filter(
      (org) =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.purchaseOrders.length > 0
    );

  // ---------- Render ----------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-emerald-500" />
          Painel de Entregas &amp; Remessas
        </h2>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por prefeitura ou OC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm"
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center bg-white mt-6">
          <PackageOpen className="h-12 w-12 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500 font-medium">
            Nenhuma entrega pendente no momento
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Itens com custo preenchido no Painel de Compras aparecerão aqui
            automaticamente.
          </p>
        </div>
      )}

      {/* Org Cards */}
      {filtered.map((org) => {
        const isExpanded = expandedOrg === org.id;

        return (
          <div
            key={org.id}
            className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden text-sm"
          >
            <button
              onClick={() => toggleOrg(org.id)}
              className="flex w-full items-center justify-between bg-zinc-50 px-5 py-4 hover:bg-zinc-100 transition-colors border-b border-zinc-100"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-bold text-zinc-900 text-lg">
                  {org.name}
                </span>
                <span className="text-zinc-500 text-xs mt-1 font-medium">
                  {org.purchaseOrders.length}{" "}
                  {org.purchaseOrders.length === 1 ? "OC ativa" : "OCs ativas"}
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
                  const totalItems = oc.items.length;
                  const itemsWithAvail = getItemsWithAvailability(oc);
                  const totalShippedItems = totalItems - itemsWithAvail.length;
                  const allDelivered =
                    oc.shipments.length > 0 &&
                    oc.shipments.every((s) => s.status === "DELIVERED") &&
                    itemsWithAvail.length === 0;
                  const progressPct =
                    totalItems > 0
                      ? ((totalShippedItems) / totalItems) * 100
                      : 0;

                  return (
                    <div
                      key={oc.id}
                      className="border border-zinc-300 rounded-lg overflow-hidden"
                    >
                      {/* OC Header */}
                      <div className="bg-zinc-100 px-4 py-3 border-b border-zinc-300">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-emerald-500" />
                            <span className="font-bold text-zinc-800 text-sm">
                              OC: {oc.documentNumber}
                            </span>
                            {oc.issuedAt && (
                              <span className="text-xs text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200">
                                Emissão:{" "}
                                {new Date(
                                  oc.issuedAt +
                                    (oc.issuedAt.includes("T")
                                      ? ""
                                      : "T00:00:00")
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-zinc-600 bg-white px-3 py-1 rounded border border-zinc-200 shadow-sm flex items-center gap-2">
                              Progresso:{" "}
                              <strong
                                className={
                                  allDelivered
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                }
                              >
                                {oc.shipments.length}{" "}
                                {oc.shipments.length === 1
                                  ? "remessa"
                                  : "remessas"}
                              </strong>
                              <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden ml-1">
                                <div
                                  className="h-full transition-all duration-300 bg-emerald-500"
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </span>

                            {itemsWithAvail.length > 0 && (
                              <button
                                onClick={() => openShipmentModal(oc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Nova Remessa
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-white space-y-4">
                        {/* Available Items Summary */}
                        {itemsWithAvail.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" />
                              {itemsWithAvail.length}{" "}
                              {itemsWithAvail.length === 1
                                ? "item disponível"
                                : "itens disponíveis"}{" "}
                              para nova remessa
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {itemsWithAvail.map((item) => (
                                <span
                                  key={item.id}
                                  className="text-[10px] bg-white border border-amber-300 px-2 py-0.5 rounded text-amber-800 font-medium"
                                >
                                  {item.description} (
                                  {item.available} un.)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Shipments list */}
                        {oc.shipments.length === 0 && (
                          <div className="text-center py-6 text-zinc-400 text-xs">
                            Nenhuma remessa criada ainda. Clique em &quot;Nova
                            Remessa&quot; para começar.
                          </div>
                        )}

                        {oc.shipments.map((shipment) => {
                          const statusConfig = {
                            PENDING: {
                              label: "Pendente",
                              color:
                                "bg-zinc-100 text-zinc-600 border-zinc-200",
                              icon: <Clock className="w-3.5 h-3.5" />,
                            },
                            DISPATCHED: {
                              label: "Despachada",
                              color:
                                "bg-amber-100 text-amber-700 border-amber-200",
                              icon: <Truck className="w-3.5 h-3.5" />,
                            },
                            DELIVERED: {
                              label: "Entregue",
                              color:
                                "bg-emerald-100 text-emerald-700 border-emerald-200",
                              icon: <CheckCircle className="w-3.5 h-3.5" />,
                            },
                          };

                          const cfg = statusConfig[shipment.status];

                          return (
                            <div
                              key={shipment.id}
                              className={cn(
                                "border rounded-lg overflow-hidden",
                                shipment.status === "DELIVERED"
                                  ? "border-emerald-200 bg-emerald-50/30"
                                  : "border-zinc-200"
                              )}
                            >
                              {/* Shipment Header */}
                              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-zinc-800 text-xs">
                                    Remessa #{shipment.shipmentNumber}
                                  </span>
                                  <span
                                    className={cn(
                                      "flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold",
                                      cfg.color
                                    )}
                                  >
                                    {cfg.icon} {cfg.label}
                                  </span>
                                  {shipment.deliveredAt && (
                                    <span className="text-[10px] text-zinc-400">
                                      Entregue em{" "}
                                      {new Date(
                                        shipment.deliveredAt
                                      ).toLocaleDateString("pt-BR")}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* NF-e */}
                                  <div className="flex items-center gap-1">
                                    <FileCheck className="w-3 h-3 text-zinc-400" />
                                    <input
                                      type="text"
                                      placeholder="NF-e"
                                      defaultValue={
                                        shipment.invoiceNumber || ""
                                      }
                                      onBlur={(e) =>
                                        updateShipmentInvoice(
                                          shipment.id,
                                          e.target.value
                                        )
                                      }
                                      className={cn(
                                        "w-28 text-xs font-medium px-2 py-1 rounded border focus:outline-none focus:ring-1",
                                        shipment.invoiceNumber
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 focus:ring-emerald-500"
                                          : "bg-white border-zinc-300 text-zinc-700 focus:ring-indigo-500"
                                      )}
                                    />
                                  </div>

                                  {/* Status buttons */}
                                  {shipment.status === "PENDING" && (
                                    <>
                                      <button
                                        onClick={() =>
                                          updateShipmentStatus(
                                            shipment.id,
                                            "DISPATCHED"
                                          )
                                        }
                                        disabled={
                                          saving ===
                                          `status-${shipment.id}`
                                        }
                                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-500 hover:text-white text-amber-700 border border-amber-200 rounded text-[10px] font-bold transition-all"
                                      >
                                        <Truck className="w-3 h-3" />
                                        Despachar
                                      </button>
                                      <button
                                        onClick={() =>
                                          deleteShipment(shipment.id)
                                        }
                                        disabled={
                                          saving === `del-${shipment.id}`
                                        }
                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Excluir remessa"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}

                                  {shipment.status === "DISPATCHED" && (
                                    <>
                                      <button
                                        onClick={() =>
                                          updateShipmentStatus(
                                            shipment.id,
                                            "DELIVERED"
                                          )
                                        }
                                        disabled={
                                          saving ===
                                          `status-${shipment.id}`
                                        }
                                        className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition-all"
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                        Confirmar Entrega
                                      </button>
                                      <button
                                        onClick={() =>
                                          updateShipmentStatus(
                                            shipment.id,
                                            "PENDING"
                                          )
                                        }
                                        className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
                                        title="Voltar para Pendente"
                                      >
                                        <Undo2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}

                                  {shipment.status === "DELIVERED" && (
                                    <button
                                      onClick={() =>
                                        updateShipmentStatus(
                                          shipment.id,
                                          "DISPATCHED"
                                        )
                                      }
                                      className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border border-zinc-200 rounded text-[10px] font-bold transition-all"
                                    >
                                      <Undo2 className="w-3 h-3" />
                                      Desfazer
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Shipment Items */}
                              <div className="px-4 py-2">
                                <table className="w-full text-xs">
                                  <tbody className="divide-y divide-zinc-100">
                                    {shipment.items.map((si) => (
                                      <tr key={si.id}>
                                        <td className="py-1.5 font-medium text-zinc-700">
                                          {si.purchaseItem.description}
                                        </td>
                                        <td className="py-1.5 text-right text-zinc-500 w-24">
                                          {si.quantity} un.
                                        </td>
                                        <td className="py-1.5 text-right text-zinc-500 w-28">
                                          R${" "}
                                          {(
                                            si.quantity *
                                            si.purchaseItem.unitPriceReturn
                                          ).toLocaleString("pt-BR", {
                                            minimumFractionDigits: 2,
                                          })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ========= SHIPMENT CREATION MODAL ========= */}
      {showShipmentModal && modalOC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Nova Remessa — OC {modalOC.documentNumber}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Selecione os itens e quantidades para esta remessa
                </p>
              </div>
              <button
                onClick={() => setShowShipmentModal(false)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Items table */}
              <table className="w-full text-sm">
                <thead className="text-xs text-zinc-400 border-b border-zinc-200">
                  <tr>
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2 w-20">Disponível</th>
                    <th className="text-right py-2 w-32">Qtd na Remessa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {getItemsWithAvailability(modalOC).map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50">
                      <td className="py-3 font-medium text-zinc-800">
                        {item.description}
                      </td>
                      <td className="py-3 text-right text-zinc-500">
                        {item.available}
                      </td>
                      <td className="py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={item.available}
                          value={shipmentSelections[item.id] ?? ""}
                          onChange={(e) => {
                            const val = Math.min(
                              Number(e.target.value) || 0,
                              item.available
                            );
                            setShipmentSelections((prev) => ({
                              ...prev,
                              [item.id]: val,
                            }));
                          }}
                          placeholder="0"
                          className="w-24 text-right border border-zinc-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Quick fill */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const all: Record<string, number> = {};
                    getItemsWithAvailability(modalOC).forEach((item) => {
                      all[item.id] = item.available;
                    });
                    setShipmentSelections(all);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Preencher tudo com máximo disponível
                </button>
              </div>

              {/* NF-e and Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 font-medium mb-1 block">
                    NF-e (opcional)
                  </label>
                  <input
                    type="text"
                    value={shipmentInvoice}
                    onChange={(e) => setShipmentInvoice(e.target.value)}
                    placeholder="Número da Nota Fiscal"
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-medium mb-1 block">
                    Observações (opcional)
                  </label>
                  <input
                    type="text"
                    value={shipmentNotes}
                    onChange={(e) => setShipmentNotes(e.target.value)}
                    placeholder="Ex: Entrega via transportadora X"
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50">
              <button
                onClick={() => setShowShipmentModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createShipment}
                disabled={saving === "create-shipment"}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {saving === "create-shipment" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Criar Remessa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Check,
  Loader2,
  X,
  Search,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowUpDown,
  Filter,
  Undo2,
  FileText,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Receivable {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: "PENDING" | "PAID" | "OVERDUE";
  organization: { name: string };
  purchaseOrder?: { documentNumber: string; sellerName: string | null };
  shipment?: { shipmentNumber: number; invoiceNumber: string | null; status: string } | null;
}

interface Stats {
  totalPending: number;
  totalOverdue: number;
  totalPaidThisMonth: number;
  totalAll: number;
  totalPaid: number;
  count: number;
  overdueCount: number;
  pendingCount: number;
  paidCount: number;
}

interface Org {
  id: string;
  name: string;
}

type StatusFilter = "all" | "PENDING" | "PAID" | "OVERDUE";
type SortField = "dueDate" | "amount" | "org" | null;

export default function ContasReceberPage() {
  const [data, setData] = useState<Receivable[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortAsc, setSortAsc] = useState(true);

  // Modal criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [orgId, setOrgId] = useState("");

  // Detail modal
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchReceivables = async () => {
    try {
      const res = await fetch("/api/receivables");
      const json = await res.json();
      setData(json.items || []);
      setStats(json.stats || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgs = async () => {
    try {
      const res = await fetch("/api/organizations");
      const json = await res.json();
      setOrgs(json);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReceivables();
    fetchOrgs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/receivables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, amount, dueDate, organizationId: orgId }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setTitle("");
        setAmount("");
        setDueDate("");
        setOrgId("");
        fetchReceivables();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsPaid = async (id: string, paidAt?: string) => {
    await fetch(`/api/receivables/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paidAt: paidAt || undefined }),
    });
    fetchReceivables();
  };

  const revertPayment = async (id: string) => {
    await fetch(`/api/receivables/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PENDING" }),
    });
    fetchReceivables();
  };

  const updatePaidAt = async (id: string, paidAt: string) => {
    await fetch(`/api/receivables/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paidAt }),
    });
    fetchReceivables();
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`/api/receivables/${id}/detail`);
      const json = await res.json();
      setDetailData(json);
    } catch (e) {
      console.error(e);
    }
    setDetailLoading(false);
  };

  const fmt = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });

  function handleSort(field: SortField) {
    if (sortField === field) {
      if (sortAsc) setSortAsc(false);
      else { setSortField(null); setSortAsc(true); }
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  const filtered = useMemo(() => {
    let result = [...data];

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(s) ||
          r.organization.name.toLowerCase().includes(s) ||
          r.purchaseOrder?.documentNumber?.toLowerCase().includes(s)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (sortField) {
      result.sort((a, b) => {
        if (sortField === "dueDate") {
          return sortAsc
            ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        if (sortField === "amount") {
          return sortAsc ? a.amount - b.amount : b.amount - a.amount;
        }
        if (sortField === "org") {
          return sortAsc
            ? a.organization.name.localeCompare(b.organization.name)
            : b.organization.name.localeCompare(a.organization.name);
        }
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, statusFilter, sortField, sortAsc]);

  // Days until due
  function daysUntil(dateStr: string): number {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            Contas a Receber
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Faturamento automático por remessa + cobranças manuais
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Cobrança
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">A Receber (Pendente)</p>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2">{fmt(stats.totalPending)}</p>
            <p className="text-[10px] text-zinc-400 mt-1">{stats.pendingCount} títulos</p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">Vencido (Atrasado)</p>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">{fmt(stats.totalOverdue)}</p>
            <p className="text-[10px] text-zinc-400 mt-1">{stats.overdueCount} títulos</p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">Recebido (Mês Atual)</p>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              {fmt(stats.totalPaidThisMonth)}
            </p>
            <p className="text-[10px] text-zinc-400 mt-1">{stats.paidCount} pagos no total</p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">Total Geral</p>
              <DollarSign className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 mt-2">{fmt(stats.totalAll)}</p>
            <p className="text-[10px] text-zinc-400 mt-1">{stats.count} cobranças registradas</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por título, órgão ou OC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-zinc-400" />
          {(
            [
              ["all", "Todos"],
              ["PENDING", "Pendentes"],
              ["OVERDUE", "Atrasados"],
              ["PAID", "Pagos"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                statusFilter === val
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300 hover:text-indigo-600"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-xs font-medium">
                <tr>
                  <th
                    className="px-5 py-3 cursor-pointer hover:bg-zinc-100 transition-colors"
                    onClick={() => handleSort("org")}
                  >
                    <div className="flex items-center gap-1">
                      Órgão {sortField === "org" && <span>{sortAsc ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th className="px-5 py-3">Título / Referência</th>
                  <th
                    className="px-5 py-3 text-right cursor-pointer hover:bg-zinc-100 transition-colors"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Valor {sortField === "amount" && <span>{sortAsc ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th
                    className="px-5 py-3 text-center cursor-pointer hover:bg-zinc-100 transition-colors"
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      Vencimento {sortField === "dueDate" && <span>{sortAsc ? "↑" : "↓"}</span>}
                    </div>
                  </th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Origem</th>
                  <th className="px-5 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-zinc-400">
                      <div className="flex flex-col items-center gap-2">
                        <DollarSign className="w-8 h-8 text-zinc-300" />
                        <p className="font-medium">Nenhuma cobrança encontrada</p>
                        <p className="text-xs">
                          Cobranças são geradas automaticamente quando remessas são
                          entregues.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {filtered.map((item) => {
                  const days = daysUntil(item.dueDate);
                  const isUrgent = item.status !== "PAID" && days <= 7 && days >= 0;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-zinc-50/50 transition-colors",
                        item.status === "OVERDUE" && "bg-red-50/40",
                        isUrgent && item.status === "PENDING" && "bg-amber-50/40"
                      )}
                    >
                      <td className="px-5 py-4 font-medium text-zinc-900 max-w-[180px] truncate">
                        {item.organization.name}
                      </td>
                      <td
                        className="px-5 py-4 cursor-pointer group"
                        onClick={() => openDetail(item.id)}
                      >
                        <p className="text-zinc-900 font-medium group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </p>
                        {item.purchaseOrder && (
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            OC: {item.purchaseOrder.documentNumber}
                          </p>
                        )}
                        <p className="text-[9px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">Clique para detalhes</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-zinc-900 text-right font-bold">
                        {fmt(item.amount)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-zinc-700">{fmtDate(item.dueDate)}</span>
                        {item.status !== "PAID" && (
                          <p
                            className={cn(
                              "text-[10px] font-medium mt-0.5",
                              days < 0
                                ? "text-red-600"
                                : days <= 7
                                ? "text-amber-600"
                                : "text-zinc-400"
                            )}
                          >
                            {days < 0
                              ? `${Math.abs(days)}d atrasado`
                              : days === 0
                              ? "Vence hoje"
                              : `em ${days}d`}
                          </p>
                        )}
                        {item.status === "PAID" && item.paidAt && (
                          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            Pago em {fmtDate(item.paidAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide",
                            item.status === "PAID" &&
                              "bg-emerald-100 text-emerald-700",
                            item.status === "PENDING" &&
                              "bg-amber-100 text-amber-700",
                            item.status === "OVERDUE" &&
                              "bg-red-100 text-red-700"
                          )}
                        >
                          {item.status === "PAID"
                            ? "PAGO"
                            : item.status === "PENDING"
                            ? "PENDENTE"
                            : "ATRASADO"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {item.shipment ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                            Auto — Remessa #{item.shipment.shipmentNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded font-medium">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {item.status !== "PAID" ? (
                          <button
                            onClick={() => markAsPaid(item.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all text-[10px] font-bold border border-emerald-200 ml-auto"
                          >
                            <Check className="h-3 w-3" />
                            Recebido
                          </button>
                        ) : (
                          <button
                            onClick={() => revertPayment(item.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-[10px] font-bold border border-zinc-200 ml-auto"
                          >
                            <Undo2 className="h-3 w-3" />
                            Reverter
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer summary */}
        {filtered.length > 0 && (
          <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-3 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {filtered.length} cobrança{filtered.length !== 1 && "s"} exibida
              {filtered.length !== 1 && "s"}
            </span>
            <span className="font-bold text-zinc-700">
              Total filtrado:{" "}
              {fmt(filtered.reduce((s, r) => s + r.amount, 0))}
            </span>
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">
                Nova Cobrança Manual
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Título / Ref.
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Fatura Mês 05"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Órgão
                </label>
                <select
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Vencimento
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DETAIL MODAL */}
      {detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
              <div>
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  {detailData.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {detailData.organization?.name}
                  {detailData.purchaseOrder && ` — OC ${detailData.purchaseOrder.documentNumber}`}
                </p>
              </div>
              <button
                onClick={() => setDetailData(null)}
                className="p-1.5 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Financial Summary Cards */}
              {detailData.financial && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                    <p className="text-[10px] text-emerald-600 font-medium">Receita</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {fmt(detailData.financial.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <p className="text-[10px] text-red-600 font-medium">Custo</p>
                    <p className="text-lg font-bold text-red-700">
                      {fmt(detailData.financial.totalCost)}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-[10px] text-amber-600 font-medium">Impostos</p>
                    <p className="text-lg font-bold text-amber-700">
                      {fmt(detailData.financial.totalTax)}
                    </p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                    <p className="text-[10px] text-indigo-600 font-medium">Lucro Real</p>
                    <p className={cn("text-lg font-bold", detailData.financial.totalProfit >= 0 ? "text-indigo-700" : "text-red-700")}>
                      {fmt(detailData.financial.totalProfit)}
                    </p>
                  </div>
                  <div className="bg-zinc-100 rounded-lg p-3 border border-zinc-300">
                    <p className="text-[10px] text-zinc-600 font-medium">Margem Real</p>
                    <p className={cn("text-lg font-bold", detailData.financial.overallMargin >= 5 ? "text-emerald-700" : detailData.financial.overallMargin >= 0 ? "text-amber-700" : "text-red-700")}>
                      {detailData.financial.overallMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {/* Document Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium">Valor da Cobrança</p>
                  <p className="font-bold text-zinc-900">{fmt(detailData.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium">Vencimento</p>
                  <p className="font-bold text-zinc-900">{fmtDate(detailData.dueDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium">Status</p>
                  <span className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5",
                    detailData.status === "PAID" && "bg-emerald-100 text-emerald-700",
                    detailData.status === "PENDING" && "bg-amber-100 text-amber-700",
                    detailData.status === "OVERDUE" && "bg-red-100 text-red-700"
                  )}>
                    {detailData.status === "PAID" ? "PAGO" : detailData.status === "PENDING" ? "PENDENTE" : "ATRASADO"}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium">NF-e Vinculada</p>
                  <p className="font-bold text-zinc-900">
                    {detailData.shipment?.invoiceNumber || "—"}
                  </p>
                </div>
              </div>

              {/* OC / Shipment Info */}
              {detailData.purchaseOrder && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-zinc-100 pt-4">
                  <div>
                    <p className="text-[10px] text-zinc-400 font-medium">Nº OC</p>
                    <p className="font-bold text-zinc-900">{detailData.purchaseOrder.documentNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-medium">Vendedor</p>
                    <p className="font-mono text-zinc-700">{detailData.purchaseOrder.sellerName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 font-medium">Status da OC</p>
                    <p className="text-zinc-700">{detailData.purchaseOrder.status}</p>
                  </div>
                  {detailData.shipment && (
                    <div>
                      <p className="text-[10px] text-zinc-400 font-medium">Remessa</p>
                      <p className="font-bold text-zinc-900">#{detailData.shipment.shipmentNumber}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Items Breakdown */}
              {detailData.financial?.items?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-zinc-700 mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    Lucratividade por Item
                  </h4>
                  <div className="rounded-lg border border-zinc-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                        <tr>
                          <th className="px-3 py-2 text-left">Descrição</th>
                          <th className="px-3 py-2 text-right">Qtd</th>
                          <th className="px-3 py-2 text-right">Venda</th>
                          <th className="px-3 py-2 text-right">Custo</th>
                          <th className="px-3 py-2 text-right">Imposto</th>
                          <th className="px-3 py-2 text-right">Lucro</th>
                          <th className="px-3 py-2 text-right">Margem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {detailData.financial.items.map((fi: any, idx: number) => (
                          <tr key={idx} className={cn("hover:bg-zinc-50", fi.margin < 0 && "bg-red-50/40")}>
                            <td className="px-3 py-2 font-medium text-zinc-800 max-w-[200px] truncate">{fi.description}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">{fi.quantity}</td>
                            <td className="px-3 py-2 text-right text-zinc-700">{fmt(fi.totalSell)}</td>
                            <td className="px-3 py-2 text-right text-zinc-700">{fmt(fi.totalCostAmount)}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">{fmt(fi.taxAmount)}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={cn("font-bold", fi.profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {fmt(fi.profit)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                fi.margin >= 15 ? "bg-emerald-100 text-emerald-700" :
                                fi.margin >= 5 ? "bg-amber-100 text-amber-700" :
                                fi.margin >= 0 ? "bg-orange-100 text-orange-700" :
                                "bg-red-100 text-red-700"
                              )}>
                                {fi.margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailData.financial?.items?.length === 0 && (
                <div className="text-center py-8 text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                  Sem dados financeiros detalhados.
                  <br />Cobrança manual sem vínculo de remessa/OC.
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {detailData.status !== "PAID" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-zinc-500 font-medium">Data pgto:</label>
                      <input
                        type="date"
                        id="detail-paid-date"
                        className="text-xs border border-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        const dateInput = document.getElementById("detail-paid-date") as HTMLInputElement;
                        await markAsPaid(detailData.id, dateInput?.value || undefined);
                        openDetail(detailData.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Marcar como Recebido
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-zinc-500 font-medium">Pago em:</label>
                      <input
                        type="date"
                        defaultValue={detailData.paidAt ? detailData.paidAt.slice(0, 10) : ""}
                        className="text-xs border border-emerald-300 bg-emerald-50 text-emerald-700 font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        onChange={async (e) => {
                          if (e.target.value) {
                            await updatePaidAt(detailData.id, e.target.value);
                            openDetail(detailData.id);
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        await revertPayment(detailData.id);
                        openDetail(detailData.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200 text-zinc-600 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs font-bold transition-colors border border-zinc-300"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      Reverter Pagamento
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setDetailData(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

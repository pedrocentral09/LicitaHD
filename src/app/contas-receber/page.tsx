"use client";

import { useEffect, useState } from "react";
import { Plus, Check, Loader2, AlertCircle, Clock, Search, X } from "lucide-react";
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
}

interface Org {
  id: string;
  name: string;
}

export default function ContasReceberPage() {
  const [data, setData] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [orgId, setOrgId] = useState("");

  const fetchReceivables = async () => {
    try {
      const res = await fetch("/api/receivables");
      const json = await res.json();
      setData(json);
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
        body: JSON.stringify({
          title,
          amount,
          dueDate,
          organizationId: orgId
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTitle("");
        setAmount("");
        setDueDate("");
        setOrgId("");
        fetchReceivables();
      } else {
        alert("Erro ao criar Conta a Receber.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      await fetch(`/api/receivables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" })
      });
      fetchReceivables();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Contas a Receber</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gerencie os pagamentos provenientes dos contratos e empenhos
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nova Cobrança
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-zinc-500">Órgão</th>
                <th className="px-6 py-3 font-semibold text-zinc-500">Detalhes</th>
                <th className="px-6 py-3 font-semibold text-zinc-500 text-right">Valor</th>
                <th className="px-6 py-3 font-semibold text-zinc-500 text-center">Vencimento</th>
                <th className="px-6 py-3 font-semibold text-zinc-500 text-center">Status</th>
                <th className="px-6 py-3 font-semibold text-zinc-500 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    {item.organization.name}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-zinc-900">{item.title}</p>
                    {item.purchaseOrder && (
                      <p className="text-xs text-zinc-500 mt-0.5">OF: {item.purchaseOrder.documentNumber}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-900 text-right">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-center">
                    {formatDate(item.dueDate)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide",
                        item.status === "PAID" && "bg-emerald-100 text-emerald-700",
                        item.status === "PENDING" && "bg-amber-100 text-amber-700",
                        item.status === "OVERDUE" && "bg-red-100 text-red-700"
                      )}
                    >
                      {item.status === "PAID" ? "PAGO" : item.status === "PENDING" ? "PENDENTE" : "ATRASADO"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.status !== "PAID" && (
                      <button
                        onClick={() => markAsPaid(item.id)}
                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors"
                        title="Marcar como Pago"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    Nenhuma conta a receber encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">Nova Cobrança</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Título / Ref.</label>
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
                <label className="block text-xs font-medium text-zinc-700 mb-1">Órgão</label>
                <select
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Valor (R$)</label>
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
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Vencimento</label>
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
                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

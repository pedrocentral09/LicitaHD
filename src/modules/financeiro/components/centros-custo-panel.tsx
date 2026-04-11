"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Check,
  Loader2,
  X,
  Search,
  FolderTree,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CostCenter {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  _count: { accountReceivables: number; accountPayables: number };
}

export function CentrosCustoPanel() {
  const [data, setData] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formError, setFormError] = useState("");

  // Edit modal
  const [editItem, setEditItem] = useState<CostCenter | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cost-centers");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cost-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: formCode, name: formName, description: formDesc }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "Erro ao criar");
      } else {
        setIsModalOpen(false);
        setFormCode("");
        setFormName("");
        setFormDesc("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    await fetch(`/api/cost-centers/${editItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    setEditItem(null);
    fetchData();
  };

  const toggleActive = async (item: CostCenter) => {
    await fetch(`/api/cost-centers/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este centro de custos?")) return;
    const res = await fetch(`/api/cost-centers/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error);
    } else {
      fetchData();
    }
  };

  const filtered = data.filter((cc) => {
    if (!showInactive && !cc.active) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        cc.code.toLowerCase().includes(s) ||
        cc.name.toLowerCase().includes(s) ||
        cc.description?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const totalEntradas = data.reduce((s, c) => s + c._count.accountReceivables, 0);
  const totalSaidas = data.reduce((s, c) => s + c._count.accountPayables, 0);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-violet-500" />
            Centros de Custo
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Gerencie centros de custo para classificar entradas e saídas financeiras
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Novo Centro de Custo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Total Cadastrados</p>
          <p className="text-2xl font-bold text-violet-600 mt-2">{data.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Ativos</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{data.filter((c) => c.active).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Vínculos — Receber</p>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{totalEntradas}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Vínculos — Pagar</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{totalSaidas}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por código, nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
            showInactive
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-zinc-600 border-zinc-200 hover:border-violet-300"
          )}
        >
          {showInactive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {showInactive ? "Mostrando Inativos" : "Ocultar Inativos"}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-xs font-medium">
                <tr>
                  <th className="px-5 py-3 w-32">Código</th>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3 text-center">Receber</th>
                  <th className="px-5 py-3 text-center">Pagar</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-zinc-400">
                      <FolderTree className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                      <p className="font-medium">Nenhum centro de custos encontrado</p>
                      <p className="text-xs mt-1">Crie o primeiro para começar</p>
                    </td>
                  </tr>
                )}
                {filtered.map((cc) => (
                  <tr
                    key={cc.id}
                    className={cn("hover:bg-zinc-50/50 transition-colors", !cc.active && "opacity-50")}
                  >
                    <td className="px-5 py-4">
                      <span className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded font-mono text-xs font-bold">
                        {cc.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-zinc-900">{cc.name}</td>
                    <td className="px-5 py-4 text-zinc-500 text-xs max-w-[250px] truncate">
                      {cc.description || "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {cc._count.accountReceivables}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        {cc._count.accountPayables}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold",
                          cc.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                        )}
                      >
                        {cc.active ? "ATIVO" : "INATIVO"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => {
                            setEditItem(cc);
                            setEditName(cc.name);
                            setEditDesc(cc.description || "");
                          }}
                          className="p-1.5 hover:bg-violet-50 text-zinc-400 hover:text-violet-600 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(cc)}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            cc.active
                              ? "hover:bg-amber-50 text-zinc-400 hover:text-amber-600"
                              : "hover:bg-emerald-50 text-zinc-400 hover:text-emerald-600"
                          )}
                          title={cc.active ? "Desativar" : "Ativar"}
                        >
                          {cc.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(cc.id)}
                          className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">Novo Centro de Custo</h2>
              <button onClick={() => { setIsModalOpen(false); setFormError(""); }} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg font-medium">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Código (único)</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: 001, ADM, CMV"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono uppercase focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Nome</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Custo de Mercadoria Vendida"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Descrição (opcional)</label>
                <input
                  type="text"
                  placeholder="Descreva o propósito deste centro de custo"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setFormError(""); }} className="px-4 py-2 text-sm font-medium text-zinc-600 border border-zinc-300 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">
                Editar <span className="text-violet-600 font-mono">{editItem.code}</span>
              </h2>
              <button onClick={() => setEditItem(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Nome</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Descrição</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm font-medium text-zinc-600 border border-zinc-300 rounded-lg">
                  Cancelar
                </button>
                <button onClick={handleEdit} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
                  <Check className="h-4 w-4" />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

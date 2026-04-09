"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Trash2, Edit2, X, Bot, CheckCircle2 } from "lucide-react";

interface Org {
  id: string;
  name: string;
  cnpj: string | null;
  uf: string | null;
  createdAt: string;
  isAiGenerated: boolean;
  _count: { purchaseOrders: number };
}

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", 
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", 
  "SP", "SE", "TO"
];

export function OrgaosList() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [uf, setUf] = useState("");

  async function loadOrgs() {
    const res = await fetch("/api/organizations");
    const data = await res.json();
    setOrgs(data);
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  function handleOpenForm(org?: Org) {
    if (org) {
      setEditingId(org.id);
      setName(org.name);
      setCnpj(org.cnpj || "");
      setUf(org.uf || "");
    } else {
      setEditingId(null);
      setName("");
      setCnpj("");
      setUf("");
    }
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setCnpj("");
    setUf("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = { 
      name, 
      cnpj: cnpj || null, 
      uf: uf || null 
    };

    if (editingId) {
      await fetch(`/api/organizations/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    handleCloseForm();
    setLoading(false);
    loadOrgs();
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este órgão?")) return;
    await fetch(`/api/organizations/${id}`, { method: "DELETE" });
    loadOrgs();
  }

  async function handleApprove(id: string) {
    if (!confirm("Confirmar a auditoria e aprovação definitiva deste Oŕgão?")) return;
    await fetch(`/api/organizations/${id}`, { 
      method: "PATCH", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAiGenerated: false })
    });
    loadOrgs();
  }

  return (
    <div>
      {/* Add Button */}
      <button
        onClick={() => handleOpenForm()}
        className="mb-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        Novo Órgão
      </button>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm relative"
        >
          <div className="absolute top-4 right-4">
            <button type="button" onClick={handleCloseForm} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">
            {editingId ? "Editar Órgão" : "Cadastrar Órgão"}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Nome do Órgão / Prefeitura
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Prefeitura Municipal de São Paulo"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                CNPJ (opcional)
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                UF
              </label>
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              >
                <option value="">--</option>
                {UFS.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Salvando..." : editingId ? "Atualizar" : "Cadastrar"}
            </button>
            <button
              type="button"
              onClick={handleCloseForm}
              className="rounded-lg border border-zinc-300 px-6 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {orgs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center">
            <Building2 className="h-12 w-12 text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-500">Nenhum órgão cadastrado ainda</p>
            <p className="text-xs text-zinc-400 mt-1">Clique em &quot;Novo Órgão&quot; para começar</p>
          </div>
        )}
        {orgs.map((org) => (
          <div
            key={org.id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  {org.name} {org.uf && <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-500 border border-zinc-200">{org.uf}</span>}
                  {org.isAiGenerated && (
                    <span className="flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                      <Bot className="w-3 h-3" /> IA Pendente
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  <span className="font-mono">{org.cnpj || "Sem CNPJ"}</span> 
                  <span className="mx-2 text-zinc-300">&bull;</span>
                  <span className="text-indigo-600 font-medium">{org._count.purchaseOrders} OC(s)</span> vinculadas
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {org.isAiGenerated && (
                <button
                  onClick={() => handleApprove(org.id)}
                  className="mr-2 flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 hover:border-emerald-300"
                  title="Aprovar Cadastro"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Aprovar
                </button>
              )}
              <button
                onClick={() => handleOpenForm(org)}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                title="Editar Órgão"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(org.id)}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Excluir Órgão"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

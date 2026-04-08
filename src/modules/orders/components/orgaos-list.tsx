"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";

interface Org {
  id: string;
  name: string;
  cnpj: string | null;
  createdAt: string;
  _count: { purchaseOrders: number };
}

export function OrgaosList() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadOrgs() {
    const res = await fetch("/api/organizations");
    const data = await res.json();
    setOrgs(data);
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, cnpj: cnpj || null }),
    });
    setName("");
    setCnpj("");
    setShowForm(false);
    setLoading(false);
    loadOrgs();
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este órgão?")) return;
    await fetch(`/api/organizations/${id}`, { method: "DELETE" });
    loadOrgs();
  }

  return (
    <div>
      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        Novo Órgão
      </button>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
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
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Cadastrar"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
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
                <p className="text-sm font-semibold text-zinc-900">{org.name}</p>
                <p className="text-xs text-zinc-400">
                  {org.cnpj || "Sem CNPJ"} · {org._count.purchaseOrders} OC(s)
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDelete(org.id)}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

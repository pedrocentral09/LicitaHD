"use client";

import { useState, useEffect } from "react";
import { Landmark, Plus, Building2, TrendingUp, X } from "lucide-react";

export function BankAccountPanel() {
  const [banks, setBanks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [bankName, setBankName] = useState("");
  const [agency, setAgency] = useState("");
  const [account, setAccount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [balance, setBalance] = useState("");

  async function loadBanks() {
    const res = await fetch("/api/financeiro/banks");
    const data = await res.json();
    setBanks(data);
  }

  useEffect(() => {
    loadBanks();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/financeiro/banks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankName, agency, account, accountName, balance })
    });

    setShowForm(false);
    setLoading(false);
    loadBanks();
  }

  function handleCloseForm() {
    setShowForm(false);
    setBankName("");
    setAgency("");
    setAccount("");
    setAccountName("");
    setBalance("");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nova Conta
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm relative">
          <button type="button" onClick={handleCloseForm} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">
            <X className="h-5 w-5" />
          </button>
          
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Adicionar Conta Corrente</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Nome Oficial / Apelido</label>
              <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Ex: Itaú Empresa S/A" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Banco (Nome/Cód)</label>
              <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ex: 341 - Itaú" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Agência</label>
              <input type="text" value={agency} onChange={e => setAgency(e.target.value)} placeholder="0000" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Conta</label>
              <input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="00000-0" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">Saldo Inicial</label>
              <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>
          <div className="mt-6">
            <button type="submit" disabled={loading} className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Salvando..." : "Salvar Conta"}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {banks.map((bank: any) => (
          <div key={bank.id} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
                  <Landmark className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">{bank.accountName}</h3>
                  <p className="text-xs text-zinc-500">{bank.bankName}</p>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Agência:</span>
                  <span className="font-mono text-zinc-900">{bank.agency || "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Conta:</span>
                  <span className="font-mono text-zinc-900">{bank.account}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-100 flex justify-between items-end">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Saldo Atual</p>
                  <p className={`text-xl font-bold ${bank.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(bank.balance || 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <a href={`/conciliacao?bankId=${bank.id}`} className="mt-6 flex items-center justify-center gap-2 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
              Conciliar OFX
              {bank._count?.transactions > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{bank._count.transactions} Pendentes</span>
              )}
            </a>
          </div>
        ))}
        {banks.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-zinc-200 rounded-xl p-12 text-center text-zinc-500">
            <Landmark className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
            <p className="text-zinc-900 font-medium">Nenhuma conta corrente cadastrada</p>
            <p className="text-sm mt-1">Crie sua primeira conta para gerar os extratos via OFX.</p>
          </div>
        )}
      </div>
    </div>
  );
}

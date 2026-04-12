"use client";

import { useState, useEffect } from "react";
import { Upload, CheckCircle2, Search, ArrowRightLeft, FileSpreadsheet, AlertCircle } from "lucide-react";

export function ReconciliationPanel({ bankId }: { bankId: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  
  const [selectedTx, setSelectedTx] = useState<any>(null);
  
  const [uploading, setUploading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCategory, setCreateCategory] = useState("TARIFA");
  const [createSupplier, setCreateSupplier] = useState("");
  const [createOrgId, setCreateOrgId] = useState("");
  const [createCcId, setCreateCcId] = useState("");
  const [createOrderId, setCreateOrderId] = useState("");
  const [createTypeMode, setCreateTypeMode] = useState<"PAYABLE"|"RECEIVABLE">("PAYABLE");

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  async function loadData() {
    // Carregar transações OFX PENDENTES
    // Vamos precisar também criar um GET rápido nessas sub-rotas ou usamos banco
    const [txRes, payRes, recRes, orgRes, ccRes, ordRes] = await Promise.all([
      fetch(`/api/financeiro/banks/${bankId}/transactions`),
      fetch("/api/financeiro/payables"),
      fetch("/api/financeiro/receivables"),
      fetch("/api/organizations"),
      fetch("/api/cost-centers"),
      fetch("/api/orders")
    ]);
    
    if (txRes.ok) setTransactions(await txRes.json());
    if (orgRes.ok) setOrganizations(await orgRes.json());
    if (ccRes.ok) setCostCenters(await ccRes.json());
    if (ordRes.ok) setOrders(await ordRes.json());
    if (payRes.ok) {
      const p = await payRes.json();
      setPayables(p.filter((x: any) => x.status !== "PAID")); // Only open
    }
    if (recRes.ok) {
      const r = await recRes.json();
      setReceivables(r.filter((x: any) => x.status !== "PAID"));
    }
  }

  useEffect(() => {
    if (bankId) loadData();
  }, [bankId]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/financeiro/banks/${bankId}/ofx`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(data.message || "Upload concluído.");
        loadData();
      } else {
        setUploadMessage("Erro: " + data.error);
      }
    } catch (err) {
      setUploadMessage("Erro no upload do OFX.");
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  }

  async function handleReconcile(titleId: string, type: "PAYABLE" | "RECEIVABLE") {
    if (!selectedTx) return;
    setReconciling(true);

    try {
      const res = await fetch(`/api/financeiro/banks/transactions/${selectedTx.id}/reconcile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: titleId, type })
      });
      const data = await res.json();
      
      if (res.ok) {
        setSelectedTx(null);
        loadData();
      } else {
        alert("Erro ao conciliar: " + data.error);
      }
    } catch (err) {
      alert("Falha de rede ao conciliar.");
    } finally {
      setReconciling(false);
    }
  }

  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTx) return;
    setReconciling(true);

    try {
      // 1. Cria a Conta A Pagar / Receber
      const endpoint = createTypeMode === "PAYABLE" ? "/api/financeiro/payables" : "/api/financeiro/receivables";
      const createRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedTx.description,
          amount: selectedTx.amount, // Exata
          dueDate: selectedTx.date, // Exata
          category: createCategory,
          supplier: createTypeMode === "PAYABLE" ? createSupplier : undefined,
          organizationId: createOrgId || undefined,
          costCenterId: createCcId || undefined,
          purchaseOrderId: createOrderId || undefined
        })
      });
      const createData = await createRes.json();
      
      if (!createRes.ok) {
        alert("Erro ao criar: " + createData.error);
        setReconciling(false);
        return;
      }

      // 2. Concilia com o ID gerado
      await handleReconcile(createData.id, createTypeMode);
      
      setShowCreateModal(false);

    } catch (err) {
      alert("Erro na criação relâmpago.");
      setReconciling(false);
    }
  }

  // Pre-fill type when selecting a transaction
  useEffect(() => {
    if (selectedTx) {
      setCreateTypeMode(selectedTx.type === "DEBIT" ? "PAYABLE" : "RECEIVABLE");
    }
  }, [selectedTx]);

  const formatBRL = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  // Sugestões Automáticas para a transação selecionada
  const suggestedPayables = selectedTx && selectedTx.type === "DEBIT" 
    ? payables.filter(p => Math.abs(p.amount - selectedTx.amount) < 0.01)
    : [];
    
  const suggestedReceivables = selectedTx && selectedTx.type === "CREDIT"
    ? receivables.filter(r => Math.abs(r.amount - selectedTx.amount) < 0.01)
    : [];

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" /> Mesa de Conciliação
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Sincronize as linhas do extrato com os títulos abertos.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <p className="text-xs text-zinc-500">{uploadMessage}</p>
          <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors">
            <Upload className="h-4 w-4" />
            <span className="text-sm font-medium">{uploading ? "Lendo OFX..." : "Importar arquivo OFX"}</span>
            <input type="file" accept=".ofx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Coluna Esquerda: Extrato Bancário PENDENTE */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col h-[70vh]">
          <div className="bg-zinc-50 p-4 border-b border-zinc-200 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-zinc-900">Extrato Bancário (OFX)</h3>
            <span className="ml-auto bg-zinc-200 text-zinc-700 text-xs px-2 py-0.5 rounded-full font-bold">{transactions.length} PENDENTES</span>
          </div>
          
          <div className="overflow-y-auto p-4 space-y-2 flex-grow">
            {transactions.length === 0 && (
              <div className="text-center text-zinc-400 py-12">Nenhuma transação pendente. Importe um OFX.</div>
            )}
            {transactions.map(tx => (
              <div 
                key={tx.id} 
                onClick={() => setSelectedTx(tx)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTx?.id === tx.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-zinc-200 hover:border-zinc-300 bg-white'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono text-zinc-500">{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                  <span className={`font-bold ${tx.type === "CREDIT" ? "text-emerald-600" : "text-red-600"}`}>
                    {tx.type === "CREDIT" ? "+" : "-"}{formatBRL(tx.amount)}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-900 truncate" title={tx.description}>{tx.description}</p>
                <p className="text-[10px] text-zinc-400 mt-1 font-mono truncate">FIT: {tx.fitId}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Direita: Títulos a Pagar/Receber e Match */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col h-[70vh]">
          <div className="bg-zinc-50 p-4 border-b border-zinc-200 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-zinc-900">Títulos Abertos & Sugestões</h3>
          </div>
          
          <div className="overflow-y-auto p-4 flex-grow bg-zinc-50/50">
            {!selectedTx ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400 gap-3">
                <ArrowRightLeft className="w-12 h-12 opacity-20" />
                <p>Selecione uma linha no extrato à esquerda para ver sugestões de conciliação do sistema.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Linha Selecionada Display */}
                <div className="p-4 bg-zinc-900 rounded-xl text-white shadow-lg">
                  <p className="text-xs text-zinc-400 mb-1">Linha Selecionada do Banco</p>
                  <p className="font-medium text-sm mb-2">{selectedTx.description}</p>
                  <div className="flex justify-between items-end">
                    <span className="text-zinc-400 text-sm">{new Date(selectedTx.date).toLocaleDateString('pt-BR')}</span>
                    <span className={`text-xl font-bold ${selectedTx.type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                      {formatBRL(selectedTx.amount)}
                    </span>
                  </div>
                </div>

                {/* Sugestões de Match Exato */}
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-emerald-500" /> Sugestões Exatas (Match de Centavos)
                  </h4>
                  
                  {selectedTx.type === "DEBIT" && suggestedPayables.length === 0 && <p className="text-xs text-zinc-500 italic">Nenhum Título A Pagar aberto com {formatBRL(selectedTx.amount)} exato.</p>}
                  {selectedTx.type === "DEBIT" && suggestedPayables.map((p: any) => (
                    <div key={p.id} className="p-3 bg-white border border-emerald-200 rounded-xl mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-zinc-900">A PAGAR: {p.title}</p>
                        <p className="text-xs text-zinc-500">Venc: {new Date(p.dueDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <button 
                        onClick={() => handleReconcile(p.id, "PAYABLE")}
                        disabled={reconciling}
                        className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors"
                      >
                        {reconciling ? "Selando..." : "Conciliar Aba"}
                      </button>
                    </div>
                  ))}

                  {selectedTx.type === "CREDIT" && suggestedReceivables.length === 0 && <p className="text-xs text-zinc-500 italic">Nenhum Título A Receber aberto com {formatBRL(selectedTx.amount)} exato.</p>}
                  {selectedTx.type === "CREDIT" && suggestedReceivables.map((r: any) => (
                    <div key={r.id} className="p-3 bg-white border border-emerald-200 rounded-xl mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-zinc-900">A RECEBER</p>
                        <p className="text-xs text-zinc-500">Venc: {new Date(r.dueDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <button 
                        onClick={() => handleReconcile(r.id, "RECEIVABLE")}
                        disabled={reconciling}
                        className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors"
                      >
                        {reconciling ? "Selando..." : "Conciliar Aba"}
                      </button>
                    </div>
                  ))}
                </div>

                <hr className="border-dashed border-zinc-200" />
                
                {/* Outros Títulos Manuais (se não for Match exato) */}
                <div>
                  <h4 className="text-xs font-bold text-zinc-500 mb-3">Busca Manual (Valores Diferentes)</h4>
                  <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100 mb-4">
                    Aviso de Segurança: O sistema travou a liquidação manual por valores divergentes nesta versão para garantir o centavo a centavo. Crie primeiro uma "Tarifa" em A Pagar para ajustar a diferença de deságio.
                  </p>
                  
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="w-full mt-4 py-3 border border-dashed border-zinc-300 rounded-xl text-zinc-600 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                  >
                    Abrir Criador Rápido de Título (Conciliação Exata)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm overflow-y-auto">
          <form onSubmit={handleQuickCreate} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-full">
            <div className="p-6 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Criar Novo Título para Conciliação</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Transação Original: <span className="font-mono bg-zinc-200 px-1 rounded">{selectedTx.description}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 font-bold mb-1">Cravado da Transação</p>
                <p className={`text-xl font-bold bg-zinc-100 px-3 py-1 rounded inline-block ${selectedTx.type === "CREDIT" ? "text-emerald-600" : "text-red-600"}`}>
                  {formatBRL(selectedTx.amount)}
                </p>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="flex bg-zinc-100 p-1 rounded-lg">
                <button type="button" onClick={() => setCreateTypeMode("PAYABLE")} className={`flex-1 py-2 text-sm font-bold rounded-md ${createTypeMode === "PAYABLE" ? "bg-white text-zinc-900 shadow" : "text-zinc-500 hover:text-zinc-700"}`}>
                  Contas a Pagar (Despesa)
                </button>
                <button type="button" onClick={() => setCreateTypeMode("RECEIVABLE")} className={`flex-1 py-2 text-sm font-bold rounded-md ${createTypeMode === "RECEIVABLE" ? "bg-white text-zinc-900 shadow" : "text-zinc-500 hover:text-zinc-700"}`}>
                  Contas a Receber (Receita)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Título / Histórico do Lançamento Oficial</label>
                  <input type="text" readOnly value={selectedTx.description} className="w-full text-sm p-3 rounded-lg border border-zinc-300 bg-black/5 text-zinc-600 font-medium" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Órgão / Cliente Relacionado</label>
                  <select value={createOrgId} onChange={e => setCreateOrgId(e.target.value)} required={createTypeMode === "RECEIVABLE"} className="w-full text-sm p-3 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="">Nenhum / Uso Geral</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Centro de Custo</label>
                  <select value={createCcId} onChange={e => setCreateCcId(e.target.value)} className="w-full text-sm p-3 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="">Nenhum</option>
                    {costCenters.map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Vincular a Ordem de Compra</label>
                  <select value={createOrderId} onChange={e => setCreateOrderId(e.target.value)} className="w-full text-sm p-3 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="">Acréscimo Geral</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>OF Nº {o.documentNumber || "S/N"} (Emissão: {new Date(o.createdAt).toLocaleDateString()})</option>
                    ))}
                  </select>
                </div>

                {createTypeMode === "PAYABLE" && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">Fornecedor ou Favorecido (Opcional)</label>
                    <input type="text" value={createSupplier} onChange={e => setCreateSupplier(e.target.value)} placeholder="Nome do destinatário do TED/PIX/Boleto" className="w-full text-sm p-3 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex gap-3 shrink-0">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-3 bg-white text-zinc-700 border border-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={reconciling} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                {reconciling && <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />}
                {reconciling ? "Processando Conciliação Instantânea..." : `Gerar ${createTypeMode === "PAYABLE" ? "A Pagar" : "A Receber"} & Conciliar`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

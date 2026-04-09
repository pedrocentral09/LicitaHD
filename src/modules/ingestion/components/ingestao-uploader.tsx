"use client";

import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";

interface ExtractedItem {
  description: string;
  quantity: number;
  unitPriceReturn: number;
}

interface ExtractionResult {
  organizationName: string;
  documentNumber: string;
  issuedAt: string;
  sellerName: string;
  items: ExtractedItem[];
}

export function IngestaoUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [orgFilter, setOrgFilter] = useState("");

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then(setOrgs);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setResult(null);
      setError(null);
      setSaved(false);
    } else {
      setError("Apenas arquivos PDF são aceitos.");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
      setSaved(false);
    }
  };

  function handleResultFieldChange(field: keyof ExtractionResult, value: string) {
    if (!result) return;
    setResult({ ...result, [field]: value });
  }

  function handleItemChange(index: number, field: keyof ExtractedItem, value: any) {
    if (!result) return;
    const newItems = [...result.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setResult({ ...result, items: newItems });
  }

  function handleAddItem() {
    if (!result) return;
    setResult({
      ...result,
      items: [...result.items, { description: "", quantity: 1, unitPriceReturn: 0 }]
    });
  }

  function handleRemoveItem(index: number) {
    if (!result) return;
    const newItems = result.items.filter((_, i) => i !== index);
    setResult({ ...result, items: newItems });
  }

  async function handleCreateOrg() {
    if (!orgFilter.trim() || isCreatingOrg) return;
    setIsCreatingOrg(true);
    try {
      const payload = { name: orgFilter.trim(), isAiGenerated: true };
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newOrg = await res.json();
        setOrgs([newOrg, ...orgs]);
        setSelectedOrgId(newOrg.id);
        setOrgFilter(newOrg.name);
      }
    } catch (e) {
      console.error("Erro ao criar órgão:", e);
    } finally {
      setIsCreatingOrg(false);
    }
  }

  async function handleExtract() {
    if (!file) return;
    setIsExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ingestion/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro na extração");
      }

      const data: ExtractionResult = await res.json();
      setResult(data);

      // Try to auto-select org by name match
      const matchedOrg = orgs.find((o) =>
        o.name.toLowerCase().includes(data.organizationName.toLowerCase()) ||
        data.organizationName.toLowerCase().includes(o.name.toLowerCase())
      );
      if (matchedOrg) {
        setSelectedOrgId(matchedOrg.id);
        setOrgFilter(matchedOrg.name);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido na extração";
      setError(message);
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSave() {
    if (!result || !selectedOrgId) return;
    setIsSaving(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrgId,
          documentNumber: result.documentNumber,
          issuedAt: result.issuedAt || null,
          items: result.items,
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar");
      setSaved(true);
    } catch {
      setError("Erro ao salvar a OC no banco de dados.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-all ${
          isDragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-zinc-300 bg-white hover:border-zinc-400"
        }`}
      >
        <Upload
          className={`h-12 w-12 mb-4 transition-colors ${
            isDragging ? "text-indigo-500" : "text-zinc-300"
          }`}
        />
        <p className="text-sm font-medium text-zinc-700 mb-1">
          Arraste o PDF da Ordem de Compra aqui
        </p>
        <p className="text-xs text-zinc-400 mb-4">ou clique para selecionar</p>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      {/* File Selected */}
      {file && !result && (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-sm font-medium text-zinc-900">{file.name}</p>
              <p className="text-xs text-zinc-400">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isExtracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extraindo com IA...
              </>
            ) : (
              "Extrair Dados com IA"
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Extraction Result - Validation Screen */}
      {result && !saved && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5">
            <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Dados Extraídos — Validação Obrigatória
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Confira cuidadosamente cada campo antes de aprovar. A responsabilidade da validação é do operador.
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Org selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Órgão Detectado pela IA
                </label>
                <input
                  type="text"
                  value={result.organizationName}
                  onChange={(e) => handleResultFieldChange('organizationName', e.target.value)}
                  className="w-full text-sm font-medium text-zinc-900 bg-amber-50 border border-amber-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-3 py-2 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Vincular ao Órgão Cadastrado *
                </label>
                <div className="relative">
                  <input
                    list="orgs-datalist"
                    placeholder="Filtrar por nome..."
                    value={orgs.find(o => o.id === selectedOrgId)?.name || orgFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOrgFilter(val);
                      const matched = orgs.find(o => o.name === val);
                      setSelectedOrgId(matched ? matched.id : "");
                    }}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <datalist id="orgs-datalist">
                    {orgs.map((org) => (
                      <option key={org.id} value={org.name} />
                    ))}
                  </datalist>
                </div>
                {!selectedOrgId && orgFilter.trim().length > 0 && (
                  <button
                    onClick={handleCreateOrg}
                    disabled={isCreatingOrg}
                    className="mt-1.5 w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                  >
                    {isCreatingOrg ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Cadastrar "{orgFilter}"
                  </button>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Nº do Documento / Empenho
                </label>
                <input
                  type="text"
                  value={result.documentNumber}
                  onChange={(e) => handleResultFieldChange('documentNumber', e.target.value)}
                  className="w-full text-sm font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-3 py-2 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Data da OF
                </label>
                <input
                  type="date"
                  value={result.issuedAt}
                  onChange={(e) => handleResultFieldChange('issuedAt', e.target.value)}
                  className="w-full text-sm font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-3 py-2 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Vendedor / Rep.
                </label>
                <input
                  type="text"
                  placeholder="Nome do Vendedor"
                  value={result.sellerName}
                  onChange={(e) => handleResultFieldChange('sellerName', e.target.value)}
                  className="w-full text-sm font-medium text-zinc-900 bg-zinc-50 border border-zinc-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-3 py-2 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-zinc-500">
                  Itens Extraídos ({result.items.length})
                </label>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 hover:bg-indigo-50 border border-zinc-200 hover:border-indigo-200 text-zinc-600 hover:text-indigo-600 rounded-md text-xs font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar Item
                </button>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                        #
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">
                        Descrição
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">
                        Qtd
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">
                        Vlr. Unit. Venda (R$)
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">
                        Total (R$)
                      </th>
                      <th className="px-2 py-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {result.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-2.5 text-zinc-400">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent focus:border-indigo-400 focus:bg-white px-1 py-0.5 text-zinc-900 font-medium outline-none transition-colors max-w-xs"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full text-right bg-transparent border-b border-transparent focus:border-indigo-400 focus:bg-white px-1 py-0.5 text-zinc-700 outline-none transition-colors"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={item.unitPriceReturn}
                            onChange={(e) => handleItemChange(idx, 'unitPriceReturn', parseFloat(e.target.value) || 0)}
                            className="w-full text-right bg-transparent border-b border-transparent focus:border-indigo-400 focus:bg-white px-1 py-0.5 text-zinc-700 outline-none transition-colors"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-zinc-900">
                          {(item.quantity * item.unitPriceReturn).toLocaleString(
                            "pt-BR",
                            { minimumFractionDigits: 2 }
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 hover:text-red-600 hover:bg-red-50 text-zinc-400 rounded transition-colors"
                            title="Remover Item"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-50 font-semibold">
                      <td colSpan={4} className="px-4 py-3 text-right text-zinc-700">
                        Total Geral:
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-900">
                        R${" "}
                        {result.items
                          .reduce((s, i) => s + i.quantity * i.unitPriceReturn, 0)
                          .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-zinc-200 p-5">
            <button
              onClick={() => {
                setResult(null);
                setFile(null);
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedOrgId || isSaving}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Validar e Salvar OC
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {saved && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 py-12">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h3 className="text-lg font-semibold text-emerald-800">OC Validada e Salva!</h3>
          <p className="mt-1 text-sm text-emerald-600">
            A ordem de compra foi enviada ao Kanban com status &quot;Rascunho&quot;
          </p>
          <button
            onClick={() => {
              setFile(null);
              setResult(null);
              setSaved(false);
            }}
            className="mt-6 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Importar Outra OC
          </button>
        </div>
      )}
    </div>
  );
}

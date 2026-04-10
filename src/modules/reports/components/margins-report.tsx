"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Search,
  ArrowUpDown,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  MinusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarginItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceReturn: number;
  costPrice: number;
  taxPercent: number;
  totalCost: number;
  margin: number;
  totalSell: number;
  totalCostAmount: number;
  profit: number;
  orgName: string;
  ocNumber: string;
  ocStatus: string;
  issuedAt: string | null;
}

type MarginFilter = "all" | "positive" | "negative";
type SortField = "description" | "margin" | "profit" | "orgName" | "ocNumber" | null;

export function MarginsReport() {
  const [items, setItems] = useState<MarginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [marginFilter, setMarginFilter] = useState<MarginFilter>("all");
  const [maxMarginThreshold, setMaxMarginThreshold] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/margins");
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (e) {
      console.error("Failed to load margins report:", e);
    }
    setLoading(false);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      if (sortAsc) setSortAsc(false);
      else { setSortField(null); setSortAsc(true); }
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (i) =>
          i.description.toLowerCase().includes(term) ||
          i.orgName.toLowerCase().includes(term) ||
          i.ocNumber.toLowerCase().includes(term)
      );
    }

    // Margin filter
    if (marginFilter === "positive") {
      result = result.filter((i) => i.margin >= 0);
    } else if (marginFilter === "negative") {
      result = result.filter((i) => i.margin < 0);
    }

    // Max margin threshold
    const threshold = parseFloat(maxMarginThreshold.replace(",", "."));
    if (!isNaN(threshold)) {
      result = result.filter((i) => i.margin <= threshold);
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        if (sortField === "description") {
          return sortAsc ? a.description.localeCompare(b.description) : b.description.localeCompare(a.description);
        }
        if (sortField === "margin") {
          return sortAsc ? a.margin - b.margin : b.margin - a.margin;
        }
        if (sortField === "profit") {
          return sortAsc ? a.profit - b.profit : b.profit - a.profit;
        }
        if (sortField === "orgName") {
          return sortAsc ? a.orgName.localeCompare(b.orgName) : b.orgName.localeCompare(a.orgName);
        }
        if (sortField === "ocNumber") {
          const numA = parseInt((a.ocNumber.match(/\d+/) || ["0"])[0], 10);
          const numB = parseInt((b.ocNumber.match(/\d+/) || ["0"])[0], 10);
          return sortAsc ? numA - numB : numB - numA;
        }
        return 0;
      });
    }

    return result;
  }, [items, searchTerm, marginFilter, maxMarginThreshold, sortField, sortAsc]);

  // Summary stats
  const stats = useMemo(() => {
    const totalItems = filteredItems.length;
    const totalProfit = filteredItems.reduce((s, i) => s + i.profit, 0);
    const totalSell = filteredItems.reduce((s, i) => s + i.totalSell, 0);
    const totalCost = filteredItems.reduce((s, i) => s + i.totalCostAmount, 0);
    const avgMargin = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : 0;
    const negativeCount = filteredItems.filter((i) => i.margin < 0).length;
    const lowCount = filteredItems.filter((i) => i.margin >= 0 && i.margin < 5).length;
    const healthyCount = filteredItems.filter((i) => i.margin >= 5).length;

    return { totalItems, totalProfit, totalSell, totalCost, avgMargin, negativeCount, lowCount, healthyCount };
  }, [filteredItems]);

  function exportCSV() {
    const headers = ["Descrição", "Órgão", "OC", "Qtd", "Preço Venda", "Custo Unit.", "Imposto %", "Custo Total", "Margem %", "Lucro Total"];
    const rows = filteredItems.map((i) => [
      i.description,
      i.orgName,
      i.ocNumber,
      i.quantity,
      i.unitPriceReturn.toFixed(2),
      i.costPrice.toFixed(2),
      i.taxPercent.toFixed(2),
      i.totalCost.toFixed(2),
      i.margin.toFixed(2),
      i.profit.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-margens-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function SortHeader({ field, label, className }: { field: SortField; label: string; className?: string }) {
    return (
      <th
        className={cn("px-3 py-3 cursor-pointer hover:bg-zinc-100 transition-colors select-none", className)}
        onClick={() => handleSort(field)}
      >
        <div className={cn("flex items-center gap-1", className?.includes("text-right") && "justify-end")}>
          {label}
          {sortField === field && <span className="text-xs">{sortAsc ? "↑" : "↓"}</span>}
        </div>
      </th>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Carregando relatório de margens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Relatório de Margens
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Análise detalhada de margem bruta por item com filtros avançados
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Itens Analisados</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{stats.totalItems}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Margem Média Ponderada</p>
          <p className={cn("text-2xl font-bold mt-1", stats.avgMargin >= 5 ? "text-emerald-600" : stats.avgMargin >= 0 ? "text-amber-600" : "text-red-600")}>
            {stats.avgMargin.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-xs text-zinc-500 font-medium">Lucro Total Bruto</p>
          <p className={cn("text-2xl font-bold mt-1", stats.totalProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
            R$ {stats.totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">Saúde Geral</p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-zinc-700">{stats.negativeCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-zinc-700">{stats.lowCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-zinc-700">{stats.healthyCount}</span>
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Prejuízo · Baixa · Saudável</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, órgão ou OC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Margin Filter Pills */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-zinc-400" />
            {([
              ["all", "Todas", undefined],
              ["positive", "Positivas", "text-emerald-600"],
              ["negative", "Negativas", "text-red-600"],
            ] as const).map(([value, label, color]) => (
              <button
                key={value}
                onClick={() => setMarginFilter(value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  marginFilter === value
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300 hover:text-indigo-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Threshold */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">Margem até:</span>
            <div className="relative w-24">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Ex: 10"
                value={maxMarginThreshold}
                onChange={(e) => setMaxMarginThreshold(e.target.value)}
                className="w-full pr-6 pl-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium text-xs">
              <tr>
                <SortHeader field="description" label="Descrição" />
                <SortHeader field="orgName" label="Órgão" />
                <SortHeader field="ocNumber" label="OC" />
                <th className="px-3 py-3">Qtd</th>
                <th className="px-3 py-3 text-right">Venda (R$)</th>
                <th className="px-3 py-3 text-right">Custo (R$)</th>
                <th className="px-3 py-3 text-right">Imposto %</th>
                <SortHeader field="margin" label="Margem %" className="text-right" />
                <SortHeader field="profit" label="Lucro (R$)" className="text-right" />
                <th className="px-3 py-3 text-center">Sinal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center gap-2">
                      <BarChart3 className="w-8 h-8 text-zinc-300" />
                      <p className="font-medium">Nenhum item encontrado com os filtros atuais</p>
                      <p className="text-xs">Ajuste seus filtros ou adicione custos nos itens para calcular as margens.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className={cn("hover:bg-zinc-50 transition-colors", item.margin < 0 && "bg-red-50/40")}>
                    <td className="px-3 py-3 font-medium text-zinc-800 max-w-[250px] truncate" title={item.description}>
                      {item.description}
                    </td>
                    <td className="px-3 py-3 text-zinc-500 text-xs max-w-[150px] truncate" title={item.orgName}>
                      {item.orgName}
                    </td>
                    <td className="px-3 py-3 text-zinc-600 font-mono text-xs">{item.ocNumber}</td>
                    <td className="px-3 py-3 text-zinc-600">{item.quantity}</td>
                    <td className="px-3 py-3 text-right text-zinc-700">
                      {item.unitPriceReturn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right text-zinc-700">
                      {item.costPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right text-zinc-500">
                      {item.taxPercent.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold",
                          item.margin >= 15
                            ? "bg-emerald-100 text-emerald-700"
                            : item.margin >= 5
                            ? "bg-amber-100 text-amber-700"
                            : item.margin >= 0
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {item.margin.toFixed(1).replace(".", ",")}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={cn("font-bold text-xs", item.profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {item.profit >= 0 ? "+" : ""}
                        {item.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {item.margin >= 15 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : item.margin >= 5 ? (
                        <TrendingUp className="w-4 h-4 text-amber-500 mx-auto" />
                      ) : item.margin >= 0 ? (
                        <MinusCircle className="w-4 h-4 text-orange-500 mx-auto" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {filteredItems.length > 0 && (
          <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Exibindo <strong className="text-zinc-700">{filteredItems.length}</strong> de{" "}
              <strong className="text-zinc-700">{items.length}</strong> itens com custo cadastrado
            </span>
            <div className="flex items-center gap-4">
              <span>
                Venda Total: <strong className="text-zinc-700">R$ {stats.totalSell.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              </span>
              <span>
                Custo Total: <strong className="text-zinc-700">R$ {stats.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
              </span>
              <span className={cn("font-bold", stats.totalProfit >= 0 ? "text-emerald-600" : "text-red-600")}>
                Lucro: R$ {stats.totalProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

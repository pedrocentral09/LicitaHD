"use client";

import { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";

interface ReequilibrioItem {
  id: string;
  description: string;
  costPrice: number;
  quantity: number;
  unitPriceReturn: number;
  purchaseOrder: { documentNumber: string; organization: { name: string } };
}

export function ReequilibrioPanel() {
  const [items, setItems] = useState<ReequilibrioItem[]>([]);

  useEffect(() => {
    fetch("/api/procurement-groups/alerts")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  function generateReport(item: ReequilibrioItem) {
    const margin = ((item.unitPriceReturn - item.costPrice) / item.unitPriceReturn) * 100;
    const variation = (((item.costPrice - item.unitPriceReturn) / item.unitPriceReturn) * 100).toFixed(2);
    const today = new Date().toLocaleDateString("pt-BR");

    const content = `
OFÍCIO DE PEDIDO DE REEQUILÍBRIO ECONÔMICO-FINANCEIRO

Data: ${today}

Ao(À)
${item.purchaseOrder.organization.name}

Ref.: Pedido de Reajuste de Preço — Artigo 124 da Lei 14.133/2021 — OC: ${item.purchaseOrder.documentNumber}

Prezados Senhores,

Vimos, respeitosamente, solicitar o REEQUILÍBRIO ECONÔMICO-FINANCEIRO do(s) item(ns) abaixo descrito(s), conforme amparo legal previsto no Art. 124, inciso II, alínea "d", da Lei Federal nº 14.133/2021, que dispõe sobre a recomposição do equilíbrio econômico-financeiro do contrato em caso de álea econômica extraordinária e extracontratual.

ITEM: ${item.description}
PREÇO CONTRATADO (VENDA): R$ ${item.unitPriceReturn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
PREÇO ATUAL DE MERCADO (CUSTO): R$ ${item.costPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
VARIAÇÃO: ${variation}%

OC AFETADA: ${item.purchaseOrder.documentNumber}

Diante da variação significativa demonstrada acima, solicitamos a análise e deferimento do reajuste do preço unitário para recomposição da margem, nos termos da legislação vigente.

Atenciosamente,
[Nome da Empresa]
[CNPJ]
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reequilibrio_${item.purchaseOrder.documentNumber}_${item.description.replace(/\s+/g, "_").slice(0, 30)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <FileText className="h-12 w-12 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500">
            Nenhum item elegível para reequilíbrio no momento
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Itens com margem negativa ou muito baixa aparecerão aqui
          </p>
        </div>
      )}

      {items.map((item) => {
        const margin = ((item.unitPriceReturn - item.costPrice) / item.unitPriceReturn) * 100;

        return (
          <div
            key={item.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-zinc-900">
                  {item.description}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {item.purchaseOrder.organization.name} — OC: {item.purchaseOrder.documentNumber}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                  <span>
                    Venda: R${" "}
                    {item.unitPriceReturn.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span>
                    Custo: R${" "}
                    {item.costPrice.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span
                    className={`font-bold ${
                      margin < 0 ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    Margem: {margin.toFixed(1)}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => generateReport(item)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Download className="h-4 w-4" />
                Gerar Ofício
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

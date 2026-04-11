"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface AlertItem {
  id: string;
  description: string;
  costPrice: number;
  quantity: number;
  unitPriceReturn: number;
  purchaseOrder: { documentNumber: string; organization: { name: string } };
}

export function AlertasPanel() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    fetch("/api/procurement-groups/alerts")
      .then((r) => r.json())
      .then(setAlerts);
  }, []);

  return (
    <div className="space-y-4">
      {alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500">Nenhum alerta de margem no momento</p>
          <p className="text-xs text-zinc-400 mt-1">
            Itens com margem abaixo de 5% aparecerão aqui automaticamente
          </p>
        </div>
      )}

      {alerts.map((item) => {
        const margin = ((item.unitPriceReturn - item.costPrice) / item.unitPriceReturn) * 100;

        return (
          <div
            key={item.id}
            className={`rounded-xl border-l-4 bg-white p-5 shadow-sm ${
              margin < 0 ? "border-red-500" : "border-amber-400"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-zinc-900">{item.description}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {item.purchaseOrder.organization.name} — OC: {item.purchaseOrder.documentNumber}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  margin < 0
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {margin < 0 ? "PREJUÍZO" : "MARGEM BAIXA"}: {margin.toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 flex gap-6 text-xs text-zinc-500">
              <span>Custo: R$ {item.costPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              <span>Venda: R$ {item.unitPriceReturn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              <span>Qtd Total: {item.quantity.toLocaleString("pt-BR")}</span>
            </div>
            <div className="mt-3">
              <a
                href="/reequilibrio"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                → Solicitar Reequilíbrio
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

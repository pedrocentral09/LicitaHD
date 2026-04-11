"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function getAvailableQty(item: any): number {
  const shipped = item.shipmentItems?.reduce((s: any, si: any) => s + si.quantity, 0) || 0;
  return Math.max(0, item.quantity - shipped);
}

function getItemsWithAvailability(oc: any) {
  if (!oc.items) return [];
  return oc.items
    .map((item: any) => ({ ...item, available: getAvailableQty(item) }))
    .filter((item: any) => item.available > 0);
}

function isOcDelayed(oc: any, org: any): boolean {
  const baseDateStr = oc.issuedAt || oc.createdAt;
  if (!baseDateStr || !org.deliveryDays) return false;
  
  const itemsWithAvail = getItemsWithAvailability(oc);
  const allDelivered = oc.shipments && oc.shipments.length > 0 && oc.shipments.every((s: any) => s.status === "DELIVERED") && itemsWithAvail.length === 0;
  if (allDelivered) return false;

  const issuedDate = new Date(baseDateStr + (baseDateStr.includes("T") ? "" : "T00:00:00"));
  const deadlineDate = new Date(issuedDate);
  deadlineDate.setDate(deadlineDate.getDate() + org.deliveryDays);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  deadlineDate.setHours(0,0,0,0);

  return today > deadlineDate;
}

function getDelayDays(oc: any, org: any): number {
  const baseDateStr = oc.issuedAt || oc.createdAt;
  if (!baseDateStr || !org.deliveryDays) return 0;
  
  const issuedDate = new Date(baseDateStr + (baseDateStr.includes("T") ? "" : "T00:00:00"));
  const deadlineDate = new Date(issuedDate);
  deadlineDate.setDate(deadlineDate.getDate() + org.deliveryDays);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  deadlineDate.setHours(0,0,0,0);

  const diffTime = today.getTime() - deadlineDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function AlertasAtrasosDashboard() {
  const [delayedOcs, setDelayedOcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOc, setExpandedOc] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/deliveries-dashboard?all=true")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const delayed: any[] = [];
          data.forEach(org => {
            org.purchaseOrders?.forEach((oc: any) => {
              if (isOcDelayed(oc, org)) {
                delayed.push({ ...oc, organization: org, delayDays: getDelayDays(oc, org) });
              }
            });
          });
          delayed.sort((a,b) => b.delayDays - a.delayDays);
          setDelayedOcs(delayed);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          Alertas de Atrasos
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Monitoramento de pedidos que ultrapassaram o prazo de entrega estipulado pelo órgão.</p>
      </div>

      <div className="space-y-4">
        {delayedOcs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-50 mb-4" />
            <p className="text-zinc-500">Nenhum pedido atrasado no momento.</p>
          </div>
        )}

        {delayedOcs.map(oc => (
          <div key={oc.id} className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-red-50/50 transition-colors"
              onClick={() => setExpandedOc(expandedOc === oc.id ? null : oc.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900">{oc.organization?.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1">
                    <span className="flex items-center gap-1 font-medium text-red-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {oc.delayDays} dias de atraso
                    </span>
                    <span>•</span>
                    <span>OC: {oc.documentNumber}</span>
                    <span>•</span>
                    <span>Data Base: {new Date(oc.issuedAt || oc.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
              {expandedOc === oc.id ? <ChevronUp className="w-5 h-5 text-red-400" /> : <ChevronDown className="w-5 h-5 text-red-400" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckCircle(props: any) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}

import { EntregasPanel } from "@/modules/logistica/components/entregas-panel";
import { Truck } from "lucide-react";

export default function EntregasPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900">
          <Truck className="h-6 w-6 text-indigo-600" />
          Aguardando Entrega
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Acompanhe e confirme o recebimento físico das Ordens de Compra já cotadas.
        </p>
      </div>
      
      <EntregasPanel />
    </div>
  );
}

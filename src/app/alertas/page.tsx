import { AlertasPanel } from "@/modules/purchasing/components/alertas-panel";

export default function AlertasPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Alertas de Margem</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Itens com margem baixa ou negativa que precisam de atenção
        </p>
      </div>
      <AlertasPanel />
    </div>
  );
}

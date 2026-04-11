import { ReequilibrioPanel } from "@/modules/governanca/components/reequilibrio-panel";

export default function ReequilibrioPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Reequilíbrio Econômico-Financeiro</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gere ofícios automáticos de pedido de reajuste com base na variação de custos
        </p>
      </div>
      <ReequilibrioPanel />
    </div>
  );
}

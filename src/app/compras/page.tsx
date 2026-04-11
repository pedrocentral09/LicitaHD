import { ComprasPanel } from "@/modules/compras/components/compras-panel";

export default function ComprasPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Painel de Compras</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Preencha custos, fator de conversão e data de entrega para cada grupo de itens
        </p>
      </div>
      <ComprasPanel />
    </div>
  );
}

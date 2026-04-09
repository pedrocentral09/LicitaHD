import { OrdensPanel } from "@/modules/orders/components/ordens-panel";

export const metadata = {
  title: "Ordens de Compra | Hub Licitações",
};

export default function OrdensPage() {
  return (
    <div className="flex h-full flex-col bg-zinc-50/50">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Gestão de Ordens de Compra</h1>
          <p className="text-sm text-zinc-500">
            Painel mestre permanente com todas as ordens extraídas pelo sistema.
          </p>
        </div>
      </header>

      <main className="flex-1 p-6">
        <OrdensPanel />
      </main>
    </div>
  );
}

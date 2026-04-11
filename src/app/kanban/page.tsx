import { KanbanBoard } from "@/modules/licitacoes/components/kanban-board";

export default function KanbanPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Kanban de Ordens de Compra</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Acompanhe o ciclo de vida de cada OC em tempo real
        </p>
      </div>
      <KanbanBoard />
    </div>
  );
}

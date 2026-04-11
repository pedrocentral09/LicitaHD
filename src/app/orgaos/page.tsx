import { OrgaosList } from "@/modules/licitacoes/components/orgaos-list";

export default function OrgaosPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Órgãos / Prefeituras</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie os órgãos públicos e prefeituras cadastrados
        </p>
      </div>
      <OrgaosList />
    </div>
  );
}

import { IngestaoUploader } from "@/modules/ingestion/components/ingestao-uploader";

export default function IngestaoPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Ingestão Inteligente</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Arraste o PDF da Ordem de Compra e deixe a IA extrair os dados automaticamente
        </p>
      </div>
      <IngestaoUploader />
    </div>
  );
}

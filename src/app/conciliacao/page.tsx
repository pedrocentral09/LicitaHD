import { ReconciliationPanel } from "@/modules/financeiro/components/conciliacao-panel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConciliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ bankId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const awaitedParams = await searchParams;
  const bankId = awaitedParams.bankId;

  if (!bankId) {
    redirect("/contas-correntes");
  }

  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: bankId }
  });

  if (!bankAccount) {
    redirect("/contas-correntes");
  }

  return (
    <div className="p-8">
      <div className="mb-8 border-b border-zinc-200 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Conciliando: {bankAccount.accountName}
          </h1>
          <p className="mt-1 text-sm font-mono text-zinc-500">
            {bankAccount.bankName} | Ag: {bankAccount.agency || "-"} C/C: {bankAccount.account}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Saldo Atualizado</p>
          <p className={`text-2xl font-bold ${bankAccount.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(bankAccount.balance)}
          </p>
        </div>
      </div>
      
      <ReconciliationPanel bankId={bankId} />
    </div>
  );
}

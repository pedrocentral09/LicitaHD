import { BankAccountPanel } from "@/modules/financeiro/components/contas-correntes-panel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ContasCorrentesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Contas Correntes</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie os saldos fiduciários e acompanhe suas conciliações via OFX.
        </p>
      </div>
      <BankAccountPanel />
    </div>
  );
}

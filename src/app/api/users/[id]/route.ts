import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role !== "GOD") {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Proteção rigorosa: Não permita que o usuário se delete (tentativa de auto-destruição).
    if (session?.user?.id === id) {
      return NextResponse.json(
        { error: "Ação bloqueada: você não pode deletar a sua própria conta." },
        { status: 400 }
      );
    }

    // Primeiro verifica se o usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Users API DELETE]", error);
    return NextResponse.json(
      { error: "Erro interno ao deletar usuário" },
      { status: 500 }
    );
  }
}

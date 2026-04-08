import { NextResponse } from "next/server";
import { extractPurchaseOrderFromPDF } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    // 1. Validar arquivo
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Apenas arquivos PDF são aceitos." },
        { status: 400 }
      );
    }

    // Limite de 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "O arquivo excede o limite de 10MB." },
        { status: 400 }
      );
    }

    // 2. Converter para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extrair dados via GPT-4o
    const result = await extractPurchaseOrderFromPDF(buffer);

    // 4. Retornar resultado
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[Ingestion Extract] Erro:", error);

    const message =
      error instanceof Error ? error.message : "Erro interno na extração";

    // Detectar erros específicos da API
    if (message.includes("401") || message.includes("Incorrect API key")) {
      return NextResponse.json(
        { error: "API key da OpenAI inválida. Verifique o .env." },
        { status: 401 }
      );
    }

    if (message.includes("429") || message.includes("rate limit")) {
      return NextResponse.json(
        { error: "Limite de requisições da OpenAI atingido. Tente em 1 minuto." },
        { status: 429 }
      );
    }

    if (message.includes("insufficient_quota")) {
      return NextResponse.json(
        { error: "Créditos da OpenAI esgotados. Verifique seu billing." },
        { status: 402 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

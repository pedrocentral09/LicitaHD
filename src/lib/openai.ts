import OpenAI from "openai";
import pdf from "pdf-parse";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "missing-key-during-build",
});

// ----------------------------------------------------------------
// Schema esperado pelo front-end (IngestaoUploader)
// ----------------------------------------------------------------
export interface ExtractedItem {
  description: string;
  quantity: number;
  unitPriceReturn: number;
}

export interface ExtractionResult {
  organizationName: string;
  documentNumber: string;
  issuedAt: string;
  sellerName: string;
  items: ExtractedItem[];
}

// ----------------------------------------------------------------
// Prompt engenheirado para licitações brasileiras
// ----------------------------------------------------------------
const SYSTEM_PROMPT = `Você é um assistente especializado em extrair dados estruturados de Ordens de Compra (OC), Notas de Empenho, Autorizações de Fornecimento (AF) e documentos similares de licitações públicas brasileiras.

Analise o TEXTO extraído do documento PDF e extraia TODAS as informações a seguir.

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS o JSON puro, sem texto adicional, sem markdown, sem backticks.
2. Se não encontrar um campo, use string vazia "" para textos e "" para datas.
3. Quantidades e preços devem ser NÚMEROS (não strings). Use ponto como separador decimal (ex: 28.50, não 28,50).
4. "unitPriceReturn" é o preço unitário de VENDA à administração pública (preço licitado/registrado/da ata).
5. Extraia TODOS os itens do documento, sem pular nenhum.
6. "documentNumber" pode ser: número do empenho, número da OC, número da AF, número da nota, ou qualquer identificador do documento.
7. "organizationName" é o nome do órgão público comprador (prefeitura, secretaria, autarquia, etc.).
8. "issuedAt" é a data de emissão no formato YYYY-MM-DD.
9. "sellerName" é o nome do contato, vendedor ou representante comercial mencionado na ordem (se não existir, deixe vazio "" e não confunda com o CNPJ do fornecedor).
10. Na "description" de cada item, você DEVE extrair a descrição COMPLETA, longa e exata do produto. Inclua marcas, especificações, portarias, e números técnicos se existirem. Não resuma.
11. Se o texto estiver confuso ou ambíguo, faça o melhor esforço para extrair as informações.

FORMATO DE SAÍDA:
{"organizationName":"Nome do órgão","documentNumber":"ABC-123","issuedAt":"2025-01-15","sellerName":"João Silva","items":[{"description":"DESCRIÇÃO LONGA E COMPLETA DO PRODUTO AQUI","quantity":100,"unitPriceReturn":25.50}]}`;

// ----------------------------------------------------------------
// Função principal de extração via GPT-4o
// ----------------------------------------------------------------
export async function extractPurchaseOrderFromPDF(
  pdfBuffer: Buffer
): Promise<ExtractionResult> {
  // 1. Extrair texto do PDF usando pdf-parse v1
  const pdfData = await pdf(pdfBuffer);
  const rawText = pdfData?.text;
  const extractedText = typeof rawText === "string" ? rawText : String(rawText || "");

  if (!extractedText || extractedText.trim().length < 20) {
    throw new Error(
      "Não foi possível extrair texto do PDF. O documento pode ser uma imagem escaneada. Por favor, utilize um PDF digital (não escaneado)."
    );
  }

  // Limitar o texto para não exceder o contexto (primeiras ~15000 chars)
  const truncatedText = extractedText.substring(0, 15000);

  // 2. Enviar ao GPT-4o
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extraia os dados desta Ordem de Compra / Nota de Empenho:\n\n---\n${truncatedText}\n---`,
      },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("A IA não retornou nenhuma resposta.");
  }

  // 3. Parse do JSON — remove possíveis wrappers de markdown
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: ExtractionResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `A IA retornou uma resposta inválida. Tente novamente. Resposta: ${content.substring(0, 200)}`
    );
  }

  // 4. Validação do schema
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error("A resposta da IA não contém os itens esperados.");
  }

  // 5. Sanitizar e garantir tipos corretos
  return {
    organizationName: String(parsed.organizationName || "Não identificado"),
    documentNumber: String(parsed.documentNumber || "Não identificado"),
    issuedAt: String(parsed.issuedAt || ""),
    sellerName: String(parsed.sellerName || ""),
    items: parsed.items.map((item) => ({
      description: String(item.description || "Item sem descrição"),
      quantity: Number(item.quantity) || 0,
      unitPriceReturn: Number(item.unitPriceReturn) || 0,
    })),
  };
}

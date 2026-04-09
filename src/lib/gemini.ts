import { GoogleGenAI } from "@google/genai";

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
// Prompt engenheirado para licitações brasileiras via Visão/Multimodal
// ----------------------------------------------------------------
const SYSTEM_PROMPT = `Você é um assistente especializado em extrair dados estruturados de Ordens de Compra (OC), Notas de Empenho, Autorizações de Fornecimento (AF) e documentos similares de licitações públicas brasileiras.

Você está recebendo o arquivo PDF original. O documento contém textos, grades e tabelas. Analise a formatação visual e o conteúdo com cuidado extremo.

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS o JSON rigorosamente.
2. Se não encontrar um campo, use string vazia "" para textos e "" para datas.
3. Quantidades e preços devem ser NÚMEROS (não strings). Use ponto como separador decimal (ex: 28.50, não 28,50).
4. "unitPriceReturn" é o preço unitário de VENDA à administração pública (preço licitado/registrado/da ata).
5. Extraia TODOS os itens do documento. Cuidado para não mesclar colunas de itens diferentes. Respeite as tabelas da imagem/PDF.
6. "documentNumber" pode ser: número do empenho, número da OC, número da AF, número da nota, ou qualquer identificador do documento.
7. "organizationName" é o nome do órgão público comprador (prefeitura, secretaria, autarquia, etc.).
8. "issuedAt" é a data de emissão no formato YYYY-MM-DD.
9. "sellerName" é o nome do contato, vendedor ou representante comercial mencionado na ordem (se não existir, deixe vazio "").
10. Na "description" de cada item, você DEVE extrair a descrição COMPLETA. Inclua marcas, especificações, portarias.

Você DEVE estruturar o JSON de saída da seguinte forma (utilize este exato schema JSON):
{
  "organizationName": string,
  "documentNumber": string,
  "issuedAt": string,
  "sellerName": string,
  "items": [
    {
      "description": string,
      "quantity": number,
      "unitPriceReturn": number
    }
  ]
}
`;

// ----------------------------------------------------------------
// Função principal de extração via Gemini 1.5 Pro
// ----------------------------------------------------------------
export async function extractPurchaseOrderFromPDF(
  pdfBuffer: Buffer
): Promise<ExtractionResult> {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "missing-key-during-build") {
    throw new Error("Local/Railway: A variavel GEMINI_API_KEY esta morta ou lida como nula no momento da requisicao!");
  }
  
  apiKey = apiKey.trim();

  const ai = new GoogleGenAI({ apiKey });

  // Converter buffer direto para Base64 (sem quebrar em texto via pdf-parse)
  const base64Data = pdfBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      SYSTEM_PROMPT,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data,
        },
      },
      "Extraia os dados deste documento de licitação e forneça a resposta em formato JSON aderente ao schema solicitado.",
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const content = response.text;
  if (!content) {
    throw new Error("A IA não retornou nenhuma resposta.");
  }

  // Parse do JSON
  let parsed: ExtractionResult;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      `A IA retornou uma resposta JSON inválida. Detalhes: ${content.substring(0, 200)}`
    );
  }

  // Validação do schema
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error("A resposta da IA não contém os itens esperados (array de objetos).");
  }

  // Sanitizar e garantir tipos corretos
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

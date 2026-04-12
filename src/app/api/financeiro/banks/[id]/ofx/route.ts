import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({ where: { id } });
    if (!bankAccount) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No OFX file uploaded" }, { status: 400 });
    }

    let fileText = await file.text();
    
    // OFX Sanitization for Brazilian Banks
    fileText = fileText.replace(/^\uFEFF/, "");
    
    // Ao invés da biblioteca que quebra em SGMLs sujos, extraímos direto via Regex seguro
    const stmtTrnBlocks = fileText.split(/<STMTTRN>/i).slice(1);
    
    if (stmtTrnBlocks.length === 0) {
      return NextResponse.json({ error: "No transactions (<STMTTRN>) found in OFX file" }, { status: 400 });
    }

    let importedCount = 0;
    
    const getTag = (block: string, tag: string) => {
      const regex = new RegExp(`<${tag}>([^<\\n\\r]+)`, 'i');
      const match = block.match(regex);
      return match ? match[1].trim() : null;
    };

    const transactionsToInsert: any[] = [];

    for (const block of stmtTrnBlocks) {
      const amtStr = getTag(block, 'TRNAMT');
      if (!amtStr) continue;

      const fitId = getTag(block, 'FITID') || `GEN_${Date.now()}_${Math.random()}`;
      const memo = getTag(block, 'MEMO') || getTag(block, 'NAME') || "Sem descrição";
      const dtPosted = getTag(block, 'DTPOSTED');
      
      const amount = parseFloat(amtStr);
      let date = new Date();
      if (dtPosted && dtPosted.length >= 8) {
        const year = parseInt(dtPosted.substring(0, 4));
        const month = parseInt(dtPosted.substring(4, 6)) - 1;
        const day = parseInt(dtPosted.substring(6, 8));
        date = new Date(year, month, day);
      }

      const type = amount >= 0 ? "CREDIT" : "DEBIT";

      transactionsToInsert.push({
        fitId,
        type,
        amount: Math.abs(amount),
        date,
        description: memo,
        bankAccountId: id,
        status: "PENDING"
      });
      importedCount++;
    }

    if (transactionsToInsert.length > 0) {
      await prisma.bankTransaction.createMany({
        data: transactionsToInsert,
        skipDuplicates: true
      });
    }

    // Tentar atualizar o saldo se tiver a flag de saldo atual do banco (LEDGERBAL)
    const balAmtMatch = fileText.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([^<\n\r]+)/i);
    if (balAmtMatch) {
      await prisma.bankAccount.update({
        where: { id },
        data: { balance: parseFloat(balAmtMatch[1]) }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Parsed ${importedCount} transactions from OFX.`
    });

  } catch (error: any) {
    console.error("OFX Parse Error:", error);
    return NextResponse.json({ error: "Failed to process OFX file", details: error.message }, { status: 500 });
  }
}

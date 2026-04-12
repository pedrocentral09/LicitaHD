import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import ofxParser from "node-ofx-parser"; // will use TS declare module

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

    const fileText = await file.text();
    
    // Parando o OFX
    const data = ofxParser.parse(fileText);
    
    // OFX nodes can be tricky depending on the bank. Usually:
    // data.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN
    const stmtTrnRs = data?.OFX?.BANKMSGSRSV1?.STMTTRNRS;
    if (!stmtTrnRs) {
      return NextResponse.json({ error: "Invalid or unsupported OFX format (missing STMTTRNRS)" }, { status: 400 });
    }

    let stmtTrn = stmtTrnRs.STMTRS?.BANKTRANLIST?.STMTTRN;
    if (!stmtTrn) {
      return NextResponse.json({ error: "No transactions found in OFX file" }, { status: 400 });
    }

    // Force array if there's only one transaction
    if (!Array.isArray(stmtTrn)) {
      stmtTrn = [stmtTrn];
    }

    let importedCount = 0;
    
    for (const trx of stmtTrn) {
      const amount = parseFloat(trx.TRNAMT);
      const fitId = trx.FITID;
      const memo = trx.MEMO || trx.NAME || "Sem descrição";
      
      // OFX dates are format YYYYMMDDHHMMSS or similar (e.g. 20240902120000[-3:BRT])
      const dateStr = trx.DTPOSTED; 
      let date = new Date();
      if (dateStr && dateStr.length >= 8) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        date = new Date(year, month, day);
      }

      const type = amount >= 0 ? "CREDIT" : "DEBIT";

      // Upsert by fitId to prevent duplicates
      await prisma.bankTransaction.upsert({
        where: { fitId },
        update: {}, // if exists, do nothing
        create: {
          fitId,
          type,
          amount: Math.abs(amount),
          date,
          description: memo,
          bankAccountId: id,
          status: "PENDING"
        }
      });
      importedCount++;
    }

    // Update real balance if specified in OFX (data.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.LEDGERBAL.BALAMT)
    const ledgerBal = stmtTrnRs.STMTRS?.LEDGERBAL?.BALAMT;
    if (ledgerBal) {
      await prisma.bankAccount.update({
        where: { id },
        data: { balance: parseFloat(ledgerBal) }
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

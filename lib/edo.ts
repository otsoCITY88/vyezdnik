// Электронный документооборот: интерфейс провайдера + локальный провайдер,
// который собирает «ЭДО-пакет» (ZIP с .docx, opisi.xml, signature placeholder)
// в storage/edo. Реальные провайдеры (СБИС, Диадок) подключаются по этому же интерфейсу.

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import PizZip from "pizzip";

const STORAGE = process.env.STORAGE_DIR || join(process.cwd(), "storage");

export type EdoProviderName = "local" | "sbis" | "diadoc";

export interface EdoSendInput {
  documentId: string;
  outgoingNumber: string;
  outgoingDate: Date;
  subject: string;
  docxPath: string;
  recipient: { name: string; inn?: string; email?: string };
  sender: { name: string; inn: string; ogrn?: string; legalAddress?: string };
  signaturePath?: string;
}

export interface EdoSendResult {
  trackId: string;
  packagePath: string;
  status: "queued" | "sent";
  provider: EdoProviderName;
}

export interface EdoProvider {
  name: EdoProviderName;
  send(input: EdoSendInput): Promise<EdoSendResult>;
  getStatus(trackId: string): Promise<{ status: string; deliveredAt?: Date; signedAt?: Date }>;
}

// ---------- Local provider ----------
export const localProvider: EdoProvider = {
  name: "local",
  async send(input) {
    const dir = join(STORAGE, "edo");
    mkdirSync(dir, { recursive: true });
    const trackId = `LOCAL-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const zip = new PizZip();
    // 1. Сам документ
    const docxBuf = readFileSync(input.docxPath);
    zip.file(`document/${basename(input.docxPath)}`, docxBuf);

    // 2. Подпись (если есть)
    if (input.signaturePath) {
      try {
        const sigBuf = readFileSync(input.signaturePath);
        zip.file(`signatures/${basename(input.signaturePath)}`, sigBuf);
      } catch {/* skip */}
    } else {
      zip.file(`signatures/placeholder.txt`, "Документ не подписан УКЭП. Загрузите .sig перед отправкой в боевое ЭДО.");
    }

    // 3. Опись (минимально совместимая с диадок-style контейнером)
    const opisi = `<?xml version="1.0" encoding="UTF-8"?>
<EDOMeta provider="local" trackId="${trackId}">
  <Document>
    <OutgoingNumber>${escapeXml(input.outgoingNumber)}</OutgoingNumber>
    <OutgoingDate>${input.outgoingDate.toISOString()}</OutgoingDate>
    <Subject>${escapeXml(input.subject)}</Subject>
    <FileName>${escapeXml(basename(input.docxPath))}</FileName>
  </Document>
  <Sender>
    <Name>${escapeXml(input.sender.name)}</Name>
    <Inn>${escapeXml(input.sender.inn)}</Inn>
    ${input.sender.ogrn ? `<Ogrn>${escapeXml(input.sender.ogrn)}</Ogrn>` : ""}
    ${input.sender.legalAddress ? `<Address>${escapeXml(input.sender.legalAddress)}</Address>` : ""}
  </Sender>
  <Recipient>
    <Name>${escapeXml(input.recipient.name)}</Name>
    ${input.recipient.inn ? `<Inn>${escapeXml(input.recipient.inn)}</Inn>` : ""}
    ${input.recipient.email ? `<Email>${escapeXml(input.recipient.email)}</Email>` : ""}
  </Recipient>
  <Status>queued</Status>
  <CreatedAt>${new Date().toISOString()}</CreatedAt>
</EDOMeta>`;
    zip.file("opisi.xml", opisi);

    const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
    const packageName = `edo_${trackId}.zip`;
    const packagePath = join(dir, packageName);
    writeFileSync(packagePath, out);

    return { trackId, packagePath, status: "sent", provider: "local" };
  },

  async getStatus(_trackId) {
    // local-провайдер просто возвращает delivered сразу — это «отправили в локальный outbox»
    return { status: "delivered", deliveredAt: new Date() };
  },
};

export function getProvider(name: EdoProviderName): EdoProvider {
  if (name === "local") return localProvider;
  // здесь будут SBIS / Diadoc обёртки, см. roadmap
  throw new Error(`Provider ${name} not configured`);
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;",
  } as Record<string, string>)[c]);
}

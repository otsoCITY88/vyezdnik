// Синхронизация входящих по IMAP: тянем непрочитанные письма от заданных доменов,
// сохраняем PDF-вложения в storage/incoming, создаём IncomingLetter draft
// (без linked case — пользователь привяжет вручную).

import { ImapFlow } from "imapflow";
import { simpleParser, AddressObject } from "mailparser";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "./prisma";
import { extractFromPdf } from "./pdf-extract";

const STORAGE = process.env.STORAGE_DIR || join(process.cwd(), "storage");

export interface SyncResult {
  ok: boolean;
  fetched: number;
  saved: number;
  skipped: number;
  errors: string[];
  notes: string[];
}

export async function syncImap(): Promise<SyncResult> {
  const cfg = {
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT || "993", 10),
    secure: (process.env.IMAP_SECURE || "true") === "true",
    user: process.env.IMAP_USER,
    pass: process.env.IMAP_PASS,
    folder: process.env.IMAP_FOLDER || "INBOX",
  };

  if (!cfg.host || !cfg.user) {
    return {
      ok: false, fetched: 0, saved: 0, skipped: 0,
      errors: ["IMAP не настроен — укажите IMAP_HOST/IMAP_USER/IMAP_PASS в .env"],
      notes: [],
    };
  }

  const allowed = (process.env.IMAP_FROM_ALLOWLIST || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

  const result: SyncResult = { ok: true, fetched: 0, saved: 0, skipped: 0, errors: [], notes: [] };

  const client = new ImapFlow({
    host: cfg.host!, port: cfg.port, secure: cfg.secure,
    auth: { user: cfg.user!, pass: cfg.pass! },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(cfg.folder);
    try {
      // Все непрочитанные за последние 30 дней
      const since = new Date(); since.setDate(since.getDate() - 30);
      const messages = client.fetch(
        { seen: false, since },
        { source: true, envelope: true, uid: true },
      );
      mkdirSync(join(STORAGE, "incoming"), { recursive: true });

      const ppk = await prisma.organization.findFirst({ where: { kind: "customer" } });

      for await (const msg of messages) {
        result.fetched++;
        const parsed = await simpleParser(msg.source as Buffer);
        const fromList: AddressObject | AddressObject[] | undefined = parsed.from;
        const fromText = (Array.isArray(fromList) ? fromList[0] : fromList)?.text || "";
        const fromEmail = ((Array.isArray(fromList) ? fromList[0] : fromList)?.value?.[0]?.address) || "";
        const fromDomain = fromEmail.split("@")[1]?.toLowerCase() || "";

        if (allowed.length && !allowed.some((a) => fromDomain.includes(a))) {
          result.skipped++;
          result.notes.push(`skip ${fromEmail} (не в allowlist)`);
          continue;
        }

        // Найдём отправителя или возьмём ППК по умолчанию
        let fromOrg = await prisma.organization.findFirst({
          where: { defaultEmail: { contains: fromEmail.split("@")[0] } },
        });
        if (!fromOrg) fromOrg = ppk;
        if (!fromOrg) {
          result.errors.push(`${fromEmail}: не нашли подходящую организацию (нет даже ППК)`);
          continue;
        }

        // PDF вложения
        const pdfAttachments = parsed.attachments.filter((a) =>
          a.contentType?.includes("pdf") || a.filename?.toLowerCase().endsWith(".pdf"),
        );

        let savedPath: string | null = null;
        let extracted: Awaited<ReturnType<typeof extractFromPdf>> | null = null;

        if (pdfAttachments[0]) {
          const a = pdfAttachments[0];
          const fname = `imap_${Date.now()}_${(a.filename || "letter.pdf").replace(/[^a-zA-Zа-яА-Я0-9._-]+/g, "_")}`;
          savedPath = join(STORAGE, "incoming", fname);
          writeFileSync(savedPath, a.content);
          try {
            extracted = await extractFromPdf(a.content.buffer.slice(a.content.byteOffset, a.content.byteOffset + a.content.byteLength) as ArrayBuffer);
          } catch (e: unknown) {
            result.notes.push(`PDF parse failed: ${e instanceof Error ? e.message : ""}`);
          }
        }

        const number = extracted?.number || `IMAP-${msg.uid}`;
        const incomingDate = extracted?.incomingDate ? new Date(extracted.incomingDate) : (parsed.date || new Date());

        await prisma.incomingLetter.create({
          data: {
            fromOrganizationId: fromOrg.id,
            number, incomingDate,
            subject: extracted?.subject || parsed.subject || `Без темы (${fromEmail})`,
            applicantName: extracted?.applicantName || null,
            applicantOrigin: extracted?.applicantOrigin || null,
            applicantLetterNumber: extracted?.applicantLetterNumber || null,
            attachedFile: savedPath,
            pageCount: extracted?.pageCount || null,
          },
        });
        // помечаем прочитанным, чтобы не пересохранять
        await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
        result.saved++;
      }
    } finally {
      lock.release();
    }
  } catch (e: unknown) {
    result.ok = false;
    result.errors.push(e instanceof Error ? e.message : "imap error");
  } finally {
    await client.logout().catch(() => {});
  }

  return result;
}

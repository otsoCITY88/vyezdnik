// SMTP-отправка через nodemailer.
// Если SMTP_HOST не задан или DEV_FAKE_SEND=true — письмо «уходит» в локальный outbox-файл,
// чтобы можно было пощупать функционал без реального SMTP-сервера.

import nodemailer, { Transporter } from "nodemailer";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const STORAGE = process.env.STORAGE_DIR || join(process.cwd(), "storage");

let _transporter: Transporter | null = null;

function realTransporter(): Transporter {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: (process.env.SMTP_SECURE || "false") === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
      : undefined,
  });
  return _transporter;
}

export interface SendInput {
  to: string[];
  cc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; path?: string; content?: Buffer }>;
}

export interface SendResult {
  ok: boolean;
  delivery: "smtp" | "dev_outbox";
  messageId?: string;
  outboxPath?: string;
}

export async function sendMail(input: SendInput): Promise<SendResult> {
  const useReal = !!process.env.SMTP_HOST && (process.env.DEV_FAKE_SEND || "true") !== "true";
  const from = process.env.SMTP_FROM || "noreply@rks-nr.local";

  if (useReal) {
    const info = await realTransporter().sendMail({
      from, to: input.to, cc: input.cc,
      subject: input.subject,
      text: input.text, html: input.html,
      attachments: input.attachments,
    });
    return { ok: true, delivery: "smtp", messageId: info.messageId };
  }

  // dev-режим: пишем eml-конверт в storage/outbox
  const dir = join(STORAGE, "outbox");
  mkdirSync(dir, { recursive: true });
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fp = join(dir, `${id}.eml.txt`);
  const lines = [
    `From: ${from}`,
    `To: ${input.to.join(", ")}`,
    input.cc?.length ? `Cc: ${input.cc.join(", ")}` : "",
    `Subject: ${input.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${id}@rks-nr.local>`,
    `Attachments: ${(input.attachments || []).map((a) => a.filename).join(", ") || "—"}`,
    "",
    input.text || "(html only)",
  ].filter(Boolean).join("\n");
  writeFileSync(fp, lines, "utf-8");

  // также скопируем вложения рядом
  for (const a of input.attachments || []) {
    if (a.path) {
      try {
        const { copyFileSync } = await import("node:fs");
        copyFileSync(a.path, join(dir, `${id}_${a.filename}`));
      } catch {/* ignore */}
    } else if (a.content) {
      writeFileSync(join(dir, `${id}_${a.filename}`), a.content);
    }
  }

  return { ok: true, delivery: "dev_outbox", outboxPath: fp };
}

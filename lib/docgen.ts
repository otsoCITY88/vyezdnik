// Рендер .docx по шаблону + сборка payload из Case → Document.

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "./prisma";
import {
  dateLong, dateShort, fullAddress, shortAddress, rubles, safeJSON, shortName,
} from "./format";
import { OUR_COMPANY } from "./our-company";
import { TEMPLATE_KINDS, TemplateKind } from "./workflow";

const TEMPLATES_DIR = join(process.cwd(), "templates");
const STORAGE_DIR = process.env.STORAGE_DIR || join(process.cwd(), "storage");

/**
 * Парсер плейсхолдеров с поддержкой dot-paths ({ourCompany.ogrn}).
 * docxtemplater по умолчанию ищет тег как ключ верхнего уровня — здесь же
 * мы умеем спускаться по точкам и просматривать всю scope-цепочку (для loop).
 */
function dotParser(tag: string) {
  const parts = tag.split(".");
  return {
    get(scope: unknown, context?: { scopeList?: unknown[] }) {
      const scopes: unknown[] = context?.scopeList?.length
        ? [...context.scopeList].reverse()
        : [scope];
      for (const s of scopes) {
        let cur: unknown = s;
        let ok = true;
        for (const p of parts) {
          if (cur == null || typeof cur !== "object") { ok = false; break; }
          cur = (cur as Record<string, unknown>)[p];
        }
        if (ok && cur !== undefined && cur !== null) return cur;
      }
      return "";
    },
  };
}

const FILENAME_BY_KIND: Partial<Record<TemplateKind, string>> = {
  T1_ao_mkd: "T1_ao_mkd.docx",
  T3_letter_to_spo_remedy: "T3_letter_to_spo_remedy.docx",
  T5_reply_to_ppk: "T5_reply_to_ppk.docx",
  T6_letter_to_spo_on_defects_act: "T6_letter_to_spo_on_defects_act.docx",
  T7_warranty_letter: "T7_warranty_letter.docx",
  T8_claim_no_info: "T8_claim_no_info.docx",
};

export interface RenderInput {
  caseId: string;
  templateKind: TemplateKind;
  outgoingNumber: string;
  outgoingDate: Date;
  subject?: string;
  // выбранные адресаты (id из Contact)
  addresseeId: string;
  copyContactIds?: string[];
  signatoryId: string;
  executorIds?: string[];
  // дедлайны, выставленные в форме
  spoResponseDate?: Date;
  nextVisitDate?: Date;
  warrantyRemedyDate?: Date;
  remedyDate?: Date;
  // приложения, вручную/по умолчанию
  attachments?: Array<{ title: string; pages?: number | null }>;
  // дата отчёта (для T5)
  reportDate?: Date;
  outcomeText?: string;
  // для T8 (претензия)
  requestLetterNumber?: string;
  requestLetterDate?: Date;
  requestDeadline?: Date;
  // состав комиссии и список дефектов — заполняется из карточки выезда (АО МКД, Акт Н/Д).
  // Если не передано — подтягиваются автоматически из последнего визита и адресата.
  commissionRks?: Array<{ position: string; name: string }>;
  commissionSpo?: Array<{ position: string; name: string }>;
  defects?: Array<{ n: number; description: string; deadline?: string }>;
}

export interface RenderResult {
  buffer: Buffer;
  filename: string;
  payload: Record<string, unknown>;
}

/** Собирает payload и рендерит .docx. */
export async function renderTemplate(input: RenderInput): Promise<RenderResult> {
  const payload = await buildPayload(input);

  // 1. Если в БД сохранён кастомный .docx (uploaded или из builder) — берём его
  const dbTemplate = await prisma.documentTemplate.findUnique({ where: { kind: input.templateKind } });
  let tplBuffer: Buffer;
  if (dbTemplate?.docxPath) {
    try { tplBuffer = readFileSync(dbTemplate.docxPath); }
    catch { tplBuffer = readFileSync(join(TEMPLATES_DIR, FILENAME_BY_KIND[input.templateKind] || `${input.templateKind}.docx`)); }
  } else {
    const file = FILENAME_BY_KIND[input.templateKind];
    if (!file) throw new Error(`No template file mapped for ${input.templateKind}`);
    const tplPath = join(TEMPLATES_DIR, file);
    tplBuffer = readFileSync(tplPath);
  }

  const zip = new PizZip(tplBuffer);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => "",
    parser: dotParser,
  });

  doc.render(payload);

  const out = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
  const filename = filenameFor(input, payload);
  return { buffer: out, filename, payload };
}

function filenameFor(input: RenderInput, payload: Record<string, unknown>): string {
  const num = input.outgoingNumber.replace("/", "_");
  const dateStr = dateShort(input.outgoingDate);
  const titleByKind: Record<string, string> = {
    T1_ao_mkd: "Акт_осмотра_МКД",
    T3_letter_to_spo_remedy: "Письмо_в_СПО_об_устранении",
    T5_reply_to_ppk: "Ответ_в_ППК",
    T6_letter_to_spo_on_defects_act: "Письмо_в_СПО_по_Акту_НД",
    T7_warranty_letter: "О_гарантиях_субподрядчика",
    T8_claim_no_info: "Претензия_за_непредоставление",
  };
  const title = titleByKind[input.templateKind] || input.templateKind;
  const addr = (payload as { _addressShort?: string })._addressShort?.replace(/[\\/:*?"<>|]/g, "_") || "";
  return `${num}_${dateStr}_${title}_${addr}.docx`;
}

/**
 * Сохраняет буфер в `<storage>/outbox/<filename>` и возвращает путь.
 *
 * Файлы лежат в подпапке `outbox/`, потому что универсальный download
 * `/api/files/download` пускает только пути с whitelisted-префиксами,
 * а `outbox/` — один из них. Раньше файлы лежали в корне STORAGE_DIR
 * и не скачивались через CaseFilesBlock.
 */
export function saveRendered(buffer: Buffer, filename: string): string {
  const outboxDir = join(STORAGE_DIR, "outbox");
  mkdirSync(outboxDir, { recursive: true });
  const fullPath = join(outboxDir, filename);
  writeFileSync(fullPath, buffer);
  return fullPath;
}

/** Сборка payload из БД + входных данных. */
async function buildPayload(input: RenderInput): Promise<Record<string, unknown>> {
  const c = await prisma.case.findUniqueOrThrow({
    where: { id: input.caseId },
    include: {
      building: true,
      subcontractor: true,
      contract: true,
      incomingLetter: { include: { fromOrganization: true } },
    },
  });

  const addressee = await prisma.contact.findUniqueOrThrow({
    where: { id: input.addresseeId },
    include: { organization: true },
  });
  const copies = input.copyContactIds?.length
    ? await prisma.contact.findMany({
        where: { id: { in: input.copyContactIds } },
        include: { organization: true },
      })
    : [];
  const signatory = await prisma.contact.findUniqueOrThrow({ where: { id: input.signatoryId } });
  const executors = input.executorIds?.length
    ? await prisma.contact.findMany({ where: { id: { in: input.executorIds } } })
    : [];
  const executor = executors[0];

  // Состав комиссии РКС: 1) явный input, 2) контакты нашей орг. с isOurExecutor,
  // 3) если ничего нет — подпись только подписанта.
  const commissionRks = input.commissionRks?.length
    ? input.commissionRks
    : (await prisma.contact.findMany({
        where: {
          organization: { kind: "ours" },
          OR: [{ isOurExecutor: true }, { isOurSignatory: true }],
        },
        orderBy: [{ isOurSignatory: "desc" }, { lastName: "asc" }],
        take: 4,
      })).map((c) => ({
        position: c.position || "—",
        name: c.shortName || `${c.lastName} ${c.firstName[0]}.${c.middleName ? c.middleName[0] + "." : ""}`.trim(),
      }));

  // Состав комиссии СПО: 1) явный input, 2) адресат письма (он же представитель СПО),
  // 3) пусто (печатается «Представитель: —» — пользователь сам впишет).
  const commissionSpo = input.commissionSpo?.length
    ? input.commissionSpo
    : [{
        position: addressee.position || "Представитель",
        name: addressee.shortName || `${addressee.lastName} ${addressee.firstName[0]}.`,
      }];

  // Дефекты: 1) явный input, 2) findings последнего проведённого выезда,
  // разбитые по строкам в нумерованный список, 3) одна пустая строка.
  let defects: Array<{ n: number; description: string; deadline: string }>;
  if (input.defects?.length) {
    defects = input.defects.map((d) => ({
      n: d.n,
      description: d.description,
      deadline: d.deadline || (input.remedyDate ? dateLong(input.remedyDate) : "—"),
    }));
  } else {
    const lastVisit = await prisma.visit.findFirst({
      where: { caseId: input.caseId, status: "done" },
      orderBy: { visitDate: "desc" },
    });
    const fromVisit = (lastVisit?.findings || "")
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    defects = fromVisit.length
      ? fromVisit.map((description, i) => ({
          n: i + 1,
          description,
          deadline: input.remedyDate ? dateLong(input.remedyDate) : "—",
        }))
      : [{
          n: 1,
          description: "—",
          deadline: input.remedyDate ? dateLong(input.remedyDate) : "—",
        }];
  }

  const clauses = safeJSON<{
    warranty?: string[]; remedy?: string[]; responsibility?: string[];
    info_request?: string[]; penalty?: string[];
  }>(c.contract?.clauses, {});

  const incoming = c.incomingLetter;

  const payload: Record<string, unknown> = {
    ourCompany: {
      shortName: OUR_COMPANY.shortName,
      fullName: OUR_COMPANY.fullName,
      ogrn: OUR_COMPANY.ogrn,
      inn: OUR_COMPANY.inn,
      kpp: OUR_COMPANY.kppPrimary,
      legalAddress: OUR_COMPANY.legalAddressPrimary,
      email: OUR_COMPANY.email,
    },
    outgoing: {
      number: input.outgoingNumber,
      dateLong: dateLong(input.outgoingDate),
      dateShort: dateShort(input.outgoingDate),
    },
    incoming: incoming
      ? {
          number: incoming.number,
          dateLong: dateLong(incoming.incomingDate),
          dateShort: dateShort(incoming.incomingDate),
          applicantName: incoming.applicantName || "",
          applicantOrigin: incoming.applicantOrigin || "",
          applicantLetterNumber: incoming.applicantLetterNumber || "",
          applicantLetterDateLong: incoming.applicantLetterDate ? dateLong(incoming.applicantLetterDate) : "",
        }
      : { number: "—", dateLong: "—" },
    addressee: {
      dativePosition: addressee.dativePosition || addressee.position || "",
      dativeName: addressee.dativeName || addressee.shortName || "",
      vocativeName: addressee.vocativeName || "",
      shortName: addressee.shortName || "",
      email: addressee.email || "",
      organization: {
        shortName: addressee.organization.shortName,
        fullName: addressee.organization.fullName,
        inn: addressee.organization.inn || "",
        kpp: addressee.organization.kpp || "",
        legalAddress: addressee.organization.legalAddress || "",
        email: addressee.organization.defaultEmail || "",
      },
    },
    copies: copies.map((cp) => ({
      dativePosition: cp.dativePosition || cp.position || "",
      dativeName: cp.dativeName || cp.shortName || "",
      email: cp.email || "",
      organization: {
        shortName: cp.organization.shortName,
        fullName: cp.organization.fullName,
      },
    })),
    signatory: {
      shortName: signatory.shortName || shortName(signatory.lastName, signatory.firstName, signatory.middleName),
      position: signatory.position || "",
    },
    executor: executor
      ? {
          shortName: executor.shortName || shortName(executor.lastName, executor.firstName, executor.middleName),
          email: executor.email || "",
        }
      : { shortName: "", email: "" },
    building: {
      fullAddress: c.building.fullAddress || fullAddress(c.building),
      shortAddress: c.building.shortAddress || shortAddress(c.building),
    },
    contract: c.contract
      ? {
          number: c.contract.number,
          dateLong: dateLong(c.contract.date),
          dateShort: dateShort(c.contract.date),
          warrantyClauses: (clauses.warranty || []).join(", ") || "—",
          remedyClauses: (clauses.remedy || []).join(", ") || "—",
          responsibilityClauses: (clauses.responsibility || []).join(", ") || "—",
          infoRequestClauses: (clauses.info_request || []).join(", ") || "—",
          penaltyClauses: (clauses.penalty || []).join(", ") || "—",
        }
      : { number: "—", dateLong: "—" },
    deadline: {
      spoResponseDateLong: input.spoResponseDate ? dateLong(input.spoResponseDate) : "—",
      nextVisitDateLong: input.nextVisitDate ? dateLong(input.nextVisitDate) : "—",
      warrantyRemedyDateLong: input.warrantyRemedyDate ? dateLong(input.warrantyRemedyDate) : "—",
      remedyDateLong: input.remedyDate ? dateLong(input.remedyDate) : "—",
    },
    subject: input.subject || "",
    attachments: input.attachments?.map((a) => ({
      title: a.title,
      pages: a.pages != null ? String(a.pages) : "—",
    })) || [],
    reportDateLong: input.reportDate ? dateLong(input.reportDate) : dateLong(new Date()),
    outcomeText: input.outcomeText || "устранены в полном объёме",
    requestLetterNumber: input.requestLetterNumber || "—",
    requestLetterDateLong: input.requestLetterDate ? dateLong(input.requestLetterDate) : "—",
    requestDeadlineLong: input.requestDeadline ? dateLong(input.requestDeadline) : "—",
    penaltyAmount: c.contract?.penaltyAmount ? rubles(c.contract.penaltyAmount) : "—",
    visitDateLong: input.warrantyRemedyDate ? dateLong(new Date()) : dateLong(new Date()),
    visitDateShort: dateShort(new Date()),
    firstRequirementDateLong: dateLong(c.createdAt),
    actNumber: input.outgoingNumber,
    _addressShort: c.building.shortAddress,
    subcontractor: {
      shortName: c.subcontractor.shortName,
      fullName: c.subcontractor.fullName,
    },
    commission_rks: commissionRks,
    commission_spo: commissionSpo,
    defects,
  };

  return payload;
}

export { TEMPLATE_KINDS };

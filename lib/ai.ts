// Claude API клиент с prompt caching и общими хелперами.
// Все вызовы используют claude-opus-4-7 + adaptive thinking.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY не задан в .env");
  }
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// =====================================================================
//  1) Vision-OCR — структурированное извлечение полей из PDF/изображений
// =====================================================================

export interface VisionExtractedFields {
  number?: string;
  incomingDate?: string;
  applicantName?: string;
  applicantOrigin?: string;
  applicantLetterNumber?: string;
  applicantLetterDate?: string;
  subject?: string;
  buildingHint?: string;
  pageCount?: number;
  raw?: string;
}

const VISION_SYSTEM = `Ты помощник в отделе претензионной работы ООО «РКС-НР» в Мариуполе. Твоя задача — извлечь структурированные поля из входящего PDF-письма (от ППК «Единый Заказчик», прокуратуры, администрации, регионального фонда МКД).

Верни ТОЛЬКО валидный JSON, без комментариев и markdown, со следующими полями:
{
  "number": "исх. номер письма (например ППК-1-32475/2025)",
  "incomingDate": "ISO дата письма (YYYY-MM-DD)",
  "applicantName": "ФИО заявителя (например: Иванов И.И.) или прочерк",
  "applicantOrigin": "источник запроса (Прокуратура г. Мариуполя | Администрация городского округа Мариуполь | Мариупольский филиал Единого регионального фонда МКД ДНР)",
  "applicantLetterNumber": "номер исходного обращения если есть",
  "applicantLetterDate": "ISO дата исходного обращения если есть",
  "subject": "одно предложение о теме письма (например: О недостатках работ по адресу...)",
  "buildingHint": "адрес объекта МКД в формате 'г. Мариуполь, <улица>, д. <номер>, кв. <номер>' если упоминается"
}

Если поля нет — пропусти его (не пиши null или пустую строку).`;

export async function visionExtract(pdfBuffer: Buffer): Promise<VisionExtractedFields> {
  const c = client();
  const base64 = pdfBuffer.toString("base64");

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: VISION_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          {
            type: "text",
            text: "Извлеки структурированные поля из этого письма и верни валидный JSON.",
          },
        ],
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Ответ AI не содержит JSON");
  try {
    return JSON.parse(jsonMatch[0]) as VisionExtractedFields;
  } catch (e: unknown) {
    throw new Error(`Не удалось распарсить ответ AI: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// =====================================================================
//  2) Smart-summary — краткое описание дела
// =====================================================================

export interface CaseEventSummary {
  date: string;
  kind: string;
  title: string;
  description?: string;
}

const SUMMARY_SYSTEM = `Ты помощник в отделе претензионной работы ООО «РКС-НР» в Мариуполе. Тебе дают карточку дела по обращению жителя МКД и хронологию событий. Сделай краткое резюме (3-5 предложений) с упором на:
1. Что происходит сейчас (текущий статус)
2. Что было сделано (ключевые шаги)
3. Что нужно сделать дальше (если очевидно)

Стиль: деловой, без воды, конкретно. Без эмоджи и markdown.`;

export async function caseSummary(input: {
  caseNumber: string;
  building: string;
  spo: string;
  state: string;
  applicant?: string;
  events: CaseEventSummary[];
  deadlines?: Record<string, string>;
}): Promise<string> {
  const c = client();
  const eventsText = input.events
    .map((e) => `${e.date} · ${e.title}${e.description ? ` (${e.description})` : ""}`)
    .join("\n");

  const userText = `Дело: ${input.caseNumber}
Объект: ${input.building}
Субподрядчик: ${input.spo}
Заявитель: ${input.applicant || "—"}
Текущее состояние: ${input.state}
${input.deadlines ? `Сроки: ${JSON.stringify(input.deadlines)}` : ""}

Хронология (от старого к новому):
${eventsText}

Сделай краткое резюме.`;

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system: [{ type: "text", text: SUMMARY_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userText }],
  });

  return response.content.find((b) => b.type === "text")?.text || "";
}

// =====================================================================
//  3) Auto-draft — сгенерировать абзац для шаблона письма
// =====================================================================

const AUTODRAFT_SYSTEM = `Ты юрист отдела претензионной работы ООО «РКС-НР» в Мариуполе. Помогаешь составить часть официального письма по обращению жителя МКД.

Стиль: деловой канцелярский. Используй обороты: "уведомляем", "обращаем внимание", "требуем", "в соответствии с". Без воды, без эмоджи, без markdown. Один абзац (2-5 предложений).`;

export async function autoDraftBlock(input: {
  templateKind: string;       // T7, T6, T8 …
  caseContext: string;        // что произошло
  goal: string;               // что должен донести абзац
  contractClauses?: string;   // п. 7.20, 8.10 …
}): Promise<string> {
  const c = client();
  const userText = `Шаблон письма: ${input.templateKind}
Контекст дела: ${input.caseContext}
${input.contractClauses ? `Релевантные пункты договора: ${input.contractClauses}` : ""}

Цель абзаца: ${input.goal}

Напиши один абзац для вставки в письмо.`;

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 800,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: [{ type: "text", text: AUTODRAFT_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userText }],
  });

  return response.content.find((b) => b.type === "text")?.text || "";
}

// =====================================================================
//  4) Чат с делом — многоходовый диалог с полным контекстом
// =====================================================================

const CHAT_SYSTEM = `Ты ассистент специалиста отдела претензионной работы ООО «РКС-НР» в Мариуполе. Тебе дают полный контекст дела по обращению жителя МКД (паспорт + хронология + документы + выезды). Отвечай на вопросы оператора по этому делу:
- какие шаги уже сделаны
- какие сроки горят
- что предложить как следующий шаг
- какие нормы / пункты договора применимы

Стиль: деловой, конкретный, без воды. Если не уверен — скажи "по доступным данным…". Без эмоджи и markdown за пределами обычных списков.`;

export interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

export async function caseChat(input: {
  contextSnapshot: string;     // большой стабильный контекст дела (для caching)
  history: ChatMessageInput[]; // история диалога
  question: string;            // текущий вопрос
}): Promise<string> {
  const c = client();
  const messages = [
    ...input.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: input.question },
  ];

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: [
      { type: "text", text: CHAT_SYSTEM },
      // Контекст дела — кэшируем (стабильный префикс), вопрос идёт в messages (волатильный)
      { type: "text", text: input.contextSnapshot, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });

  return response.content.find((b) => b.type === "text")?.text || "";
}

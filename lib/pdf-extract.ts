// Извлечение текста из PDF + парсинг ключевых полей входящего письма.
// Работает с текстовыми PDF; сканы (без слоя текста) вернут пустую строку
// — пользователь заполнит руками или подключит OCR (tesseract.js) отдельно.

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "node:module";

// Подсовываем worker-файл по абсолютному пути из node_modules,
// чтобы не падать с "Cannot find module pdf.worker.mjs" в Next runtime.
const _require = createRequire(import.meta.url);
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfjs as any).GlobalWorkerOptions.workerSrc = _require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
} catch {/* ok */}

interface ExtractedFields {
  text: string;
  pageCount: number;
  number?: string;          // ППК-1-XXXXX/YYYY
  incomingDate?: string;    // YYYY-MM-DD
  applicantLetterNumber?: string;
  applicantLetterDate?: string;
  applicantName?: string;
  applicantOrigin?: string;
  subject?: string;
  buildingHint?: string;    // строка адреса, по которой можно мэтчить Building
}

export async function extractFromPdf(buffer: ArrayBuffer): Promise<ExtractedFields> {
  // В Node.js worker не нужен — отключаем, чтобы не было ENOENT pdf.worker.mjs.
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data, useSystemFonts: true,
    disableWorker: true,
    isEvalSupported: false,
  } as Parameters<typeof pdfjs.getDocument>[0]).promise;

  let allText = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ");
    allText += pageText + "\n";
  }

  await doc.destroy();
  return parseText(normalize(allText), doc.numPages);
}

/**
 * pdfjs часто отдаёт текст где соседние символы разделены пробелами:
 * «П П К», «1 9», «12 . 12 . 2025», «И.Р . Шарипов». Склеиваем такие случаи.
 */
function normalize(s: string): string {
  let t = s;
  // Несколько проходов «склеивания»
  for (let i = 0; i < 5; i++) {
    // Цифра + пробел + цифра  →  цифрацифра
    t = t.replace(/(\d)\s+(\d)/g, "$1$2");
    // Заглавная + пробел + заглавная (или конец слова) → склеиваем
    t = t.replace(/([А-ЯЁA-Z])\s+([А-ЯЁA-Z])(?=[ .,!?»)\-/])/g, "$1$2");
    // Тройные «X Y Z»
    t = t.replace(/([А-ЯЁA-Z])\s+([А-ЯЁA-Z])\s+([А-ЯЁA-Z])/g, "$1$2$3");
  }
  // Убираем пробелы вокруг точек/слешей в типичных конструкциях номеров и дат
  t = t.replace(/(\d)\s*\.\s*(\d)/g, "$1.$2");
  t = t.replace(/(\w)\s*\/\s*(\w)/g, "$1/$2");
  t = t.replace(/(\w)\s*-\s*(\w)/g, "$1-$2");
  // Двойные пробелы
  t = t.replace(/\s{2,}/g, " ");
  return t.trim();
}

const MONTHS_GENITIVE_INDEX: Record<string, number> = {
  "января": 0, "февраля": 1, "марта": 2, "апреля": 3, "мая": 4, "июня": 5,
  "июля": 6, "августа": 7, "сентября": 8, "октября": 9, "ноября": 10, "декабря": 11,
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function parseRussianDate(s: string): string | undefined {
  // «12 декабря 2025 г.» или «12 декабря 2025»
  const m = s.match(/(\d{1,2})\s+([А-Яа-яёЁ]+)\s+(\d{4})/);
  if (!m) return undefined;
  const day = parseInt(m[1], 10);
  const month = MONTHS_GENITIVE_INDEX[m[2].toLowerCase()];
  const year = parseInt(m[3], 10);
  if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) return undefined;
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseDottedDate(s: string): string | undefined {
  // 12.12.2025
  const m = s.match(/(\d{1,2})\.(\d{1,2})\.(20\d{2})/);
  if (!m) return undefined;
  return `${m[3]}-${pad(parseInt(m[2], 10))}-${pad(parseInt(m[1], 10))}`;
}

function parseText(text: string, pageCount: number): ExtractedFields {
  const out: ExtractedFields = { text, pageCount };

  // Исх. номер ППК-X-NNNNN/YYYY
  const numMatch = text.match(/(?:исх\.?\s*)?№\s*([А-ЯA-Z]{2,5}-\d{1,2}-\d{2,6}\/?2?0?\d{2})/i)
                || text.match(/№\s*(ППК-?\d-\d{3,5}\/\d{4})/i);
  if (numMatch) out.number = numMatch[1].trim();

  // Дата (исходящего письма) — приоритет: «от dd.mm.yyyy», «dd <месяц словами> yyyy»
  const fromMatch = text.match(/от\s+(\d{1,2}\.\d{1,2}\.20\d{2})/i)
                 || text.match(/от\s+(\d{1,2}\s+[А-Яа-яёЁ]+\s+20\d{2})/i);
  if (fromMatch) {
    out.incomingDate = parseDottedDate(fromMatch[1]) ?? parseRussianDate(fromMatch[1]);
  }

  // Адрес объекта
  const addrMatch = text.match(/(?:по\s+адрес[уа]:?|многоквартирн[оы]г?о?\s+(?:жилого\s+)?дом[а-я]+,?\s+расположенного\s+по\s+адресу:?)\s*([^.]+?\s*кв\.?\s*\d+|[^.]+?,?\s*д\.\s*\d+[/\d]*)/iu);
  if (addrMatch) out.buildingHint = addrMatch[1].trim().replace(/\s+/g, " ");

  // Заявитель: «обращение Иванова И.И.» или «обращения Ивановой Ю.И.»
  const apMatch = text.match(/обращени[яе]\s+([А-ЯЁ][а-яёА-ЯЁ-]+(?:[ -][А-ЯЁ][а-яёА-ЯЁ-]+)?\s+[А-ЯЁ]\.\s?[А-ЯЁ]\.)/);
  if (apMatch) out.applicantName = apMatch[1].trim();

  // Источник запроса (Прокуратура / Адм. Мариуполя / Фонд)
  if (/прокуратур/i.test(text)) out.applicantOrigin = "Прокуратура г. Мариуполя";
  else if (/администрац[ия]/i.test(text)) out.applicantOrigin = "Администрация городского округа Мариуполь";
  else if (/мариупольск[ий]+\s+филиал/i.test(text)) out.applicantOrigin = "Мариупольский филиал Единого регионального фонда МКД ДНР";

  // Тема (краткое содержание): первая фраза после «прошу провести» / «о рассмотрении»
  const subjMatch = text.match(/о рассмотрении\s+([^.]{10,140})/i)
                 || text.match(/о вопросу\s+([^.]{10,140})/i)
                 || text.match(/обращени[яе][^.]{0,40}по\s+вопросу\s+([^.]{10,140})/i);
  if (subjMatch) out.subject = subjMatch[1].trim().replace(/\s+/g, " ");

  // Номер исходного обращения (например, № 1133, № 4192) — упоминается рядом с источником
  const aplnMatch = text.match(/(?:№|N|исх\.?\s*№)\s*(\d{2,6})\s+(?:от\s+\d|по\s+вопросу)/i);
  if (aplnMatch) out.applicantLetterNumber = aplnMatch[1];

  return out;
}

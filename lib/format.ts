// Форматирование дат, чисел, склонений — всё, что нужно для шаблонов писем.

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const MONTHS_NOMINATIVE = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const WEEKDAYS = [
  "Воскресенье", "Понедельник", "Вторник", "Среда",
  "Четверг", "Пятница", "Суббота",
];

export function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/** «12 декабря 2025 г.» — для тела письма */
export function dateLong(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()} г.`;
}

/** «12.12.2025» */
export function dateShort(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/** «12.12» — для лент и списков */
export function dateCompact(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}`;
}

/** «понедельник» / «Понедельник» */
export function weekday(d: Date, capital = true): string {
  const w = WEEKDAYS[d.getDay()];
  return capital ? w : w.toLowerCase();
}

/** «27 апреля 2026» (без «г.») — для крупных заголовков */
export function dateHeadline(d: Date): string {
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

/** Месяц именительный — «Апрель» */
export function monthNominative(d: Date): string {
  return MONTHS_NOMINATIVE[d.getMonth()];
}

/** Разница в днях относительно «сегодня». Положительная — в будущем. */
export function daysFromToday(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** «−3д», «завтра», «+5д», «сегодня» */
export function relativeDay(d: Date | string | null | undefined): string {
  const diff = daysFromToday(d);
  if (diff === null) return "";
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  if (diff === -1) return "вчера";
  if (diff < 0) return `−${Math.abs(diff)}д`;
  return `+${diff}д`;
}

/** «150 000 (сто пятьдесят тысяч) рублей» */
export function rubles(amountKopecks: number, withWords = true): string {
  const rub = Math.floor(amountKopecks / 100);
  const formatted = rub.toLocaleString("ru-RU").replace(/,/g, " ");
  if (!withWords) return `${formatted} ₽`;
  return `${formatted} (${numberToWordsRu(rub)}) рублей`;
}

/** Перевод целого числа в текст (упрощённый, до 999 999 999) */
export function numberToWordsRu(n: number): string {
  if (n === 0) return "ноль";
  const ones = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
    "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать",
    "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
  const onesF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

  function under1000(num: number, fem = false): string {
    if (num === 0) return "";
    const parts: string[] = [];
    const h = Math.floor(num / 100);
    const rest = num % 100;
    if (h) parts.push(hundreds[h]);
    if (rest < 20) {
      if (rest > 0) parts.push(fem && rest <= 2 ? onesF[rest] : ones[rest]);
    } else {
      const t = Math.floor(rest / 10);
      const o = rest % 10;
      parts.push(tens[t]);
      if (o > 0) parts.push(fem && o <= 2 ? onesF[o] : ones[o]);
    }
    return parts.join(" ");
  }

  function plural(num: number, forms: [string, string, string]): string {
    const mod10 = num % 10;
    const mod100 = num % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
  }

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const out: string[] = [];
  if (millions) out.push(under1000(millions), plural(millions, ["миллион", "миллиона", "миллионов"]));
  if (thousands) out.push(under1000(thousands, true), plural(thousands, ["тысяча", "тысячи", "тысяч"]));
  if (rest) out.push(under1000(rest));
  return out.filter(Boolean).join(" ");
}

/** Сокращённое ФИО: «Иванов Иван Иванович» → «И.И. Иванов» */
export function shortName(last: string, first?: string | null, middle?: string | null): string {
  const initials = [first, middle].filter(Boolean).map((s) => `${s![0]}.`).join("");
  return initials ? `${initials} ${last}` : last;
}

/** ФИО в дательном — «Иванову И.И.» (упрощённое склонение русских мужских/женских фамилий). */
export function dativeName(last: string, first?: string | null, middle?: string | null): string {
  // Для шаблонов мы храним dativeName в БД — это безопаснее, чем угадывать склонение.
  // Эта функция — fallback.
  return shortName(last, first, middle);
}

/** Полный адрес: «г. Мариуполь, пр. Металлургов, д. 45/9, кв. 63» */
export function fullAddress(b: {
  city?: string | null;
  street: string;
  house: string;
  apartment?: string | null;
  porch?: string | null;
}): string {
  const parts = [`г. ${b.city || "Мариуполь"}`, `${b.street}, д. ${b.house}`];
  if (b.apartment) parts.push(`кв. ${b.apartment}`);
  if (b.porch) parts.push(`подъезд ${b.porch}`);
  return parts.join(", ");
}

/** Короткий адрес: «пр. Металлургов 45/9, кв. 63» */
export function shortAddress(b: {
  street: string;
  house: string;
  apartment?: string | null;
}): string {
  const base = `${b.street} ${b.house}`;
  return b.apartment ? `${base}, кв. ${b.apartment}` : base;
}

/** Безопасный JSON.parse с fallback */
export function safeJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

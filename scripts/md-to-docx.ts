/* eslint-disable no-console */
// Конвертер Markdown → DOCX через npm-пакет `docx`.
// Поддерживает: H1-H4, **жирный**, *курсив*, `code`, списки -/*/1., таблицы |..|, горизонтальные линии ---.

import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageOrientation, convertMillimetersToTwip,
} from "docx";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const INPUT = process.argv[2] || join(process.cwd(), "INSTRUCTIONS.md");
const OUTPUT = process.argv[3] || INPUT.replace(/\.md$/, ".docx");

const FONT_BODY = "Calibri";
const FONT_HEADING = "Calibri";
const FONT_MONO = "Consolas";

// ---------- inline parser: **bold**, *italic*, `code` ----------
function parseInline(s: string): TextRun[] {
  const out: TextRun[] = [];
  let i = 0;
  while (i < s.length) {
    // **жирный**
    if (s[i] === "*" && s[i + 1] === "*") {
      const end = s.indexOf("**", i + 2);
      if (end > -1) {
        out.push(new TextRun({ text: s.slice(i + 2, end), bold: true, font: FONT_BODY, size: 22 }));
        i = end + 2; continue;
      }
    }
    // *курсив*  (но не часть **)
    if (s[i] === "*" && s[i + 1] !== "*") {
      const end = s.indexOf("*", i + 1);
      if (end > -1 && s[end + 1] !== "*") {
        out.push(new TextRun({ text: s.slice(i + 1, end), italics: true, font: FONT_BODY, size: 22 }));
        i = end + 1; continue;
      }
    }
    // `code`
    if (s[i] === "`") {
      const end = s.indexOf("`", i + 1);
      if (end > -1) {
        out.push(new TextRun({
          text: s.slice(i + 1, end), font: FONT_MONO, size: 20,
          shading: { type: ShadingType.CLEAR, fill: "EFEEE7", color: "auto" },
        }));
        i = end + 1; continue;
      }
    }
    // [text](url) — выводим только text
    if (s[i] === "[") {
      const closeBr = s.indexOf("]", i + 1);
      if (closeBr > -1 && s[closeBr + 1] === "(") {
        const closePa = s.indexOf(")", closeBr + 2);
        if (closePa > -1) {
          out.push(new TextRun({
            text: s.slice(i + 1, closeBr), font: FONT_BODY, size: 22,
            color: "1F2A6B", underline: {},
          }));
          i = closePa + 1; continue;
        }
      }
    }
    // обычный символ — собираем до следующего спец-символа
    let next = i + 1;
    while (next < s.length && !"*`[".includes(s[next])) next++;
    out.push(new TextRun({ text: s.slice(i, next), font: FONT_BODY, size: 22 }));
    i = next;
  }
  return out;
}

function makeParagraph(text: string, opts: {
  heading?: typeof HeadingLevel[keyof typeof HeadingLevel];
  bullet?: number;
  align?: typeof AlignmentType[keyof typeof AlignmentType];
  spacing?: number;
  size?: number;
  bold?: boolean;
  color?: string;
} = {}): Paragraph {
  return new Paragraph({
    heading: opts.heading,
    bullet: opts.bullet !== undefined ? { level: opts.bullet } : undefined,
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 80, line: 320 },
    children: opts.heading
      ? [new TextRun({ text, bold: true, font: FONT_HEADING, color: opts.color })]
      : opts.bold
        ? [new TextRun({ text, bold: true, font: FONT_BODY, size: opts.size ?? 22 })]
        : parseInline(text),
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h) => new TableCell({
      width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: "14181F", color: "auto" },
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, color: "FFFFFF", font: FONT_BODY, size: 20 })],
        spacing: { before: 60, after: 60 },
      })],
    })),
  });

  const dataRows = rows.map((r) => new TableRow({
    children: r.map((c) => new TableCell({
      width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: "F7F3EA", color: "auto" },
      children: [new Paragraph({
        children: parseInline(c),
        spacing: { before: 40, after: 40 },
      })],
    })),
  }));

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// ---------- основной парсер ----------
type Block = { type: "paragraph"; node: Paragraph } | { type: "table"; node: Table };

function parseMd(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // пустая строка
    if (!line.trim()) { i++; continue; }

    // горизонтальная линия
    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: "paragraph", node: new Paragraph({
        children: [new TextRun({ text: "" })],
        spacing: { after: 120 },
        border: { bottom: { color: "D8CFB9", space: 6, style: BorderStyle.SINGLE, size: 6 } },
      }) });
      i++; continue;
    }

    // заголовки
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      const headingLevel = ([HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4])[level - 1];
      const color = level === 1 ? "6B1F2A" : level === 2 ? "14181F" : "2B313B";
      blocks.push({ type: "paragraph", node: makeParagraph(text, { heading: headingLevel, color }) });
      i++; continue;
    }

    // таблица: строка с | … | и следующая строка с | --- | --- |
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|[\s\-|:]+\|\s*$/.test(lines[i + 1])) {
      const headers = line.split("|").slice(1, -1).map((s) => s.trim());
      i += 2; // пропустить заголовок и разделитель
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").slice(1, -1).map((s) => s.trim()));
        i++;
      }
      blocks.push({ type: "table", node: makeTable(headers, rows) });
      continue;
    }

    // bullet list
    const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bullet) {
      const indent = Math.floor(bullet[1].length / 2);
      blocks.push({ type: "paragraph", node: makeParagraph(bullet[2], { bullet: indent, spacing: 40 }) });
      i++; continue;
    }

    // numbered list — рендерим как параграф с явным номером (Word-нумерация через config даёт битый ref)
    const numbered = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numbered) {
      const num = numbered[2];
      const text = numbered[3];
      const indent = "        ".repeat(Math.floor(numbered[1].length / 2));
      blocks.push({ type: "paragraph", node: new Paragraph({
        spacing: { after: 60, line: 320 },
        indent: { left: 360 + Math.floor(numbered[1].length / 2) * 360, hanging: 260 },
        children: [
          new TextRun({ text: `${indent}${num}.`, bold: true, font: FONT_BODY, size: 22 }),
          new TextRun({ text: "\t", font: FONT_BODY, size: 22 }),
          ...parseInline(text),
        ],
      }) });
      i++; continue;
    }

    // code block (тройные ```)
    if (line.startsWith("```")) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // закрывающий ```
      // одним «параграфом» — каждая строка как новый run + line break
      const children: TextRun[] = [];
      codeLines.forEach((ln, idx) => {
        if (idx > 0) children.push(new TextRun({ text: "", break: 1 }));
        children.push(new TextRun({ text: ln, font: FONT_MONO, size: 18 }));
      });
      blocks.push({ type: "paragraph", node: new Paragraph({
        children,
        spacing: { after: 160, before: 80, line: 240 },
        shading: { type: ShadingType.CLEAR, fill: "F2EBDD", color: "auto" },
      }) });
      continue;
    }

    // обычный параграф (склеить multi-line до пустой строки или нового спец-блока)
    const para: string[] = [line];
    let j = i + 1;
    while (j < lines.length && lines[j].trim() && !lines[j].match(/^(#|\||---|>|```|\s*[-*]\s|\s*\d+\.\s)/)) {
      para.push(lines[j]);
      j++;
    }
    blocks.push({ type: "paragraph", node: makeParagraph(para.join(" "), { spacing: 120 }) });
    i = j;
  }

  return blocks;
}

// ---------- сборка документа ----------
const md = readFileSync(INPUT, "utf-8");
const blocks = parseMd(md);

const doc = new Document({
  creator: "РКС·Выезд",
  title: "Инструкция пользователя",
  styles: {
    default: { document: { run: { font: FONT_BODY, size: 22 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { orientation: PageOrientation.PORTRAIT },
        margin: {
          top: convertMillimetersToTwip(20),
          right: convertMillimetersToTwip(18),
          bottom: convertMillimetersToTwip(20),
          left: convertMillimetersToTwip(20),
        },
      },
    },
    children: blocks.map((b) => b.node),
  }],
});

Packer.toBuffer(doc).then((buf) => {
  writeFileSync(OUTPUT, buf);
  console.log(`✓ ${OUTPUT} (${(buf.length / 1024).toFixed(1)} КБ, ${blocks.length} блоков)`);
});

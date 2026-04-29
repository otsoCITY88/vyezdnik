// Block-based конструктор шаблона: сериализуем шаблон в JSON-блоки
// и при необходимости рендерим .docx через `docx` пакет.

import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  PageOrientation, convertMillimetersToTwip,
} from "docx";

const FONT = "Times New Roman";

const A4 = {
  size: { orientation: PageOrientation.PORTRAIT },
  margin: {
    top:    convertMillimetersToTwip(20),
    right:  convertMillimetersToTwip(15),
    bottom: convertMillimetersToTwip(20),
    left:   convertMillimetersToTwip(30),
  },
};

export type Align = "left" | "center" | "right";

export type Block =
  | { type: "heading"; text: string; level?: 1 | 2 | 3; align?: Align }
  | { type: "paragraph"; text: string; bold?: boolean; italic?: boolean; align?: Align; size?: number }
  | { type: "header_block" } // стандартная шапка РКС-НР
  | { type: "ref_lines" }    // строки исх.№ / на №
  | { type: "subject"; text: string }
  | { type: "addressee_block" }  // адресат справа
  | { type: "copies_block" }     // копии (loop)
  | { type: "vocative" }
  | { type: "attachments_block" }
  | { type: "signature_block" }
  | { type: "spacer"; lines?: number }
  | { type: "loop"; iterableVar: string; itemTemplate: string }; // {#var}{itemTemplate}{/var}

export interface TemplateBody {
  title: string;
  blocks: Block[];
}

function p(text: string, opts: { bold?: boolean; italic?: boolean; align?: Align; size?: number; spacing?: number } = {}) {
  const align = ({ left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT } as const)[opts.align || "left"];
  return new Paragraph({
    alignment: align,
    spacing: { after: opts.spacing ?? 80 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, font: FONT, size: opts.size ?? 24 })],
  });
}

export function buildDocument(body: TemplateBody): Document {
  const children: Paragraph[] = [];
  for (const b of body.blocks) {
    switch (b.type) {
      case "heading":
        children.push(p(b.text, { bold: true, align: b.align || "center", size: b.level === 1 ? 32 : b.level === 2 ? 28 : 26, spacing: 200 }));
        break;
      case "paragraph":
        children.push(p(b.text, { bold: b.bold, italic: b.italic, align: b.align, size: b.size, spacing: 120 }));
        break;
      case "spacer":
        for (let i = 0; i < (b.lines || 1); i++) children.push(p(""));
        break;
      case "header_block":
        children.push(p("ОГРН {ourCompany.ogrn}, ИНН/КПП {ourCompany.inn}/{ourCompany.kpp}", { align: "center", size: 18, spacing: 40 }));
        children.push(p("{ourCompany.legalAddress}", { align: "center", size: 18, spacing: 40 }));
        children.push(p("e-mail: {ourCompany.email}", { align: "center", size: 18, spacing: 240 }));
        break;
      case "ref_lines":
        children.push(p("{outgoing.dateLong}  №  {outgoing.number}", { spacing: 40 }));
        children.push(p("На № {incoming.number} от {incoming.dateLong}", { spacing: 240 }));
        break;
      case "subject":
        children.push(p(b.text, { bold: true, spacing: 240 }));
        break;
      case "addressee_block":
        children.push(p("{addressee.dativePosition}", { align: "right", spacing: 40 }));
        children.push(p("{addressee.organization.fullName}", { align: "right", spacing: 40 }));
        children.push(p("{addressee.dativeName}", { align: "right", spacing: 60 }));
        children.push(p("{addressee.email}", { align: "right", size: 20, spacing: 200 }));
        break;
      case "copies_block":
        children.push(p("Копия:", { spacing: 40 }));
        children.push(p("{#copies}{dativePosition}\n{organization.fullName}\n{dativeName}\n{email}\n{/copies}", { spacing: 240 }));
        break;
      case "vocative":
        children.push(p("{addressee.vocativeName}", { spacing: 200 }));
        break;
      case "attachments_block":
        children.push(p("Приложения:", { spacing: 60 }));
        children.push(p("{#attachments}• {title} на {pages} л.;{/attachments}", { spacing: 60 }));
        break;
      case "signature_block":
        children.push(p("С уважением,", { spacing: 60 }));
        children.push(p("{signatory.position}                                                                {signatory.shortName}", { spacing: 480 }));
        children.push(p("{executor.shortName}", { size: 20, spacing: 40 }));
        children.push(p("{executor.email}", { size: 20 }));
        break;
      case "loop":
        children.push(p(`{#${b.iterableVar}}${b.itemTemplate}{/${b.iterableVar}}`, { spacing: 80 }));
        break;
    }
  }

  return new Document({
    creator: "РКС-Выезд",
    title: body.title,
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ properties: { page: A4 }, children }],
  });
}

export async function renderTemplateBodyToDocxBuffer(body: TemplateBody): Promise<Buffer> {
  const doc = buildDocument(body);
  return Packer.toBuffer(doc);
}

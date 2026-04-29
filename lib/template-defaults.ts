// Дефолтные блочные шаблоны (для конструктора), эквивалентные .docx из scripts/build-templates.ts.

import { TemplateBody } from "./template-builder";
import { TEMPLATE_CATALOG } from "./workflow";

export const DEFAULT_BODIES: Record<string, TemplateBody> = {
  T1_ao_mkd: {
    title: "Акт осмотра МКД",
    blocks: [
      { type: "heading", text: "АКТ ОСМОТРА МКД №{outgoing.number}", level: 1 },
      { type: "paragraph", text: "Объект: {building.fullAddress}", bold: true },
      { type: "paragraph", text: "Дата осмотра: {visitDateLong}", bold: true },
      { type: "spacer" },
      { type: "paragraph", text: "Представитель ООО «РКС-НР»:", bold: true },
      { type: "paragraph", text: "{signatory.position} — {signatory.shortName}" },
      { type: "spacer" },
      { type: "paragraph", text: "Совершён комиссионный выезд по адресу: {building.fullAddress}." },
      { type: "paragraph", text: "Согласно жалобе от {incoming.dateLong} № {incoming.number}." },
      { type: "spacer" },
      { type: "paragraph", text: "Срок устранения выявленных дефектов: {deadline.remedyDateLong}", bold: true },
    ],
  },
  T3_letter_to_spo_remedy: {
    title: "Письмо в СПО — Об устранении замечаний",
    blocks: [
      { type: "header_block" },
      { type: "ref_lines" },
      { type: "subject", text: "{subject}" },
      { type: "addressee_block" },
      { type: "copies_block" },
      { type: "vocative" },
      { type: "paragraph", text: "Между {ourCompany.shortName} и {addressee.organization.shortName} заключён договор от {contract.dateLong} № {contract.number} на выполнение ремонтно-восстановительных и иных работ." },
      { type: "paragraph", text: "В адрес {ourCompany.shortName} поступило письмо ППК «Единый заказчик» от {incoming.dateLong} исх. № {incoming.number} о рассмотрении обращения жителей по вопросу недостатков ремонтно-восстановительных работ многоквартирного жилого дома, расположенного по адресу: {building.fullAddress} (далее – Объект)." },
      { type: "paragraph", text: "Требую осуществить проверку выполненных работ на Объекте на предмет качества и принять меры по устранению недостатков в срок до {deadline.spoResponseDateLong}." },
      { type: "paragraph", text: "По истечении указанного срока Подрядчик проведёт осмотр Объекта. В связи с чем необходимо обеспечить {deadline.nextVisitDateLong} присутствие Вашего представителя на Объекте." },
      { type: "paragraph", text: "Обращаю внимание, что пунктом {contract.responsibilityClauses} Договора установлена обязанность Субподрядчика устранять недостатки в срок, определённый Подрядчиком." },
      { type: "attachments_block" },
      { type: "signature_block" },
    ],
  },
  T5_reply_to_ppk: {
    title: "Ответ в ППК ЕЗ",
    blocks: [
      { type: "header_block" },
      { type: "ref_lines" },
      { type: "subject", text: "О предоставлении информации {building.shortAddress}" },
      { type: "addressee_block" },
      { type: "vocative" },
      { type: "paragraph", text: "В ответ на Ваше письмо от {incoming.dateLong} исх. № {incoming.number} о рассмотрении обращения по адресу: {building.fullAddress} сообщаю следующее." },
      { type: "paragraph", text: "По состоянию на {reportDateLong} все замечания согласно доводам обращения {outcomeText}." },
      { type: "attachments_block" },
      { type: "signature_block" },
    ],
  },
  T6_letter_to_spo_on_defects_act: {
    title: "Письмо в СПО — на основании Акта Н/Д",
    blocks: [
      { type: "header_block" },
      { type: "ref_lines" },
      { type: "subject", text: "Об устранении замечаний" },
      { type: "addressee_block" },
      { type: "copies_block" },
      { type: "vocative" },
      { type: "paragraph", text: "Между {ourCompany.shortName} и {addressee.organization.shortName} заключён договор от {contract.dateLong} № {contract.number}." },
      { type: "paragraph", text: "В адрес {ourCompany.shortName} поступило письмо ППК «Единый заказчик» от {incoming.dateLong} исх. № {incoming.number} с требованием о рассмотрении обращения {incoming.applicantName} по вопросу недостатков работ в {building.shortAddress}." },
      { type: "paragraph", text: "В ходе комиссионного обследования составлен Акт недостатков/дефектов (Приложение 1)." },
      { type: "paragraph", text: "Срок устранения замечаний — {deadline.remedyDateLong}.", bold: true },
      { type: "paragraph", text: "Обращаю внимание, что пунктом {contract.responsibilityClauses} договора установлена обязанность Субподрядчика устранять недостатки за свой счёт." },
      { type: "attachments_block" },
      { type: "signature_block" },
    ],
  },
  T7_warranty_letter: {
    title: "О гарантиях субподрядчика",
    blocks: [
      { type: "header_block" },
      { type: "ref_lines" },
      { type: "subject", text: "О гарантиях Субподрядчика" },
      { type: "addressee_block" },
      { type: "vocative" },
      { type: "paragraph", text: "Между {ourCompany.shortName} (далее – Подрядчик) и {addressee.organization.shortName} (далее – Субподрядчик) заключён договор № {contract.number} от {contract.dateLong}." },
      { type: "paragraph", text: "Сроки гарантийных обязательств установлены пунктами договора {contract.warrantyClauses}, порядок устранения — пунктом {contract.remedyClauses}." },
      { type: "paragraph", text: "В соответствии со ст. 723 ГК РФ Подрядчик вправе требовать безвозмездного устранения недостатков в разумный срок." },
      { type: "paragraph", text: "В этой связи требуем в срок не позднее {deadline.warrantyRemedyDateLong} устранить недостатки и представить подтверждение их устранения.", bold: true },
      { type: "paragraph", text: "В соответствии с действующим законодательством РФ настоящее письмо является досудебной претензией." },
      { type: "attachments_block" },
      { type: "signature_block" },
    ],
  },
  T8_claim_no_info: {
    title: "Претензия за непредоставление информации",
    blocks: [
      { type: "ref_lines" },
      { type: "addressee_block" },
      { type: "heading", text: "ПРЕТЕНЗИЯ", level: 1 },
      { type: "paragraph", text: "Между {ourCompany.shortName} (Подрядчик) и {addressee.organization.shortName} (Субподрядчик) заключён договор № {contract.number} от {contract.dateLong}." },
      { type: "paragraph", text: "Согласно п. {contract.infoRequestClauses} Договора Субподрядчик обязуется представлять Подрядчику документы по запросу в течение 1 (одного) рабочего дня." },
      { type: "paragraph", text: "Согласно п. {contract.penaltyClauses} Договора за каждый факт неисполнения Субподрядчик обязан уплатить штраф в размере {penaltyAmount}." },
      { type: "paragraph", text: "Учитывая изложенное, требую не позднее 10 календарных дней уплатить штраф в размере {penaltyAmount}.", bold: true },
      { type: "attachments_block" },
      { type: "signature_block" },
    ],
  },
};

export function getDefaultBody(kind: string): TemplateBody | null {
  return DEFAULT_BODIES[kind] || null;
}

export function getCatalogMeta(kind: string) {
  return TEMPLATE_CATALOG.find((t) => t.kind === kind);
}

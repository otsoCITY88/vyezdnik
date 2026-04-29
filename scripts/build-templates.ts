/* eslint-disable no-console */
// Генерация .docx шаблонов с плейсхолдерами {var} для docxtemplater.
// Шаблоны записываются в /templates и кладутся под версионный контроль (если нужно).

import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  PageOrientation, convertMillimetersToTwip, LevelFormat,
} from "docx";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATES_DIR = join(process.cwd(), "templates");
mkdirSync(TEMPLATES_DIR, { recursive: true });

const A4_PAGE = {
  size: { orientation: PageOrientation.PORTRAIT },
  margin: {
    top:    convertMillimetersToTwip(20),
    right:  convertMillimetersToTwip(15),
    bottom: convertMillimetersToTwip(20),
    left:   convertMillimetersToTwip(30),
  },
};

const FONT = "Times New Roman";

// ---------- helpers ----------
function p(text: string, opts: { bold?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType]; size?: number; spacing?: number; italic?: boolean } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 80 },
    children: [
      new TextRun({
        text, bold: opts.bold, italics: opts.italic,
        font: FONT, size: opts.size ?? 24,
      }),
    ],
  });
}

function pmix(parts: Array<{ t: string; b?: boolean; i?: boolean; u?: boolean }>, opts: { align?: typeof AlignmentType[keyof typeof AlignmentType]; spacing?: number; size?: number } = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.spacing ?? 80 },
    children: parts.map((x) => new TextRun({
      text: x.t, bold: x.b, italics: x.i, underline: x.u ? {} : undefined,
      font: FONT, size: opts.size ?? 24,
    })),
  });
}

function header() {
  return [
    pmix([{ t: "ОГРН {ourCompany.ogrn}, ИНН/КПП {ourCompany.inn}/{ourCompany.kpp}" }], { align: AlignmentType.CENTER, size: 18, spacing: 40 }),
    pmix([{ t: "{ourCompany.legalAddress}" }], { align: AlignmentType.CENTER, size: 18, spacing: 40 }),
    pmix([{ t: "e-mail: {ourCompany.email}" }], { align: AlignmentType.CENTER, size: 18, spacing: 240 }),
  ];
}

function refLines() {
  return [
    pmix([{ t: "{outgoing.dateLong}  №  " }, { t: "{outgoing.number}", b: true }], { align: AlignmentType.LEFT, spacing: 40 }),
    pmix([{ t: "На № " }, { t: "{incoming.number}", b: true }, { t: " от " }, { t: "{incoming.dateLong}" }], { align: AlignmentType.LEFT, spacing: 240 }),
  ];
}

function signatureBlock() {
  return [
    p("С уважением,", { spacing: 60 }),
    pmix([
      { t: "{signatory.position}" },
      { t: "                                                                ", },
      { t: "{signatory.shortName}", b: true },
    ], { spacing: 480 }),
    pmix([{ t: "{executor.shortName}" }], { size: 20, spacing: 40 }),
    pmix([{ t: "{executor.email}" }], { size: 20 }),
  ];
}

function attachmentsBlock() {
  return [
    p("Приложения:", { spacing: 60 }),
    // Цикл по приложениям — синтаксис docxtemplater
    p("{#attachments}• {title} на {pages} л.;{/attachments}", { spacing: 60 }),
    p(""),
  ];
}

// ============================================================
//  T1 — Акт осмотра МКД
// ============================================================
function buildT1() {
  return new Document({
    creator: "РКС-Выезд", title: "Акт осмотра МКД",
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: { page: A4_PAGE },
      children: [
        p("АКТ ОСМОТРА МКД №{actNumber}", { bold: true, align: AlignmentType.CENTER, size: 28, spacing: 200 }),

        pmix([{ t: "Объект: " }, { t: "{building.fullAddress}", b: true }], { spacing: 120 }),
        pmix([{ t: "Дата осмотра: " }, { t: "{visitDateLong}", b: true }], { spacing: 200 }),

        p("Представитель ООО «РКС-НР»:", { bold: true, spacing: 60 }),
        p("{#commission_rks}{position} — {name}{/commission_rks}", { spacing: 200 }),

        p("Представитель Подрядной организации ({subcontractor.shortName}):", { bold: true, spacing: 60 }),
        p("{#commission_spo}{position} — {name}{/commission_spo}", { spacing: 200 }),

        p("Описание выезда:", { bold: true, spacing: 60 }),
        p("Совершён комиссионный выезд с целью осмотра объекта по адресу: {building.fullAddress}.", { spacing: 60 }),
        p("Согласно жалобе от {incoming.dateLong} № {incoming.number}.", { spacing: 60 }),
        p("Комиссия в составе, выявила ряд следующих замечаний, подтверждающих текст жалобы:", { spacing: 200 }),

        // таблица дефектов — разворачиваем в текстовый список (для шаблона MVP)
        p("№ п/п | Перечень выявленных дефектов / вопросов | Срок устранения", { bold: true, spacing: 60 }),
        p("{#defects}{n}. {description} — {deadline}{/defects}", { spacing: 200 }),

        pmix([{ t: "Срок устранения выявленных дефектов: " }, { t: "{remedyDateLong}", b: true }], { spacing: 240 }),

        p("Акт замечаний выдал:", { bold: true, spacing: 60 }),
        pmix([{ t: "Представитель ООО «РКС-НР»  /  " }, { t: "{signatory.shortName}", b: true }, { t: "  /  ___________________ / {visitDateShort}" }], { spacing: 200 }),

        p("Акт замечаний получил:", { bold: true, spacing: 60 }),
        pmix([{ t: "Представитель {subcontractor.shortName}  /  ______________________________ / ___________________ / {visitDateShort}" }], { spacing: 200 }),

        p("Контроль устранения нарушений провёл:", { bold: true, spacing: 60 }),
        pmix([{ t: "{signatory.shortName}  /  ___________________ / ___________________ / 2026 г." }], {}),
      ],
    }],
  });
}

// ============================================================
//  T3 — Письмо в СПО «Об устранении замечаний»
// ============================================================
function buildT3() {
  return new Document({
    creator: "РКС-Выезд", title: "Письмо в СПО — Об устранении",
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: { page: A4_PAGE },
      children: [
        ...header(),
        ...refLines(),

        // Тема и адресат справа
        pmix([{ t: "{subject}", b: true }], { spacing: 240 }),

        pmix([{ t: "{addressee.dativePosition}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.organization.fullName}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.dativeName}" }, { t: "", }], { align: AlignmentType.RIGHT, spacing: 60 }),
        pmix([{ t: "{addressee.email}" }], { align: AlignmentType.RIGHT, size: 20, spacing: 200 }),

        // Копии
        p("Копия:", { spacing: 40 }),
        p("{#copies}{dativePosition}\n{organization.fullName}\n{dativeName}\n{email}\n{/copies}", { spacing: 240 }),

        pmix([{ t: "{addressee.vocativeName}" }], { spacing: 200 }),

        p("Между {ourCompany.shortName} и {addressee.organization.shortName} заключён договор от {contract.dateLong} № {contract.number} на выполнение ремонтно-восстановительных и иных работ.", { spacing: 120 }),

        p("В адрес {ourCompany.shortName} поступило письмо ППК «Единый заказчик» от {incoming.dateLong} исх. № {incoming.number} с обращением {incoming.applicantOrigin} от {incoming.applicantLetterDateLong} № {incoming.applicantLetterNumber} (далее – Запрос) (Приложение 1) о рассмотрении обращения жителей по вопросу недостатков ремонтно-восстановительных работ многоквартирного жилого дома, расположенного по адресу: {building.fullAddress} (далее – Объект).", { spacing: 120 }),

        p("На основании вышеуказанного Запроса требую осуществить проверку выполненных работ на Объекте на предмет качества их выполнения и наличия недостатков и принять меры, направленные на их устранение в срок до {deadline.spoResponseDateLong}.", { spacing: 120 }),

        p("Информацию о проведённой проверке, принятых мерах по устранению недостатков и проведённых мероприятиях, а также документы, подтверждающие исполнение настоящего требования (Дефектный акт и ТЗК по Объекту), необходимо направить в адрес {ourCompany.shortName} и ППК «Единый заказчик» в установленный настоящим письмом срок, с предоставлением подтверждения направления информации ППК «Единый заказчик».", { spacing: 120 }),

        p("Обращаю внимание, что пунктом {contract.responsibilityClauses} Договора на проведение ремонтно-восстановительных работ установлена обязанность Субподрядчика устранять своими силами и за свой счёт недостатки по замечаниям уполномоченных органов исполнительной власти, если эти недостатки возникли по вине Субподрядчика, и иные отступления от требований Договора в срок, определённый Подрядчиком.", { spacing: 120 }),

        p("По истечении указанного срока Подрядчик проведёт осмотр Объекта. В связи с чем необходимо обеспечить {deadline.nextVisitDateLong} присутствие Вашего представителя на Объекте, имеющего при себе документ, подтверждающий его полномочия.", { spacing: 120 }),

        p("В случае неисполнения, просрочки исполнения и/или ненадлежащего исполнения настоящего требования {ourCompany.shortName} вправе применить к Субподрядчику меры гражданско-правовой ответственности в соответствии с договором.", { spacing: 240 }),

        ...attachmentsBlock(),
        ...signatureBlock(),
      ],
    }],
  });
}

// ============================================================
//  T5 — Ответ в ППК ЕЗ
// ============================================================
function buildT5() {
  return new Document({
    creator: "РКС-Выезд", title: "Ответ в ППК",
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: { page: A4_PAGE },
      children: [
        ...header(),
        ...refLines(),

        pmix([{ t: "О предоставлении информации {building.shortAddress}", b: true }], { spacing: 240 }),

        pmix([{ t: "{addressee.dativePosition}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.dativeName}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.email}" }], { align: AlignmentType.RIGHT, size: 20, spacing: 240 }),

        pmix([{ t: "{addressee.vocativeName}" }], { spacing: 200 }),

        p("В ответ на Ваше письмо от {incoming.dateLong} исх. № {incoming.number} от ППК «Единый Заказчик» с запросом {incoming.applicantOrigin} от {incoming.applicantLetterDateLong} исх. № {incoming.applicantLetterNumber} о рассмотрении обращения по вопросу проведения ремонтно-восстановительных работ многоквартирного жилого дома, расположенного по адресу: {building.fullAddress} (далее – Объект), сообщаю следующее.", { spacing: 240 }),

        p("По состоянию на {reportDateLong} все замечания согласно доводам обращения {outcomeText}.", { spacing: 240 }),

        ...attachmentsBlock(),
        ...signatureBlock(),
      ],
    }],
  });
}

// ============================================================
//  T6 — Письмо в СПО на основании Акта Н/Д
// ============================================================
function buildT6() {
  return new Document({
    creator: "РКС-Выезд", title: "Письмо в СПО — на основании Акта Н/Д",
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: { page: A4_PAGE },
      children: [
        ...header(),
        ...refLines(),

        pmix([{ t: "Об устранении замечаний", b: true }], { spacing: 240 }),

        pmix([{ t: "{addressee.dativePosition}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.organization.fullName}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.dativeName}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.email}" }], { align: AlignmentType.RIGHT, size: 20, spacing: 200 }),

        p("Копия:", { spacing: 40 }),
        p("{#copies}{dativePosition}\n{organization.fullName}\n{dativeName}\n{email}\n{/copies}", { spacing: 240 }),

        pmix([{ t: "{addressee.vocativeName}" }], { spacing: 200 }),

        p("Между {ourCompany.shortName} и {addressee.organization.shortName} заключён договор от {contract.dateLong} № {contract.number} на выполнение ремонтно-восстановительных и иных работ.", { spacing: 120 }),

        p("В адрес {ourCompany.shortName} поступило письмо ППК «Единый заказчик» от {incoming.dateLong} исх. № {incoming.number} с требованием {incoming.applicantOrigin} о рассмотрении обращения {incoming.applicantName} по вопросу недостатков ремонтно-восстановительных работ в {building.shortAddress} (далее – Объект).", { spacing: 120 }),

        p("На основании вышеуказанного Требования {visitDateLong} совместно с представителями ППК «Единый заказчик», {ourCompany.shortName}, ГБУ МО «УТНКР» и Субподрядной организации проведено комиссионное обследование, в ходе которого составлен Акт недостатков/дефектов, выявленных на Объекте (Приложение 1).", { spacing: 120 }),

        pmix([{ t: "Срок устранения замечаний, указанных в Акте недостатков/дефектов, выявленных на Объекте — " }, { t: "{deadline.remedyDateLong}", b: true }, { t: "." }], { spacing: 120 }),

        p("Информацию о проведённой проверке, принятых мерах по устранению недостатков, проведённых мероприятиях, а также документы, подтверждающие исполнение настоящего требования, необходимо направить в адрес Подрядчика и Заказчика в срок, установленный настоящим письмом, предоставив подтверждение направления информации в адрес Заказчика.", { spacing: 120 }),

        p("Обращаю внимание, что пунктом {contract.responsibilityClauses} договора установлена обязанность Субподрядчика устранять своими силами и за свой счёт недостатки по замечаниям уполномоченных органов исполнительной власти, если эти недостатки возникли по вине Субподрядчика, и иные отступления от требований Договора в срок, определённый Подрядчиком.", { spacing: 120 }),

        p("В случае неисполнения, просрочки исполнения и/или ненадлежащего исполнения настоящего требования {ourCompany.shortName} вправе применить к Субподрядчику меры гражданско-правовой ответственности в соответствии с договором.", { spacing: 240 }),

        ...attachmentsBlock(),
        ...signatureBlock(),
      ],
    }],
  });
}

// ============================================================
//  T7 — Письмо «О гарантиях субподрядчика» (досудебная претензия)
// ============================================================
function buildT7() {
  return new Document({
    creator: "РКС-Выезд", title: "О гарантиях субподрядчика",
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: { page: A4_PAGE },
      children: [
        ...header(),
        ...refLines(),

        pmix([{ t: "О гарантиях Субподрядчика", b: true }], { spacing: 240 }),

        pmix([{ t: "{addressee.dativePosition}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.organization.fullName}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.dativeName}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.email}" }], { align: AlignmentType.RIGHT, size: 20, spacing: 240 }),

        pmix([{ t: "{addressee.vocativeName}" }], { spacing: 200 }),

        p("Между {ourCompany.shortName} (далее – Подрядчик) и {addressee.organization.shortName} (далее – Субподрядчик) был заключён договор № {contract.number} от {contract.dateLong} на выполнение ремонтно-восстановительных и иных работ (далее – Договор).", { spacing: 120 }),

        p("Договором предусмотрен «Порядок передачи результатов работ», в котором установлен порядок приёмки работ на объектах, включая подписание Итогового акта приёмки работ на Объекте.", { spacing: 120 }),

        p("Так, {firstRequirementDateLong} в адрес Субподрядчика было направлено требование о необходимости принятия участия в комиссии по составлению «Акта о недостатках (дефектов), выявленных на Объекте» по адресу: {building.fullAddress}, в целях установления факта либо отсутствия недостатков (дефектов), указанных в обращении.", { spacing: 120 }),

        p("{visitDateLong} состоялся повторный выезд комиссии в составе специалистов {ourCompany.shortName}, ГБУ УТНКР МО и Субподрядчика, по адресу: {building.fullAddress}, в ходе которого был составлен совместный Акт о недостатках/дефектах от {visitDateLong}, в котором были отражены выявленные недостатки/дефекты для последующего устранения силами Субподрядчика в рамках гарантийных обязательств в срок до {deadline.warrantyRemedyDateLong}.", { spacing: 120 }),

        p("Сроки гарантийных обязательств установлены пунктами договора {contract.warrantyClauses}, порядок устранения выявленных замечаний установлен пунктом договора {contract.remedyClauses}.", { spacing: 120 }),

        p("В связи с чем устранение недостатков/дефектов относится к обязательству Субподрядчика по устранению недостатков выполненных им работ за свой счёт, закреплённому условиями Договора.", { spacing: 120 }),

        p("В соответствии с п. 1 ст. 723 ГК РФ в случаях, когда работа выполнена с отступлениями от договора подряда, ухудшившими результат работы, или с иными недостатками, которые делают его не пригодным для предусмотренного в договоре использования, либо при отсутствии в договоре соответствующего условия непригодности для обычного использования, Подрядчик вправе по своему выбору потребовать от Субподрядчика:", { spacing: 60 }),
        p("— безвозмездного устранения недостатков в разумный срок;", { spacing: 40 }),
        p("— соразмерного уменьшения установленной за работу цены;", { spacing: 40 }),
        p("— возмещения своих расходов на устранение недостатков в порядке статьи 397 ГК РФ.", { spacing: 120 }),

        p("Отсутствие исполнения требований об устранении недостатков работ Подрядчик вправе рассматривать как отказ от устранения недостатков, выявленных при приёмке Объектов.", { spacing: 120 }),

        p("Руководствуясь п. 3 ст. 723 ГК РФ, если отступления в работе от условий договора подряда или иные недостатки результата работы в установленный разумный срок не были устранены, либо являются существенными и неустранимыми, Подрядчик вправе отказаться от исполнения Договора и потребовать возмещения причинённых убытков.", { spacing: 120 }),

        pmix([{ t: "В этой связи требуем в срок не позднее " }, { t: "{deadline.warrantyRemedyDateLong}", b: true }, { t: ":" }], { spacing: 60 }),
        p("— устранить недостатки, указанные в Актах осмотра МКД;", { spacing: 40 }),
        p("— представить Подрядчику надлежащим образом заверенное подтверждение устранения Субподрядчиком недостатков работ, указанных в Актах осмотра.", { spacing: 120 }),

        p("В случае не устранения недостатков работ и непредоставления Подрядчику в указанный выше срок информации об их устранении данное обстоятельство будет расцениваться Подрядчиком как отказ Субподрядчика от исполнения требования по устранению замечаний.", { spacing: 120 }),

        p("В соответствии с действующим законодательством Российской Федерации настоящее письмо является по смыслу и содержанию досудебной претензией.", { spacing: 240 }),

        ...attachmentsBlock(),
        ...signatureBlock(),
      ],
    }],
  });
}

// ============================================================
//  T8 — Претензия за непредоставление информации (со штрафом)
// ============================================================
function buildT8() {
  return new Document({
    creator: "РКС-Выезд", title: "Претензия — непредоставление информации",
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{
      properties: { page: A4_PAGE },
      children: [
        ...refLines(),

        pmix([{ t: "{addressee.organization.fullName}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "ИНН {addressee.organization.inn}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.organization.legalAddress}" }], { align: AlignmentType.RIGHT, spacing: 40 }),
        pmix([{ t: "{addressee.organization.email}" }], { align: AlignmentType.RIGHT, size: 20, spacing: 240 }),

        pmix([{ t: "ПРЕТЕНЗИЯ", b: true }], { align: AlignmentType.CENTER, size: 28, spacing: 240 }),

        p("Между {ourCompany.shortName} (далее – Подрядчик) и {addressee.organization.shortName} (далее – Субподрядчик) заключён Договор на выполнение ремонтно-восстановительных и иных работ № {contract.number} от {contract.dateLong} (далее – Договор), в том числе в отношении объекта по адресу: {building.fullAddress} (далее – Объект).", { spacing: 120 }),

        p("Согласно п. {contract.infoRequestClauses} Договора Субподрядчик обязуется представлять Подрядчику по его запросу информацию и документы о ходе выполнения работ, предусмотренных Договором, в течение 1 (одного) рабочего дня с даты получения запроса Подрядчика.", { spacing: 120 }),

        p("В целях своевременной передачи объектов балансодержателю в адрес Субподрядчика было направлено письмо от {requestLetterDateLong} исх. № {requestLetterNumber} о предоставлении графика устранения замечаний по Акту осмотра к Итоговому акту в отношении Объекта в срок не позднее {requestDeadlineLong}.", { spacing: 120 }),

        p("В установленный срок ответ на письмо не поступил. Субподрядчик запрашиваемые сведения и документы не представил, проигнорировав запрос Подрядчика, о продлении срока исполнения к Подрядчику не обращался.", { spacing: 120 }),

        p("В соответствии с п. 8.1 Договора стороны несут ответственность за неисполнение или ненадлежащее исполнение своих обязательств по Договору в соответствии с действующим законодательством Российской Федерации.", { spacing: 120 }),

        p("Согласно п. {contract.penaltyClauses} Договора за каждый факт неисполнения или ненадлежащего исполнения Субподрядчиком обязательства, предусмотренного Договором, которое не имеет стоимостного выражения, Субподрядчик обязан уплатить Подрядчику штраф в размере {penaltyAmount}.", { spacing: 120 }),

        pmix([{ t: "Учитывая изложенное, требую не позднее 10 (десяти) календарных дней с даты получения настоящей претензии уплатить штраф в размере " }, { t: "{penaltyAmount}", b: true }, { t: "." }], { spacing: 120 }),

        p("Реквизиты {ourCompany.shortName} для уплаты штрафа:", { bold: true, spacing: 60 }),
        p("Юридический адрес: {ourCompany.legalAddress}", { spacing: 40 }),
        p("ИНН {ourCompany.inn} / КПП {ourCompany.kpp}", { spacing: 40 }),
        p("ОГРН {ourCompany.ogrn}", { spacing: 240 }),

        p("Настоящая претензия направляется с целью соблюдения предусмотренных законом мер по досудебному урегулированию спора в порядке, предусмотренном ч. 5 ст. 4 АПК РФ.", { spacing: 120 }),
        p("В случае неисполнения требований или отказа от исполнения требований настоящей претензии {ourCompany.shortName} оставляет за собой право обратиться с исковыми требованиями в арбитражный суд.", { spacing: 240 }),

        ...attachmentsBlock(),
        ...signatureBlock(),
      ],
    }],
  });
}

// ============================================================
//  Сборка
// ============================================================
async function build() {
  const set: Array<[string, () => Document]> = [
    ["T1_ao_mkd.docx",                buildT1],
    ["T3_letter_to_spo_remedy.docx",  buildT3],
    ["T5_reply_to_ppk.docx",          buildT5],
    ["T6_letter_to_spo_on_defects_act.docx", buildT6],
    ["T7_warranty_letter.docx",       buildT7],
    ["T8_claim_no_info.docx",         buildT8],
  ];

  for (const [name, doc] of set) {
    const buffer = await Packer.toBuffer(doc());
    writeFileSync(join(TEMPLATES_DIR, name), buffer);
    console.log(`✓ ${name}  (${(buffer.length / 1024).toFixed(1)} КБ)`);
  }
}

build().catch((e) => { console.error(e); process.exit(1); });

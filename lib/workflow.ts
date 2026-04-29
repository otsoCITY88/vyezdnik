// Workflow дела: состояния, переходы, доступные шаблоны на каждом шаге.
// Источник: TZ.md §4.

export const CASE_STATES = [
  "incoming_received",          // 0. Получено входящее, дело создано
  "spo_request_sent",           // 1. Шаблон T3 отправлен СПО
  "spo_no_response",            // 2. Срок ответа истёк
  "ao_mkd_drafted",             // 3. Составлен Акт осмотра МКД (после первого выезда)
  "letter_with_ao_mkd_sent",    // 4. T3 с приложением АО МКД отправлен
  "awaiting_remedy",            // 5. Ждём устранения по АО МКД
  "remedy_confirmed",           // 6. Замечания устранены
  "defects_act_drafted",        // 7. Составлен Акт Н/Д
  "letter_on_defects_act_sent", // 8. T6 (письмо на основании Акта Н/Д) отправлен
  "awaiting_remedy_2",          // 9. Ждём устранения по Акту Н/Д
  "warranty_letter_sent",       // 10. T7 (О гарантиях) отправлено
  "claim_no_info_sent",         // 11. T8 (Претензия за непредоставление) отправлена
  "final_defects_act",          // 12. Крайний Акт Н/Д
  "warranty_1day_sent",         // 13. T7 со сроком 1 день
  "volumes_withdrawn",          // 14. Финальная претензия — изъятие объёмов
  "reply_to_ppk_drafted",       // 15. Готов ответ в ППК
  "closed",                     // 16. Закрыто
] as const;

export type CaseState = typeof CASE_STATES[number];

export const TEMPLATE_KINDS = [
  "T1_ao_mkd",
  "T2_defects_act",
  "T3_letter_to_spo_remedy",
  "T4_letter_to_spo_remedy_repeat",
  "T5_reply_to_ppk",
  "T6_letter_to_spo_on_defects_act",
  "T7_warranty_letter",
  "T7a_warranty_letter_1day",
  "T8_claim_no_info",
  "T8a_claim_withdraw_volumes",
  "T9_final_defects_act",
] as const;

export type TemplateKind = typeof TEMPLATE_KINDS[number];

export interface TemplateDescriptor {
  kind: TemplateKind;
  title: string;
  subtitle: string;
  // Какие следующие состояния разрешены после генерации этого документа
  transitionsTo: CaseState[];
  // На каких состояниях этот шаблон доступен
  availableIn: CaseState[];
}

export const TEMPLATE_CATALOG: TemplateDescriptor[] = [
  {
    kind: "T1_ao_mkd",
    title: "Акт осмотра МКД",
    subtitle: "первичная фиксация дефектов на выезде",
    availableIn: ["incoming_received", "spo_request_sent", "spo_no_response", "awaiting_remedy", "warranty_letter_sent"],
    transitionsTo: ["ao_mkd_drafted"],
  },
  {
    kind: "T3_letter_to_spo_remedy",
    title: "Письмо в СПО · Об устранении замечаний",
    subtitle: "первичное требование с приложением АО МКД",
    availableIn: ["incoming_received", "ao_mkd_drafted"],
    transitionsTo: ["spo_request_sent", "letter_with_ao_mkd_sent", "awaiting_remedy"],
  },
  {
    kind: "T4_letter_to_spo_remedy_repeat",
    title: "Повторное письмо в СПО",
    subtitle: "напоминание + расширенное обоснование",
    availableIn: ["spo_no_response", "awaiting_remedy"],
    transitionsTo: ["awaiting_remedy"],
  },
  {
    kind: "T5_reply_to_ppk",
    title: "Ответ в ППК ЕЗ",
    subtitle: "о результатах устранения / предоставлении информации",
    availableIn: ["remedy_confirmed", "reply_to_ppk_drafted"],
    transitionsTo: ["reply_to_ppk_drafted", "closed"],
  },
  {
    kind: "T6_letter_to_spo_on_defects_act",
    title: "Письмо в СПО на основании Акта Н/Д",
    subtitle: "официальное требование со ссылками на нормы СП/ГОСТ",
    availableIn: ["defects_act_drafted", "awaiting_remedy_2"],
    transitionsTo: ["letter_on_defects_act_sent", "awaiting_remedy_2"],
  },
  {
    kind: "T7_warranty_letter",
    title: "Письмо «О гарантиях субподрядчика»",
    subtitle: "досудебная претензия, ст. 723 ГК РФ",
    availableIn: ["awaiting_remedy_2", "letter_on_defects_act_sent"],
    transitionsTo: ["warranty_letter_sent"],
  },
  {
    kind: "T8_claim_no_info",
    title: "Претензия за непредоставление информации",
    subtitle: "штраф по п. 8.17 договора",
    availableIn: ["spo_no_response", "warranty_letter_sent", "awaiting_remedy_2"],
    transitionsTo: ["claim_no_info_sent"],
  },
  {
    kind: "T9_final_defects_act",
    title: "Крайний Акт Н/Д",
    subtitle: "с указанием привлечения третьих лиц",
    availableIn: ["warranty_letter_sent", "claim_no_info_sent"],
    transitionsTo: ["final_defects_act"],
  },
  {
    kind: "T7a_warranty_letter_1day",
    title: "Письмо «О гарантиях» · срок 1 день",
    subtitle: "финальное требование перед изъятием объёмов",
    availableIn: ["final_defects_act"],
    transitionsTo: ["warranty_1day_sent"],
  },
  {
    kind: "T8a_claim_withdraw_volumes",
    title: "Претензия с изъятием объёмов работ",
    subtitle: "финал по СПО — выводим работы у субподрядчика",
    availableIn: ["warranty_1day_sent"],
    transitionsTo: ["volumes_withdrawn"],
  },
];

export function templatesAvailableIn(state: CaseState): TemplateDescriptor[] {
  return TEMPLATE_CATALOG.filter((t) => t.availableIn.includes(state));
}

export function templateByKind(kind: TemplateKind): TemplateDescriptor | undefined {
  return TEMPLATE_CATALOG.find((t) => t.kind === kind);
}

// Человекочитаемые названия состояний
export const STATE_LABELS: Record<CaseState, string> = {
  incoming_received: "Получено обращение",
  spo_request_sent: "Запрос в СПО отправлен",
  spo_no_response: "СПО не ответил",
  ao_mkd_drafted: "Акт осмотра МКД составлен",
  letter_with_ao_mkd_sent: "Письмо с АО МКД отправлено",
  awaiting_remedy: "Ожидание устранения",
  remedy_confirmed: "Устранение зафиксировано",
  defects_act_drafted: "Акт Н/Д составлен",
  letter_on_defects_act_sent: "Письмо на основании Акта Н/Д",
  awaiting_remedy_2: "Ожидание устранения · по Акту Н/Д",
  warranty_letter_sent: "Письмо «О гарантиях» отправлено",
  claim_no_info_sent: "Претензия за непредоставление",
  final_defects_act: "Крайний Акт Н/Д",
  warranty_1day_sent: "Гарантии · срок 1 день",
  volumes_withdrawn: "Объёмы работ изъяты",
  reply_to_ppk_drafted: "Готов ответ в ППК",
  closed: "Закрыто",
};

// Цвет state-pill для UI (бордовый = критично, амбра = срочно, мох = успех, neutral = в работе)
export const STATE_TONE: Record<CaseState, "neutral" | "amber" | "bordeaux" | "moss" | "indigo"> = {
  incoming_received: "indigo",
  spo_request_sent: "amber",
  spo_no_response: "bordeaux",
  ao_mkd_drafted: "neutral",
  letter_with_ao_mkd_sent: "amber",
  awaiting_remedy: "amber",
  remedy_confirmed: "moss",
  defects_act_drafted: "neutral",
  letter_on_defects_act_sent: "amber",
  awaiting_remedy_2: "amber",
  warranty_letter_sent: "bordeaux",
  claim_no_info_sent: "bordeaux",
  final_defects_act: "bordeaux",
  warranty_1day_sent: "bordeaux",
  volumes_withdrawn: "bordeaux",
  reply_to_ppk_drafted: "moss",
  closed: "neutral",
};

// Сроки по умолчанию (в днях с момента действия)
export const DEFAULT_DEADLINES = {
  spoResponseDays: 5,         // 5 раб. дней — ответ СПО на первичное письмо
  remedyDays: 30,             // ~30 дней — типичный срок устранения по АО МКД
  warrantyResponseDays: 5,    // 5 раб. дней — ответ на T7
  warrantyRemedyDays: 14,     // адекватный срок устранения по T7
  oneDay: 1,                  // T7a — финальный пинок
};

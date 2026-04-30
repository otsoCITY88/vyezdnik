// Человекочитаемые подписи для всех enum-полей БД и внутренних статусов.
// Используется во всех таблицах/пилюлях UI вместо сырых ключей вроде "draft" или "admin".

// ---------- Пользователи · роли -------------------------------------------------

export function userRoleLabel(u: { isAdmin: boolean; isHead: boolean }): string {
  if (u.isAdmin) return "Администратор";
  if (u.isHead) return "Руководитель";
  return "Специалист";
}

export function userRoleTone(u: { isAdmin: boolean; isHead: boolean }): "bordeaux" | "amber" | "neutral" {
  if (u.isAdmin) return "bordeaux";
  if (u.isHead) return "amber";
  return "neutral";
}

// ---------- Документы · статус генерации ----------------------------------------

export const DOC_STATUS_LABELS: Record<string, string> = {
  draft: "черновик",
  rendered: "сгенерирован",
  signed: "подписан",
  sent: "отправлен",
  acknowledged: "получен",
};

export const DOC_STATUS_TONE: Record<string, "neutral" | "amber" | "moss" | "indigo" | "bordeaux"> = {
  draft: "neutral",
  rendered: "indigo",
  signed: "amber",
  sent: "moss",
  acknowledged: "moss",
};

export function docStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return DOC_STATUS_LABELS[status] || status;
}

// ---------- Документы · ЭДО -----------------------------------------------------

export const EDO_STATUS_LABELS: Record<string, string> = {
  queued: "в очереди",
  sent: "отправлен",
  delivered: "доставлен",
  rejected: "отклонён",
  signed: "подписан получателем",
};

export function edoStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return EDO_STATUS_LABELS[status] || status;
}

// ---------- Шаблоны · источник --------------------------------------------------

export const TEMPLATE_SOURCE_LABELS: Record<string, string> = {
  code: "встроенный",
  builder: "конструктор",
  uploaded: "загружен",
};

export function templateSourceLabel(source: string | null | undefined): string {
  if (!source) return "—";
  return TEMPLATE_SOURCE_LABELS[source] || source;
}

// ---------- Выезды · статус и тип -----------------------------------------------

export const VISIT_STATUS_LABELS: Record<string, string> = {
  planned: "запланирован",
  done: "проведён",
  cancelled: "отменён",
};

export function visitStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return VISIT_STATUS_LABELS[status] || status;
}

export const VISIT_KIND_LABELS: Record<string, string> = {
  initial: "первичный",
  repeat: "повторный",
  final: "финальный",
};

export function visitKindLabel(kind: string | null | undefined): string {
  if (!kind) return "—";
  return VISIT_KIND_LABELS[kind] || kind;
}

// ---------- Организации · вид ---------------------------------------------------

export const ORG_KIND_LABELS: Record<string, string> = {
  customer: "Заказчик",
  subcontractor: "Субподрядчик (СПО)",
  administration: "Администрация",
  prosecutor: "Прокуратура",
  fund: "Региональный фонд",
  balance_holder: "Балансодержатель",
  ours: "Наша организация",
  other: "Прочее",
};

export function orgKindLabel(kind: string | null | undefined): string {
  if (!kind) return "—";
  return ORG_KIND_LABELS[kind] || kind;
}

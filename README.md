# РКС·Выезд

Полнофункциональное веб‑приложение для отдела претензионной работы ООО «РКС‑НР» (Мариуполь): реестр обращений жителей МКД, AI‑помощник Claude Opus 4.7, авторизация, календарь, push‑уведомления, ЭДО, IMAP/SMTP, аналитика, PWA с камерой.

## Что внутри

- **Next.js 15 (App Router) + TypeScript**
- **Prisma + SQLite** (для прода — Postgres)
- **Auth.js v5** — авторизация через email‑credentials, роли, аудит‑лог
- **Anthropic Claude Opus 4.7** — vision‑OCR, smart‑summary, чат с делом, авто‑драфт абзацев (с adaptive thinking + prompt caching)
- **FullCalendar** — расписание выездов с drag‑n‑drop + iCal‑экспорт
- **WebPush + node‑cron + Telegram** — утренний дайджест, push‑уведомления о просрочках
- **Recharts** — аналитика: SLA по СПО, топ адресов, нагрузка специалистов
- **PWA** — manifest + service worker + камера прямо в форме выезда
- **docxtemplater + docx** — генерация .docx
- **pdfjs‑dist** — fallback OCR для текстовых PDF
- **nodemailer + imapflow** — SMTP/IMAP
- **pizzip** — ЭДО‑пакеты

## Быстрый старт

```bash
npm install --legacy-peer-deps
npm run setup           # db push + seed + сборка .docx
npm run dev             # http://localhost:3030
```

Войти на странице **`/login`** одним из seeded email — например `palkov.my@rks-nr.ru` (пароль не нужен — для прототипа).

## Опциональная конфигурация (.env)

Все внешние сервисы опциональны — без креденшелов соответствующие функции возвращают понятную ошибку, остальное работает.

```bash
# AI — Claude
ANTHROPIC_API_KEY="sk-ant-..."          # без него AI-функции вернут 503
ANTHROPIC_MODEL="claude-opus-4-7"

# Auth.js
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="http://localhost:3030"

# WebPush — сгенерировать ключи:
#   npx tsx scripts/gen-vapid.ts
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:mail@rks-nr.ru"

# SMTP — реальная отправка (без него — dev-outbox в storage/outbox)
SMTP_HOST="smtp.example.com"
SMTP_USER="..."
SMTP_PASS="..."
DEV_FAKE_SEND="false"

# IMAP — синхронизация входящих
IMAP_HOST="imap.example.com"
IMAP_USER="..."
IMAP_PASS="..."
IMAP_FROM_ALLOWLIST="ppk-ez.ru,mariupol.gov-dpr.ru"

# Telegram — для дайджестов в чат
TELEGRAM_BOT_TOKEN="123:ABC"
TELEGRAM_DEFAULT_CHAT="@your_channel"

# Cron расписание дайджеста
CRON_DAILY_DIGEST="0 9 * * *"           # каждый день в 9:00
```

## AI‑функции (Claude Opus 4.7)

| Функция | Где | Что делает |
|---|---|---|
| **Vision‑OCR** | `/inbox` → «✨ AI vision» | Извлекает структурированные поля из PDF (включая сканы) через Claude vision; точность выше regex |
| **Smart‑summary** | Карточка дела → «✨ Резюме дела» | 3‑5 предложений: что происходит сейчас, что было сделано, что дальше |
| **Чат с делом** | Карточка дела → «💬 Чат с делом» | Диалог с Claude, который знает паспорт + хронологию + документы + выезды (контекст кэшируется) |
| **Авто‑драфт абзаца** | API `/api/ai/autodraft` | Генерация юридических абзацев по типу шаблона + контексту |

Все промты используют **adaptive thinking** + **prompt caching** на стабильных системных префиксах. Контекст дела в чате кэшируется через `cache_control: ephemeral`.

## Уведомления

- **Утренний дайджест** (по умолчанию 09:00 ежедневно) → push + Telegram
- Содержит: горящие сроки, входящие без дела, дела к ответу в ППК, выезды на сегодня
- Включается автоматически через `instrumentation.ts` (cron стартует с приложением)
- Ручной запуск — `POST /api/notifications/digest`

## PWA

- `manifest.json` + `sw.js` зарегистрированы автоматически
- Установка как иконка на телефон/десктоп
- Push‑уведомления через service worker
- **Камера в выезде**: в модалке «Зафиксировать выезд» поле «Фото» использует `<input capture="environment">` — на телефоне открывает камеру

## Аудит и роли

- Каждое действие генерации документа / отправки логируется в `AuditLog`
- Роли: `specialist` (default), `head` (подписант), `admin` (CRUD справочников)
- Cookie‑сессия Auth.js + middleware защищает все UI‑роуты

## Скрипты

| Команда | Назначение |
|---|---|
| `npm run dev` | dev на :3030 |
| `npm run build` / `npm start` | production |
| `npm run db:reset` | пересоздать БД + seed |
| `npm run db:seed` | только seed |
| `npm run db:studio` | Prisma Studio |
| `npm run templates:build` | пересобрать .docx из TS |
| `npm run setup` | reset + seed + templates |
| `npx tsx scripts/gen-vapid.ts` | сгенерировать VAPID‑ключи для push |

## Карта роутов (UI)

| Путь | Что |
|---|---|
| `/login` | Вход |
| `/` | Дашборд |
| `/cases`, `/cases/:id`, `/cases/new` | Дела + AI‑чат, AI‑резюме |
| `/inbox` | Входящие (PDF + AI vision‑OCR) |
| `/outgoing` | Исходящие (УКЭП, ЭДО, отправка SMTP) |
| `/calendar` | Календарь выездов (drag‑n‑drop, iCal) |
| `/analytics` | SLA по СПО, динамика, топ адресов |
| `/buildings`, `/organizations`, `/contracts`, `/users`, `/templates` | CRUD справочников + конструктор шаблонов |

## API (выборочно)

```
POST /api/ai/vision-ocr            — Claude vision из PDF
POST /api/ai/case-summary          — резюме дела
POST /api/ai/autodraft             — генерация абзаца
POST /api/ai/chat                  — диалог с делом

GET  /api/visits                   — выезды для FullCalendar
GET  /api/visits.ics               — iCal-фид (Outlook/Google)
PATCH /api/visits?id=...           — перенос выезда (drag-n-drop)

POST /api/notifications/subscribe  — подписка на push
POST /api/notifications/digest     — ручной запуск дайджеста

POST /api/auth/...                 — Auth.js endpoints
```

## Что вне MVP (требует внешних договоров)

- Реальные ЭДО провайдеры (СБИС / Диадок) — адаптер `lib/edo.ts` готов
- УКЭП через КриптоПро Browser Plug‑in (сейчас приём готовых .sig)
- Postgres миграция (по умолчанию SQLite)
- Multi‑tenancy

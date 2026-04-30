# Пакет UX-улучшений · Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Закрыть 6 видимых UX-проблем: иконки в навигации, дата устранения из письма, подсветка просрочки, drill-down МКД, доступ ко всем файлам дела с ZIP-выгрузкой, версионирование загруженных файлов.

**Architecture:** Изменения по уровням: UI (Sidebar/CaseRowsTable/InboxScreen), новая страница `/buildings/[id]`, две новые миграции БД (`requestedRemedyDate`, `FileRevision`), универсальный download endpoint с whitelist-ом, ZIP-выгрузка через jszip (уже в зависимостях).

**Tech Stack:** Next.js 15, Prisma + SQLite (`db push`), lucide-react (новая зависимость), TypeScript strict, jszip (есть).

**Verification convention:** Тестового runner-а в проекте нет. Каждая задача завершается:
1. `npx tsc --noEmit` без ошибок
2. визуальная проверка после `next dev` или после Coolify-деплоя
3. отдельный коммит

---

## Task 1: Установить lucide-react

**Files:**
- Modify: `package.json`, `package-lock.json`

**Step 1:** Install dependency

```bash
npm install lucide-react --legacy-peer-deps
```

**Step 2:** Verify install

```bash
npm ls lucide-react
```
Expected: shows lucide-react@latest, no peer warnings about React.

**Step 3:** Commit

```bash
git add package.json package-lock.json
git commit -m "chore: add lucide-react for sidebar icons"
```

---

## Task 2: Иконки в Sidebar

**Files:**
- Modify: `components/Sidebar.tsx`

**Step 1:** Импорты иконок

В верх файла добавить:
```tsx
import {
  LayoutDashboard, Folder, Inbox, Send, Calendar, BarChart3,
  Building2, Users, FileText, UserCog, FilePlus,
  type LucideIcon,
} from "lucide-react";
```

**Step 2:** Расширить тип `groups[].items[]` полем `icon`

В типе массива `groups` добавить `icon: LucideIcon` к каждому item.

**Step 3:** Подставить иконки в данные

```tsx
items: [
  { href: "/", label: "Сегодня", icon: LayoutDashboard },
  { href: "/cases", label: "Дела", icon: Folder, ...(counters.burningCases > 0 ? {...} : {}) },
  { href: "/inbox", label: "Входящие", icon: Inbox, ...(counters.inboxUnlinked > 0 ? {...} : {}) },
  { href: "/outgoing", label: "Реестр исх.", icon: Send },
  { href: "/calendar", label: "Календарь", icon: Calendar },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
],
// ... справочники
items: [
  { href: "/buildings", label: "МКД", icon: Building2 },
  { href: "/organizations", label: "Контрагенты", icon: Users },
  { href: "/contracts", label: "Договоры", icon: FileText },
  { href: "/users", label: "Пользователи", icon: UserCog },
  { href: "/templates", label: "Шаблоны", icon: FilePlus },
],
```

**Step 4:** Заменить рендер `<span className="dot" />` на иконку

```tsx
<Link key={it.href} href={it.href} className={`nav-item ${isActive(it.href) ? "active" : ""}`}>
  <it.icon size={16} strokeWidth={1.75} />
  <span className="flex-1">{it.label}</span>
  {it.badge && (
    <span className={`pill ${it.badgeKind || ""}`} style={{ padding: "1px 7px", fontSize: 10 }}>
      {it.badge}
    </span>
  )}
</Link>
```

**Step 5:** Проверить CSS — у класса `.nav-item` стоит ли `display:flex` + `gap`. Если нет — добавить в `app/globals.css` (или там где `.nav-item` определён).

```bash
grep -n "\.nav-item" /Users/diid/Documents/projects/rks-mariupol-viezd2/app/globals.css
```
Если отсутствует gap — добавить `gap: 10px; align-items: center;`.

**Step 6:** `npx tsc --noEmit` → должно пройти.

**Step 7:** Commit

```bash
git add components/Sidebar.tsx app/globals.css
git commit -m "feat(ui): иконки lucide в боковом меню вместо точечных маркеров"
```

---

## Task 3: Подсветка просрочки в реестре дел

**Files:**
- Modify: `components/CaseRowsTable.tsx`

**Step 1:** В компоненте `Row` добавить вычисление флага overdue

```tsx
const isOverdue = r.nearestDeadline?.days != null && r.nearestDeadline.days < 0;
```

**Step 2:** Применить стиль к `<tr>`

```tsx
<tr
  onClick={() => router.push(`/cases/${r.id}`)}
  style={{
    cursor: "pointer",
    background: isOverdue ? "var(--bordeaux-bg)" : undefined,
  }}
>
```

**Step 3:** `npx tsc --noEmit`

**Step 4:** Commit

```bash
git add components/CaseRowsTable.tsx
git commit -m "feat(ui): просроченные дела подсвечиваются мягким бордовым фоном"
```

---

## Task 4: Поле `requestedRemedyDate` в IncomingLetter

**Files:**
- Modify: `prisma/schema.prisma` (модель `IncomingLetter`)

**Step 1:** Добавить колонку в схему

В блоке `model IncomingLetter` добавить после `applicantLetterDate`:
```prisma
requestedRemedyDate DateTime?
```

**Step 2:** Применить миграцию

```bash
DATABASE_URL="file:./prisma/dev.db" npx prisma db push --skip-generate
```

**Step 3:** Регенерировать Prisma client

```bash
npx prisma generate
```

**Step 4:** `npx tsc --noEmit` — должно пройти.

**Step 5:** Commit

```bash
git add prisma/schema.prisma
git commit -m "feat(db): IncomingLetter.requestedRemedyDate — срок устранения из письма"
```

---

## Task 5: UI поля «Срок устранения» в форме входящего

**Files:**
- Modify: `components/InboxScreen.tsx` (форма Add/Edit)
- Modify: `app/api/incoming/route.ts` (POST)
- Modify: `app/api/incoming/[id]/route.ts` (PATCH) — если есть

**Step 1:** Прочитать `InboxScreen.tsx` целиком и найти где форма входящего.

**Step 2:** Добавить поле в форму:

```tsx
<div className="field">
  <label>Срок устранения по письму</label>
  <input
    type="date"
    value={f.requestedRemedyDate || ""}
    onChange={(e) => setF((s) => ({ ...s, requestedRemedyDate: e.target.value }))}
  />
  <div className="micro-2 text-muted mt-1">
    Из текста письма (если указан). Используется как дедлайн при заведении дела.
  </div>
</div>
```

**Step 3:** В POST-обработчике входящего — пробрасывать поле в Prisma create:

```ts
requestedRemedyDate: form.get("requestedRemedyDate")
  ? new Date(String(form.get("requestedRemedyDate")))
  : null,
```

**Step 4:** В карточке входящего (где показывается письмо) добавить отображение:

```tsx
{inc.requestedRemedyDate && (
  <div className="micro text-muted">
    Срок по письму: <span className="mono">{dateShort(inc.requestedRemedyDate)}</span>
  </div>
)}
```

**Step 5:** В странице создания дела (`/cases/new?from=<id>`) — подставлять `requestedRemedyDate` в `deadlines.remedy`:

```tsx
const defaultDeadlines = incoming?.requestedRemedyDate
  ? { remedy: incoming.requestedRemedyDate.toISOString().slice(0, 10) }
  : {};
```

**Step 6:** `npx tsc --noEmit`

**Step 7:** Commit

```bash
git add components/InboxScreen.tsx app/api/incoming
git commit -m "feat(inbox): поле «срок устранения по письму» + автоподстановка дедлайна в дело"
```

---

## Task 6: Универсальный файловый download endpoint

**Files:**
- Create: `app/api/files/download/route.ts`

**Step 1:** Создать файл с whitelist-ом и проверкой auth:

```ts
import { NextResponse } from "next/server";
import { readFileSync, statSync } from "node:fs";
import { join, normalize, basename, extname } from "node:path";
import { auth } from "@/auth";

const STORAGE_ROOT = process.env.STORAGE_DIR || "/app/storage";
// Разрешённые префиксы — относительно STORAGE_ROOT.
const ALLOWED_PREFIXES = ["incoming/", "outbox/", "visits/", "signatures/", "edo/"];

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".zip": "application/zip",
  ".sig": "application/pkcs7-signature",
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rel = (searchParams.get("path") || "").trim();
  if (!rel) return NextResponse.json({ error: "path_required" }, { status: 400 });

  // Защита: запрещаем абсолютные пути и .., нормализуем.
  const norm = normalize(rel).replace(/^[/\\]+/, "");
  if (norm.includes("..") || !ALLOWED_PREFIXES.some((p) => norm.startsWith(p))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const full = join(STORAGE_ROOT, norm);
  let buf: Buffer;
  try {
    statSync(full);
    buf = readFileSync(full);
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ext = extname(full).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${basename(full)}"`,
    },
  });
}
```

**Step 2:** Проверить что `STORAGE_DIR` установлен в Docker и compose
(уже установлен — `/app/storage`).

**Step 3:** `npx tsc --noEmit`

**Step 4:** Commit

```bash
git add app/api/files/download/route.ts
git commit -m "feat(api): универсальный /api/files/download с auth + whitelist префиксов"
```

---

## Task 7: Блок «Все файлы дела» на карточке дела

**Files:**
- Create: `components/CaseFilesBlock.tsx`
- Modify: `app/(app)/cases/[id]/page.tsx` — подключить блок
- Modify: `lib/queries.ts` — добавить функцию `caseFiles(caseId)`

**Step 1:** Создать функцию агрегации файлов в `lib/queries.ts`:

```ts
export interface CaseFile {
  kind: "incoming" | "document" | "signature" | "edo" | "visit_photo";
  label: string;       // отображаемое имя
  relPath: string;     // путь относительно STORAGE_ROOT, для /api/files/download
  sizeBytes?: number;
  uploadedAt?: string;
  ownerId: string;     // id владельца (документа/входящего/визита) — для версий
}

export async function caseFiles(caseId: string): Promise<CaseFile[]> {
  const c = await prisma.case.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      incomingLetter: true,
      documents: true,
      visits: true,
    },
  });
  const root = (process.env.STORAGE_DIR || "/app/storage").replace(/\/+$/, "") + "/";
  const trim = (full: string | null | undefined) =>
    full && full.startsWith(root) ? full.slice(root.length) : full || "";

  const out: CaseFile[] = [];

  if (c.incomingLetter?.attachedFile) {
    out.push({
      kind: "incoming",
      label: `Входящее ${c.incomingLetter.number}`,
      relPath: trim(c.incomingLetter.attachedFile),
      ownerId: c.incomingLetter.id,
    });
  }
  for (const d of c.documents) {
    if (d.renderedDocxPath) {
      out.push({
        kind: "document",
        label: `${d.outgoingNumber || d.templateKind} — ${d.subject || "—"}`,
        relPath: trim(d.renderedDocxPath),
        ownerId: d.id,
      });
    }
    if (d.signaturePath) {
      out.push({
        kind: "signature",
        label: `Подпись к ${d.outgoingNumber || d.templateKind}`,
        relPath: trim(d.signaturePath),
        ownerId: d.id,
      });
    }
    if (d.edoPackagePath) {
      out.push({
        kind: "edo",
        label: `ЭДО-пакет ${d.outgoingNumber || d.templateKind}`,
        relPath: trim(d.edoPackagePath),
        ownerId: d.id,
      });
    }
  }
  for (const v of c.visits) {
    const photos = v.photos ? safeJSON<Array<{ path: string }>>(v.photos, []) : [];
    photos.forEach((p, i) => out.push({
      kind: "visit_photo",
      label: `Фото с выезда ${v.visitDate.toISOString().slice(0, 10)} #${i + 1}`,
      relPath: trim(p.path),
      ownerId: v.id,
    }));
  }
  return out;
}
```

**Step 2:** Создать компонент `components/CaseFilesBlock.tsx`:

```tsx
import { CaseFile } from "@/lib/queries";

const KIND_LABEL: Record<CaseFile["kind"], string> = {
  incoming: "Входящие",
  document: "Документы",
  signature: "Подписи УКЭП",
  edo: "ЭДО-пакеты",
  visit_photo: "Фото с выездов",
};

export function CaseFilesBlock({ caseId, files }: { caseId: string; files: CaseFile[] }) {
  const grouped = files.reduce<Record<string, CaseFile[]>>((acc, f) => {
    (acc[f.kind] ||= []).push(f);
    return acc;
  }, {});
  if (files.length === 0) {
    return (
      <div className="frame p-5">
        <div className="micro text-muted">Файлы</div>
        <div className="text-[13px] text-muted mt-2">К делу пока не привязано ни одного файла.</div>
      </div>
    );
  }
  return (
    <div className="frame p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="micro text-muted">Все файлы дела ({files.length})</div>
        <a href={`/api/cases/${caseId}/files.zip`} className="btn ghost sm">↓ Всё ZIP-ом</a>
      </div>
      {(Object.keys(grouped) as CaseFile["kind"][]).map((k) => (
        <div key={k} className="mb-3">
          <div className="micro-2 text-muted mb-1">{KIND_LABEL[k]}</div>
          <ul className="grid gap-1 text-[13px]">
            {grouped[k].map((f, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{f.label}</span>
                <a
                  className="mono text-muted hover:text-ink"
                  href={`/api/files/download?path=${encodeURIComponent(f.relPath)}`}
                >
                  ↓
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

**Step 3:** В `app/(app)/cases/[id]/page.tsx` — импорт и подключение блока в правую колонку (рядом с другими блоками):

```tsx
import { CaseFilesBlock } from "@/components/CaseFilesBlock";
import { caseFiles } from "@/lib/queries";

// внутри Page:
const files = await caseFiles(id);

// в JSX, в подходящем месте:
<CaseFilesBlock caseId={id} files={files} />
```

**Step 4:** `npx tsc --noEmit`

**Step 5:** Commit

```bash
git add components/CaseFilesBlock.tsx lib/queries.ts app/\(app\)/cases/\[id\]/page.tsx
git commit -m "feat(cases): блок «Все файлы дела» с download-ссылками"
```

---

## Task 8: ZIP-выгрузка всего дела

**Files:**
- Create: `app/api/cases/[id]/files.zip/route.ts`

**Step 1:** Создать endpoint. jszip уже в зависимостях — проверить:

```bash
grep "\"jszip\"" /Users/diid/Documents/projects/rks-mariupol-viezd2/package.json
```

**Step 2:** Создать роут:

```ts
import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import JSZip from "jszip";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { caseFiles } from "@/lib/queries";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const c = await prisma.case.findUnique({ where: { id }, select: { caseNumber: true } });
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const files = await caseFiles(id);
  if (files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 404 });
  }

  const root = (process.env.STORAGE_DIR || "/app/storage").replace(/\/+$/, "");
  const zip = new JSZip();
  for (const f of files) {
    const full = `${root}/${f.relPath}`;
    if (!existsSync(full)) continue;
    const buf = readFileSync(full);
    const subdir = ({
      incoming: "incoming",
      document: "documents",
      signature: "signatures",
      edo: "edo",
      visit_photo: "visits",
    } as const)[f.kind];
    zip.file(`${c.caseNumber}/${subdir}/${basename(full)}`, buf);
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${c.caseNumber}_files.zip"`,
    },
  });
}
```

**Step 3:** `npx tsc --noEmit`

**Step 4:** Commit

```bash
git add app/api/cases/\[id\]/files.zip/route.ts
git commit -m "feat(api): /api/cases/[id]/files.zip — ZIP-выгрузка всех файлов дела"
```

---

## Task 9: Схема `FileRevision`

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1:** Добавить в конец schema.prisma:

```prisma
model FileRevision {
  id           String   @id @default(cuid())
  ownerType    String   // "incoming" | "document" | "visit_photo"
  ownerId      String
  version      Int      // автоинкремент в рамках owner
  path         String
  filename     String
  size         Int
  mime         String?
  uploadedById String?
  uploadedAt   DateTime @default(now())
  comment      String?

  @@unique([ownerType, ownerId, version])
  @@index([ownerType, ownerId])
}
```

**Step 2:** Применить миграцию:

```bash
DATABASE_URL="file:./prisma/dev.db" npx prisma db push --skip-generate
npx prisma generate
```

**Step 3:** `npx tsc --noEmit`

**Step 4:** Commit

```bash
git add prisma/schema.prisma
git commit -m "feat(db): таблица FileRevision для истории версий файлов"
```

---

## Task 10: Хелпер `saveFileRevision`

**Files:**
- Create: `lib/file-revisions.ts`

**Step 1:** Написать функцию которая:
- Принимает `{ ownerType, ownerId, buffer, filename, mime, comment, uploadedById }`
- Считает текущий max version для owner+1
- Сохраняет файл в storage с уникальным именем (с версией в пути)
- Создаёт запись в `FileRevision`
- Возвращает путь и `version`

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { prisma } from "./prisma";

const STORAGE_ROOT = process.env.STORAGE_DIR || "/app/storage";

const SUBDIR: Record<string, string> = {
  incoming: "incoming",
  document: "outbox",
  visit_photo: "visits",
};

export async function saveFileRevision(opts: {
  ownerType: "incoming" | "document" | "visit_photo";
  ownerId: string;
  buffer: Buffer;
  filename: string;
  mime?: string;
  comment?: string;
  uploadedById?: string;
}): Promise<{ path: string; version: number; relPath: string }> {
  const last = await prisma.fileRevision.findFirst({
    where: { ownerType: opts.ownerType, ownerId: opts.ownerId },
    orderBy: { version: "desc" },
  });
  const version = (last?.version || 0) + 1;

  const subdir = SUBDIR[opts.ownerType];
  const safeName = opts.filename.replace(/[\\/:*?"<>|]/g, "_");
  const relPath = `${subdir}/${opts.ownerId}/v${version}_${safeName}`;
  const fullPath = join(STORAGE_ROOT, relPath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, opts.buffer);

  await prisma.fileRevision.create({
    data: {
      ownerType: opts.ownerType,
      ownerId: opts.ownerId,
      version,
      path: fullPath,
      filename: opts.filename,
      size: opts.buffer.length,
      mime: opts.mime,
      uploadedById: opts.uploadedById,
      comment: opts.comment,
    },
  });

  return { path: fullPath, version, relPath };
}

export async function listRevisions(ownerType: string, ownerId: string) {
  return prisma.fileRevision.findMany({
    where: { ownerType, ownerId },
    orderBy: { version: "desc" },
  });
}
```

**Step 2:** `npx tsc --noEmit`

**Step 3:** Commit

```bash
git add lib/file-revisions.ts
git commit -m "feat(lib): saveFileRevision — обёртка для версионируемой записи файлов"
```

---

## Task 11: Использовать `saveFileRevision` при загрузке входящего

**Files:**
- Modify: `app/api/incoming/route.ts` (POST)

**Step 1:** Прочитать текущую реализацию.

**Step 2:** Заменить прямую запись файла на `saveFileRevision`. Сохранить на запись `IncomingLetter.attachedFile = path` (последняя версия для совместимости).

```ts
import { saveFileRevision } from "@/lib/file-revisions";

// после создания IncomingLetter:
if (file && incoming.id) {
  const buf = Buffer.from(await file.arrayBuffer());
  const { path } = await saveFileRevision({
    ownerType: "incoming",
    ownerId: incoming.id,
    buffer: buf,
    filename: file.name,
    mime: file.type,
  });
  await prisma.incomingLetter.update({
    where: { id: incoming.id },
    data: { attachedFile: path },
  });
}
```

**Step 3:** `npx tsc --noEmit`

**Step 4:** Commit

```bash
git add app/api/incoming/route.ts
git commit -m "feat(incoming): запись PDF через saveFileRevision (версионирование)"
```

---

## Task 12: API для списка версий и отката

**Files:**
- Create: `app/api/files/revisions/route.ts` (GET список версий)
- Create: `app/api/files/revisions/[id]/route.ts` (POST → откат как новая версия)

**Step 1:** GET endpoint:

```ts
// app/api/files/revisions/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listRevisions } from "@/lib/file-revisions";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const ownerType = searchParams.get("ownerType");
  const ownerId = searchParams.get("ownerId");
  if (!ownerType || !ownerId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const revs = await listRevisions(ownerType, ownerId);
  return NextResponse.json(revs);
}
```

**Step 2:** POST endpoint для отката:

```ts
// app/api/files/revisions/[id]/route.ts
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveFileRevision } from "@/lib/file-revisions";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const rev = await prisma.fileRevision.findUnique({ where: { id } });
  if (!rev) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const buf = readFileSync(rev.path);
  const result = await saveFileRevision({
    ownerType: rev.ownerType as "incoming" | "document" | "visit_photo",
    ownerId: rev.ownerId,
    buffer: buf,
    filename: rev.filename,
    mime: rev.mime || undefined,
    comment: `откат к версии v${rev.version}`,
  });
  // обновить указатель owner-объекта на новую версию
  if (rev.ownerType === "incoming") {
    await prisma.incomingLetter.update({ where: { id: rev.ownerId }, data: { attachedFile: result.path } });
  } else if (rev.ownerType === "document") {
    await prisma.document.update({ where: { id: rev.ownerId }, data: { renderedDocxPath: result.path } });
  }
  return NextResponse.json(result);
}
```

**Step 3:** `npx tsc --noEmit`

**Step 4:** Commit

```bash
git add app/api/files/revisions
git commit -m "feat(api): /api/files/revisions — список и откат версий"
```

---

## Task 13: UI кнопка «история версий»

**Files:**
- Create: `components/FileRevisionsModal.tsx`
- Modify: `components/CaseFilesBlock.tsx` — добавить кнопку рядом с файлом

**Step 1:** Модалка со списком версий:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { dateShort } from "@/lib/format";

interface Revision {
  id: string; version: number; filename: string; size: number;
  uploadedAt: string; comment?: string | null;
}

export function FileRevisionsModal({
  ownerType, ownerId, onClose,
}: { ownerType: string; ownerId: string; onClose: () => void }) {
  const router = useRouter();
  const [revs, setRevs] = useState<Revision[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/files/revisions?ownerType=${ownerType}&ownerId=${ownerId}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setRevs(data); });
    return () => { cancelled = true; };
  }, [ownerType, ownerId]);

  async function rollback(id: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/files/revisions/${id}`, { method: "POST" });
      if (r.ok) { router.refresh(); onClose(); }
    } finally { setBusy(false); }
  }

  return (
    <Modal title="История версий файла" onClose={onClose} width={580}>
      {revs.length === 0 ? (
        <div className="text-muted text-[13px]">Версий нет.</div>
      ) : (
        <ul className="grid gap-2 text-[13px]">
          {revs.map((r) => (
            <li key={r.id} className="frame p-3 flex items-center gap-3">
              <div className="mono">v{r.version}</div>
              <div className="flex-1 min-w-0">
                <div className="truncate">{r.filename}</div>
                <div className="micro-2 text-muted">
                  {dateShort(r.uploadedAt)} · {(r.size / 1024).toFixed(1)} КБ
                  {r.comment ? ` · ${r.comment}` : ""}
                </div>
              </div>
              <button className="btn ghost sm" disabled={busy} onClick={() => rollback(r.id)}>↩ Откатить</button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
```

**Step 2:** В `CaseFilesBlock.tsx` сделать его клиентским и добавить кнопку «история» для файлов с `ownerType` ∈ {incoming, document, visit_photo}.

```tsx
"use client";
// ...
const [history, setHistory] = useState<{ ownerType: string; ownerId: string } | null>(null);

// в каждом <li> добавить:
<button className="btn ghost sm" onClick={() => setHistory({ ownerType: f.kind === "visit_photo" ? "visit_photo" : f.kind, ownerId: f.ownerId })}>
  история
</button>

// внизу компонента:
{history && <FileRevisionsModal {...history} onClose={() => setHistory(null)} />}
```

**Step 3:** `npx tsc --noEmit`

**Step 4:** Commit

```bash
git add components/FileRevisionsModal.tsx components/CaseFilesBlock.tsx
git commit -m "feat(ui): модалка истории версий файлов с откатом"
```

---

## Task 14: Drill-down `/buildings/[id]`

**Files:**
- Modify: `app/(app)/buildings/page.tsx` — добавить колонки (дел всего/открытых/горящих) + сделать строки кликабельными
- Create: `app/(app)/buildings/[id]/page.tsx` — карточка объекта

**Step 1:** Посчитать дела по объекту в существующем списке:

```ts
// в app/(app)/buildings/page.tsx
const buildings = await prisma.building.findMany({
  include: {
    subcontractor: true,
    cases: { select: { state: true, deadlines: true } },
  },
  orderBy: { shortAddress: "asc" },
});
```

Для каждого билдинга вычислить total/open/burning через тот же helper что
в `(app)/layout.tsx` (выделить в `lib/queries.ts` функцию `countBurning(deadlines)`).

**Step 2:** Перевести таблицу в кликабельные строки → `router.push("/buildings/" + b.id)`.

**Step 3:** Создать `app/(app)/buildings/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listCases } from "@/lib/queries";
import { CaseRowsTable } from "@/components/CaseRowsTable";
import { dateShort } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.building.findUnique({
    where: { id },
    include: {
      subcontractor: true,
      contract: true,
      cases: { include: { events: { orderBy: { occurredAt: "desc" }, take: 50 } } },
      incomingLetters: { orderBy: { incomingDate: "desc" } },
    },
  });
  if (!b) notFound();

  const allRows = await listCases();
  const myRows = allRows.filter((r) => /* by buildingId */ true /* TODO refine */);

  const open = b.cases.filter((c) => c.state !== "closed");
  const closed = b.cases.filter((c) => c.state === "closed");

  // Хронология — все events всех дел этого объекта.
  const timeline = b.cases.flatMap((c) =>
    c.events.map((e) => ({ ...e, caseNumber: c.caseNumber }))
  ).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 30);

  return (
    <section className="px-8 pt-8 pb-16">
      <div className="micro text-muted">МКД</div>
      <h1 className="display text-[44px] leading-none mt-2 tracking-tight">{b.shortAddress}</h1>
      <p className="read mt-2 text-[16px] text-muted">{b.fullAddress}</p>
      <div className="micro-2 text-muted mt-2">
        СПО: {b.subcontractor?.shortName || "—"} · Договор: {b.contract?.number || "—"}
      </div>
      <div className="ruler my-7" />

      <h2 className="display text-[24px] mb-3">Активные дела ({open.length})</h2>
      <div className="frame mb-8">
        <CaseRowsTable rows={myRows.filter((r) => open.some((c) => c.id === r.id))} showIncoming />
      </div>

      <h2 className="display text-[20px] mb-3">Хронология объекта</h2>
      <div className="frame p-4 mb-8">
        {timeline.length === 0 ? (
          <div className="text-muted text-[13px]">Событий пока нет.</div>
        ) : (
          <ul className="grid gap-2 text-[13px]">
            {timeline.map((e) => (
              <li key={e.id} className="grid gap-2" style={{ gridTemplateColumns: "100px 80px 1fr" }}>
                <span className="mono text-muted">{dateShort(e.occurredAt)}</span>
                <Link href={`/cases/${e.caseId}`} className="mono">{e.caseNumber}</Link>
                <span>{e.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="display text-[20px] mb-3">Входящие по объекту ({b.incomingLetters.length})</h2>
      <div className="frame">
        <table className="editorial">
          <thead><tr><th>№</th><th>Дата</th><th>От</th><th>Дело</th></tr></thead>
          <tbody>
            {b.incomingLetters.map((i) => (
              <tr key={i.id}>
                <td className="mono">{i.number}</td>
                <td>{dateShort(i.incomingDate)}</td>
                <td>{i.applicantName || "—"}</td>
                <td>
                  {i.linkedCaseId
                    ? <Link href={`/cases/${i.linkedCaseId}`} className="mono">открыть</Link>
                    : <span className="text-muted">без дела</span>}
                </td>
              </tr>
            ))}
            {b.incomingLetters.length === 0 && (
              <tr><td colSpan={4} className="text-center text-muted p-4">пока нет</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {closed.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-muted">Закрытые дела ({closed.length})</summary>
          <div className="frame mt-3">
            <CaseRowsTable rows={myRows.filter((r) => closed.some((c) => c.id === r.id))} />
          </div>
        </details>
      )}
    </section>
  );
}
```

**Step 4:** В `listCases` добавить `buildingId` в `CaseRow` interface (если нет), чтобы фильтровать.

**Step 5:** `npx tsc --noEmit`

**Step 6:** Commit

```bash
git add app/\(app\)/buildings lib/queries.ts
git commit -m "feat(buildings): drill-down карточка объекта со всеми делами и хронологией"
```

---

## Task 15: Финальная проверка и push

**Step 1:** Tsc:

```bash
npx tsc --noEmit
```
Expected: no errors.

**Step 2:** Push всех коммитов:

```bash
git push
```

**Step 3:** Coolify → **Reload Compose File** → **Save** → **Redeploy**.

**Step 4:** После деплоя зайти на сайт и пройти чеклист:

- [ ] В сайдбаре иконки lucide вместо точек
- [ ] Просроченное дело — строка с бордовым фоном
- [ ] Форма входящего: поле «Срок устранения по письму»
- [ ] На карточке дела блок «Все файлы дела» + кнопка «↓ Всё ZIP-ом»
- [ ] У файла кнопка «история» открывает модалку с версиями
- [ ] `/buildings` — добавились колонки счётчиков, строки кликабельны
- [ ] `/buildings/[id]` открывается, показывает дела/хронологию/входящие

---

## Что оставлено за скобками (NOT in this plan)

- Мобильные оптимизации сайдбара (drawer на узких экранах) — отдельная задача.
- Полнотекстовый поиск по содержимому файлов (OCR PDF) — отдельная задача.
- Diff между версиями docx — нерационально.
- Drag-and-drop загрузка файлов — оставляем нативный input.

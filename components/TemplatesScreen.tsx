"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { Pill } from "./Pill";
import { templateSourceLabel } from "@/lib/labels";

export interface TemplateView {
  kind: string;
  title: string;
  subtitle?: string | null;
  source: string;
  active: boolean;
  availableIn: string[];
  transitionsTo: string[];
  hasBody: boolean;
  hasUploadedDocx: boolean;
}

interface BlockBase { type: string }
interface ParagraphBlock extends BlockBase {
  type: "paragraph" | "heading";
  text: string; bold?: boolean; italic?: boolean; align?: "left" | "center" | "right"; level?: 1 | 2 | 3;
}
interface SubjectBlock extends BlockBase { type: "subject"; text: string }
interface SimpleBlock extends BlockBase {
  type: "header_block" | "ref_lines" | "addressee_block" | "copies_block" | "vocative" | "attachments_block" | "signature_block" | "spacer";
  lines?: number;
}
type Block = ParagraphBlock | SubjectBlock | SimpleBlock;

const BLOCK_LABELS: Record<string, string> = {
  header_block: "🏢 Шапка организации (ОГРН, адрес)",
  ref_lines: "📅 Дата + исх.№ + На №",
  subject: "📌 Тема письма",
  addressee_block: "👤 Адресат справа (должность, ФИО, e-mail)",
  copies_block: "✉ Копии",
  vocative: "🙏 Обращение «Уважаемый…!»",
  paragraph: "📝 Абзац",
  heading: "🅗 Заголовок",
  attachments_block: "📎 Список приложений",
  signature_block: "✍ Подпись + исполнитель",
  spacer: "⎵ Пустая строка",
};

export function TemplatesScreen({ templates }: { templates: TemplateView[] }) {
  const [edit, setEdit] = useState<TemplateView | null>(null);
  return (
    <section className="px-8 pt-8 pb-16">
      <div>
        <div className="micro text-muted">Каталог</div>
        <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Шаблоны документов</h1>
        <p className="read mt-2 text-[16px] text-muted">Конструктор блоков · загрузка готового .docx · workflow guard</p>
      </div>

      <div className="ruler my-7" />

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        {templates.map((t) => (
          <div key={t.kind} className="frame p-5">
            <div className="flex items-baseline justify-between">
              <div className="mono text-[12px] text-muted">{t.kind.split("_")[0]}</div>
              <div className="flex items-center gap-2">
                <Pill tone={t.source === "code" ? "neutral" : t.source === "builder" ? "moss" : "indigo"}>
                  {templateSourceLabel(t.source)}
                </Pill>
                {!t.active && <Pill tone="bordeaux">отключён</Pill>}
                <button className="btn ghost sm" onClick={() => setEdit(t)}>✎ Редактировать</button>
              </div>
            </div>
            <div className="display text-[22px] mt-1">{t.title}</div>
            {t.subtitle && <div className="text-[13px] text-muted mt-1">{t.subtitle}</div>}
            <div className="ruler my-3" />
            <div className="micro-2 text-muted mb-1">Доступен в состояниях</div>
            <div className="flex flex-wrap gap-1.5">
              {t.availableIn.map((s) => <span key={s} className="pill ghost" style={{ fontSize: 10, padding: "2px 6px" }}>{s}</span>)}
            </div>
            <div className="micro-2 text-muted mt-3 mb-1">Переводит дело в</div>
            <div className="flex flex-wrap gap-1.5">
              {t.transitionsTo.map((s) => <span key={s} className="pill" style={{ fontSize: 10, padding: "2px 6px" }}>→ {s}</span>)}
            </div>
          </div>
        ))}
      </div>

      {edit && <TemplateEditor template={edit} onClose={() => setEdit(null)} />}
    </section>
  );
}

function TemplateEditor({ template, onClose }: { template: TemplateView; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState<{ title: string; blocks: Block[] }>({ title: template.title, blocks: [] });
  const [tab, setTab] = useState<"builder" | "upload" | "info">("builder");

  // Подгружаем body шаблона из API один раз. Раньше fetch вызывался прямо в теле
  // рендера — это нарушает правила React и может приводить к гонкам/повторным
  // запросам.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/templates/${template.kind}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        if (j?.body) setBody(j.body);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [template.kind]);

  function setBlock(i: number, patch: Partial<Block>) {
    setBody((b) => ({ ...b, blocks: b.blocks.map((bl, j) => j === i ? { ...bl, ...patch } as Block : bl) }));
  }
  function moveBlock(i: number, dir: -1 | 1) {
    setBody((b) => {
      const next = [...b.blocks];
      const j = i + dir;
      if (j < 0 || j >= next.length) return b;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...b, blocks: next };
    });
  }
  function removeBlock(i: number) {
    setBody((b) => ({ ...b, blocks: b.blocks.filter((_, j) => j !== i) }));
  }
  function addBlock(type: Block["type"]) {
    const blank: Record<string, Block> = {
      paragraph: { type: "paragraph", text: "Новый абзац {placeholder}" },
      heading: { type: "heading", text: "Новый заголовок", level: 2 },
      subject: { type: "subject", text: "Тема письма" },
      header_block: { type: "header_block" },
      ref_lines: { type: "ref_lines" },
      addressee_block: { type: "addressee_block" },
      copies_block: { type: "copies_block" },
      vocative: { type: "vocative" },
      attachments_block: { type: "attachments_block" },
      signature_block: { type: "signature_block" },
      spacer: { type: "spacer", lines: 1 },
    };
    setBody((b) => ({ ...b, blocks: [...b.blocks, blank[type]] }));
  }

  async function save() {
    setBusy(true); setErr(null); setDone(null);
    try {
      const r = await fetch(`/api/templates/${template.kind}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: body.title, body }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || `Ошибка ${r.status}`);
      }
      setDone("✓ Сохранено и пересобран .docx");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  async function reset() {
    if (!confirm("Сбросить шаблон к дефолту?")) return;
    setBusy(true);
    try {
      await fetch(`/api/templates/${template.kind}`, { method: "DELETE" });
      router.refresh();
      onClose();
    } finally { setBusy(false); }
  }

  async function upload(file: File) {
    setBusy(true); setErr(null); setDone(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch(`/api/templates/${template.kind}`, { method: "POST", body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Ошибка ${r.status}`);
      }
      setDone(`✓ Файл загружен (${(file.size / 1024).toFixed(1)} КБ)`);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title={`Редактирование шаблона · ${template.kind}`}
      subtitle={template.subtitle || ""}
      onClose={onClose}
      width={1100}
      footer={
        <>
          <button className="btn ghost" style={{ color: "var(--bordeaux)" }} onClick={reset}>Сбросить к дефолту</button>
          <div className="flex-1" />
          {done && <span className="text-moss text-[13px]">{done}</span>}
          {err && <span className="text-bordeaux text-[13px]">{err}</span>}
          <button className="btn ghost" onClick={onClose} disabled={busy}>Закрыть</button>
          {tab === "builder" && (
            <button className="btn bordeaux" onClick={save} disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить и пересобрать .docx"}
            </button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <button className={`pill ${tab === "builder" ? "solid" : "ghost"}`} onClick={() => setTab("builder")}>Конструктор</button>
        <button className={`pill ${tab === "upload" ? "solid" : "ghost"}`} onClick={() => setTab("upload")}>Загрузить .docx</button>
        <button className={`pill ${tab === "info" ? "solid" : "ghost"}`} onClick={() => setTab("info")}>Workflow / переменные</button>
      </div>

      {tab === "builder" && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {/* левая — список блоков */}
          <div>
            <div className="field mb-3">
              <label>Название шаблона</label>
              <input value={body.title} onChange={(e) => setBody((b) => ({ ...b, title: e.target.value }))} />
            </div>
            <div className="micro text-muted mb-2">Блоки шаблона ({body.blocks.length})</div>
            <div className="grid gap-2">
              {body.blocks.map((bl, i) => (
                <BlockEditor
                  key={i} block={bl}
                  onChange={(p) => setBlock(i, p)}
                  onUp={() => moveBlock(i, -1)}
                  onDown={() => moveBlock(i, +1)}
                  onDelete={() => removeBlock(i)}
                />
              ))}
            </div>
            <div className="ruler my-3" />
            <div className="micro text-muted mb-2">Добавить блок</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(BLOCK_LABELS).map((t) => (
                <button key={t} className="pill ghost" onClick={() => addBlock(t as Block["type"])}>{BLOCK_LABELS[t]}</button>
              ))}
            </div>
          </div>

          {/* правая — превью */}
          <div>
            <div className="micro text-muted mb-2">Превью JSON-структуры</div>
            <pre className="frame p-3 text-[11px] overflow-auto mono" style={{ maxHeight: 420 }}>
              {JSON.stringify(body, null, 2)}
            </pre>
            <div className="micro text-muted mt-3 mb-2">Превью текста (без подстановки)</div>
            <div className="frame p-4 text-[12.5px] overflow-auto" style={{ maxHeight: 320, fontFamily: "Newsreader, serif" }}>
              {body.blocks.map((b, i) => <PreviewBlock key={i} b={b} />)}
            </div>
          </div>
        </div>
      )}

      {tab === "upload" && (
        <div className="grid gap-4">
          <p className="text-[14px]">
            Можно загрузить готовый .docx с плейсхолдерами в формате <code className="mono">{"{ourCompany.ogrn}"}</code>,{" "}
            <code className="mono">{"{addressee.dativeName}"}</code> и т.д. Циклы:{" "}
            <code className="mono">{"{#attachments}{title}{/attachments}"}</code>.
          </p>
          <input
            type="file"
            accept=".docx"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <p className="micro text-muted">
            После загрузки файл заменит текущий шаблон. Сбросить к дефолту — кнопка слева в футере.
          </p>
        </div>
      )}

      {tab === "info" && (
        <div className="grid gap-4 text-[13px]">
          <div>
            <div className="micro text-muted mb-2">Доступные переменные</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                "{ourCompany.shortName}", "{ourCompany.ogrn}", "{ourCompany.inn}", "{ourCompany.kpp}", "{ourCompany.legalAddress}", "{ourCompany.email}",
                "{outgoing.number}", "{outgoing.dateLong}",
                "{incoming.number}", "{incoming.dateLong}", "{incoming.applicantName}", "{incoming.applicantOrigin}",
                "{addressee.dativePosition}", "{addressee.dativeName}", "{addressee.vocativeName}", "{addressee.email}",
                "{addressee.organization.shortName}", "{addressee.organization.fullName}",
                "{contract.number}", "{contract.dateLong}", "{contract.warrantyClauses}", "{contract.remedyClauses}", "{contract.responsibilityClauses}", "{contract.penaltyClauses}",
                "{building.fullAddress}", "{building.shortAddress}",
                "{deadline.spoResponseDateLong}", "{deadline.nextVisitDateLong}", "{deadline.warrantyRemedyDateLong}", "{deadline.remedyDateLong}",
                "{signatory.position}", "{signatory.shortName}",
                "{executor.shortName}", "{executor.email}",
                "{penaltyAmount}", "{reportDateLong}", "{outcomeText}",
                "{subject}",
              ].map((v) => (
                <code key={v} className="mono frame px-2 py-1">{v}</code>
              ))}
            </div>
          </div>
          <div className="ruler" />
          <div>
            <div className="micro text-muted mb-2">Циклы</div>
            <div className="frame p-3 mono text-[12px]">
              {"{#copies}{dativePosition}\n{organization.fullName}\n{dativeName}\n{email}\n{/copies}"}<br />
              {"{#attachments}• {title} на {pages} л.;{/attachments}"}
            </div>
          </div>
          <div>
            <div className="micro text-muted mb-2">Workflow</div>
            <div>Доступен на состояниях: {template.availableIn.join(", ")}</div>
            <div>Переводит дело в: {template.transitionsTo.join(" / ")}</div>
            <div className="micro-2 text-muted mt-1">Workflow управляется в lib/workflow.ts (требует пересборки)</div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function BlockEditor({
  block, onChange, onUp, onDown, onDelete,
}: {
  block: Block;
  onChange: (p: Partial<Block>) => void;
  onUp: () => void; onDown: () => void; onDelete: () => void;
}) {
  return (
    <div className="frame p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="micro-2 text-muted">{BLOCK_LABELS[block.type] || block.type}</div>
        <div className="flex items-center gap-1">
          <button className="text-muted hover:text-ink text-[12px]" onClick={onUp}>↑</button>
          <button className="text-muted hover:text-ink text-[12px]" onClick={onDown}>↓</button>
          <button className="text-bordeaux text-[12px]" onClick={onDelete}>✕</button>
        </div>
      </div>
      {(block.type === "paragraph" || block.type === "heading") && (
        <>
          <textarea
            rows={(block as ParagraphBlock).text.length > 100 ? 3 : 1}
            value={(block as ParagraphBlock).text}
            onChange={(e) => onChange({ text: e.target.value } as Partial<Block>)}
          />
          <div className="flex gap-2 mt-2 items-center text-[12px]">
            <label className="check"><input type="checkbox" checked={!!(block as ParagraphBlock).bold} onChange={(e) => onChange({ bold: e.target.checked } as Partial<Block>)} /> жирный</label>
            <label className="check"><input type="checkbox" checked={!!(block as ParagraphBlock).italic} onChange={(e) => onChange({ italic: e.target.checked } as Partial<Block>)} /> курсив</label>
            <select value={(block as ParagraphBlock).align || "left"} onChange={(e) => onChange({ align: e.target.value as "left" | "center" | "right" } as Partial<Block>)}>
              <option value="left">слева</option><option value="center">по центру</option><option value="right">справа</option>
            </select>
            {block.type === "heading" && (
              <select value={String((block as ParagraphBlock).level || 2)} onChange={(e) => onChange({ level: Number(e.target.value) as 1 | 2 | 3 } as Partial<Block>)}>
                <option value="1">H1</option><option value="2">H2</option><option value="3">H3</option>
              </select>
            )}
          </div>
        </>
      )}
      {block.type === "subject" && (
        <input value={(block as SubjectBlock).text} onChange={(e) => onChange({ text: e.target.value } as Partial<Block>)} />
      )}
      {block.type === "spacer" && (
        <input type="number" min={1} max={5} value={(block as SimpleBlock).lines || 1} onChange={(e) => onChange({ lines: Number(e.target.value) } as Partial<Block>)} />
      )}
    </div>
  );
}

function PreviewBlock({ b }: { b: Block }) {
  const align = (b as ParagraphBlock).align || "left";
  const style: React.CSSProperties = { textAlign: align as "left" | "center" | "right", marginBottom: 6 };
  switch (b.type) {
    case "heading": return <div style={{ ...style, fontWeight: 700, fontSize: 16 }}>{(b as ParagraphBlock).text}</div>;
    case "paragraph": return <div style={{ ...style, fontWeight: (b as ParagraphBlock).bold ? 700 : undefined, fontStyle: (b as ParagraphBlock).italic ? "italic" : undefined }}>{(b as ParagraphBlock).text}</div>;
    case "subject": return <div style={{ ...style, fontWeight: 700 }}>{(b as SubjectBlock).text}</div>;
    case "spacer": return <div style={{ height: 12 * ((b as SimpleBlock).lines || 1) }} />;
    case "header_block": return <div className="text-muted text-[11px]" style={style}>[ОГРН + адрес + email РКС-НР]</div>;
    case "ref_lines": return <div className="text-muted text-[11px]" style={style}>[Дата · № исх. · На №]</div>;
    case "addressee_block": return <div className="text-muted text-[11px]" style={{ ...style, textAlign: "right" }}>[Адресат: должность, ФИО, e-mail]</div>;
    case "copies_block": return <div className="text-muted text-[11px]" style={style}>[Копии (loop)]</div>;
    case "vocative": return <div className="text-muted text-[11px]" style={style}>[«Уважаемый …!»]</div>;
    case "attachments_block": return <div className="text-muted text-[11px]" style={style}>[Приложения: {`{title}`} на {`{pages}`} л.]</div>;
    case "signature_block": return <div className="text-muted text-[11px]" style={style}>[Подпись + исполнитель]</div>;
    default: return null;
  }
}

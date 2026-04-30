"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";

interface Opt { id: string; label: string }

function fuzzyAddressMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^а-яёa-z0-9]+/g, " ").trim();
  const ta = norm(a).split(/\s+/);
  const tb = norm(b).split(/\s+/);
  // должно совпасть >=2 значимых токенов длиной >=3
  let hits = 0;
  for (const t of tb) {
    if (t.length >= 3 && ta.includes(t)) hits++;
    if (hits >= 2) return true;
  }
  return false;
}

export function UploadIncomingModal({
  fromOrganizations, buildings, onClose,
}: {
  fromOrganizations: Opt[]; buildings: Opt[]; onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<string | null>(null);
  const [f, setF] = useState({
    fromOrganizationId: fromOrganizations[0]?.id || "",
    number: "",
    incomingDate: new Date().toISOString().slice(0, 10),
    subject: "",
    applicantName: "",
    applicantOrigin: "",
    applicantLetterNumber: "",
    applicantLetterDate: "",
    requestedRemedyDate: "",
    buildingId: "",
    pageCount: 0,
  });

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function onPickFile(picked: File | null, useAi = false) {
    setFile(picked); setParsed(null); setErr(null);
    if (!picked) return;
    setParsing(true);
    try {
      const fd = new FormData(); fd.append("file", picked);
      const endpoint = useAi ? "/api/ai/vision-ocr" : "/api/incoming/parse";
      const r = await fetch(endpoint, { method: "POST", body: fd });
      if (r.ok) {
        const j = await r.json();
        const ex = j.extracted as Record<string, string | number>;
        setF((s) => ({
          ...s,
          number: ex.number ? String(ex.number) : s.number,
          incomingDate: ex.incomingDate ? String(ex.incomingDate) : s.incomingDate,
          subject: ex.subject ? String(ex.subject) : s.subject,
          applicantName: ex.applicantName ? String(ex.applicantName) : s.applicantName,
          applicantOrigin: ex.applicantOrigin ? String(ex.applicantOrigin) : s.applicantOrigin,
          applicantLetterNumber: ex.applicantLetterNumber ? String(ex.applicantLetterNumber) : s.applicantLetterNumber,
          pageCount: typeof ex.pageCount === "number" ? ex.pageCount : s.pageCount,
        }));
        // подсказка по объекту
        const hint = ex.buildingHint as string | undefined;
        if (hint) {
          const found = buildings.find((b) => fuzzyAddressMatch(b.label, hint));
          if (found) setF((s) => ({ ...s, buildingId: found.id }));
        }
        const filled = Object.entries(ex).filter(([, v]) => v).length;
        setParsed(filled > 0
          ? `✓ распознано ${filled} полей из PDF (${ex.pageCount || "?"} стр.) — проверьте и поправьте`
          : "⚠ не удалось извлечь поля (вероятно скан без текста)");
      } else {
        const j = await r.json().catch(() => ({}));
        setParsed(`⚠ ${j.message || "Не удалось распарсить файл"}`);
      }
    } catch {
      setParsed("⚠ ошибка парсинга PDF");
    } finally { setParsing(false); }
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      Object.entries(f).forEach(([k, v]) => fd.append(k, String(v ?? "")));
      const r = await fetch("/api/incoming", { method: "POST", body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Ошибка ${r.status}`);
      }
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title="Загрузить входящее письмо"
      subtitle="PDF от ППК / Прокуратуры / Администрации — попадёт в ‘Входящие без дела’"
      onClose={onClose}
      width={760}
      footer={
        <>
          <div className="micro text-muted">Минимум: отправитель, исх. № и дата</div>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn bordeaux" onClick={submit} disabled={busy || !f.number || !f.incomingDate || !f.fromOrganizationId}>
            {busy ? "Загружаем…" : "Сохранить"}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="field">
          <label>PDF файл (опционально) — поля автозаполнятся</label>
          <div className="flex items-center gap-2">
            <input type="file" accept="application/pdf,.pdf"
              className="flex-1"
              onChange={(e) => onPickFile(e.target.files?.[0] || null, false)} />
            {file && (
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => onPickFile(file, true)}
                disabled={parsing}
                title="Распознать через Claude Opus 4.7 — лучше для сканов"
              >
                ✨ AI vision
              </button>
            )}
          </div>
          {file && (
            <div className="micro-2 text-muted mt-1">
              {file.name} · {(file.size / 1024).toFixed(1)} КБ
              {parsing && " · извлекаем текст…"}
            </div>
          )}
          {parsed && (
            <div className="text-[12px] mt-1" style={{ color: parsed.startsWith("✓") ? "var(--moss)" : "var(--amber)" }}>
              {parsed}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>От кого *</label>
            <select value={f.fromOrganizationId} onChange={(e) => set("fromOrganizationId", e.target.value)}>
              {fromOrganizations.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Объект (если известен)</label>
            <select value={f.buildingId} onChange={(e) => set("buildingId", e.target.value)}>
              <option value="">— не указан —</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="field">
            <label>Исх. № *</label>
            <input value={f.number} onChange={(e) => set("number", e.target.value)} className="mono" placeholder="ППК-1-32475/2025" />
          </div>
          <div className="field">
            <label>Дата *</label>
            <input type="date" value={f.incomingDate} onChange={(e) => set("incomingDate", e.target.value)} />
          </div>
          <div className="field">
            <label>Стр.</label>
            <input type="number" min={0} value={f.pageCount} onChange={(e) => set("pageCount", Number(e.target.value))} />
          </div>
        </div>

        <div className="field">
          <label>Тема / о чём письмо</label>
          <input value={f.subject} onChange={(e) => set("subject", e.target.value)} placeholder="напр. О недостатках работ по адресу..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>Заявитель (ФИО жителя)</label>
            <input value={f.applicantName} onChange={(e) => set("applicantName", e.target.value)} />
          </div>
          <div className="field">
            <label>Источник (откуда пришло)</label>
            <input value={f.applicantOrigin} onChange={(e) => set("applicantOrigin", e.target.value)} placeholder="Прокуратура, Адм. Мариуполь, Фонд…" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label>№ исходного обращения</label>
            <input value={f.applicantLetterNumber} onChange={(e) => set("applicantLetterNumber", e.target.value)} />
          </div>
          <div className="field">
            <label>Дата исходного обращения</label>
            <input type="date" value={f.applicantLetterDate} onChange={(e) => set("applicantLetterDate", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Срок устранения по письму</label>
          <input
            type="date"
            value={f.requestedRemedyDate}
            onChange={(e) => set("requestedRemedyDate", e.target.value)}
          />
          <div className="micro-2 text-muted mt-1">
            Если в письме прописан срок — укажите. При создании дела из этого письма
            автоматически подставится в дедлайн «Устранение».
          </div>
        </div>

        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}

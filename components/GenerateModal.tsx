"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { TemplateDescriptor } from "@/lib/workflow";
import type { ContactOption } from "./GenerateButton";

type Attachment = { title: string; pages: number };

const DEFAULT_ATTACHMENTS_BY_KIND: Record<string, Attachment[]> = {
  T3_letter_to_spo_remedy: [
    { title: "Письмо ППК «Единый заказчик» (входящее)", pages: 8 },
  ],
  T6_letter_to_spo_on_defects_act: [
    { title: "Акт о недостатках/дефектах", pages: 2 },
    { title: "Акт осмотра МКД", pages: 2 },
    { title: "Письмо ППК «Единый заказчик» (входящее)", pages: 6 },
  ],
  T7_warranty_letter: [
    { title: "Акт о недостатках/дефектах", pages: 2 },
  ],
  T5_reply_to_ppk: [
    { title: "АО МКД", pages: 2 },
  ],
  T8_claim_no_info: [
    { title: "Письмо о предоставлении графика устранения замечаний", pages: 4 },
  ],
  T1_ao_mkd: [],
};

export function GenerateModal({
  caseId,
  tpl,
  onClose,
  spoContactIds,
  ppkContactIds,
  ourSignatories,
  ourExecutors,
  defaultSubject,
}: {
  caseId: string;
  tpl: TemplateDescriptor;
  onClose: () => void;
  spoContactIds: ContactOption[];
  ppkContactIds: ContactOption[];
  ourSignatories: ContactOption[];
  ourExecutors: ContactOption[];
  defaultSubject: string;
}) {
  const router = useRouter();
  const isToPpk = tpl.kind === "T5_reply_to_ppk";
  const adresseePool = isToPpk ? ppkContactIds : spoContactIds;
  const copyPool     = isToPpk ? spoContactIds : ppkContactIds;

  const [addressee, setAddressee] = useState(adresseePool[0]?.id || "");
  const [copies, setCopies]       = useState<string[]>(copyPool[0] ? [copyPool[0].id] : []);
  const [signatory, setSignatory] = useState(ourSignatories[0]?.id || "");
  const [executor, setExecutor]   = useState(ourExecutors[0]?.id || "");
  const [subject, setSubject]     = useState(defaultSubject);
  const [spoResponse, setSpoResponse]     = useState(daysFromNowISO(30));
  const [nextVisit, setNextVisit]         = useState(daysFromNowISO(31));
  const [warrantyRemedy, setWarrantyRemedy] = useState(daysFromNowISO(14));
  const [remedy, setRemedy]               = useState(daysFromNowISO(30));
  const [attachments, setAttachments] = useState<Attachment[]>(
    DEFAULT_ATTACHMENTS_BY_KIND[tpl.kind] || [],
  );
  const [busy, setBusy] = useState(false);
  const [previewNumber, setPreviewNumber] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/numbering/peek").then((r) => r.json()).then((d) => setPreviewNumber(d.next));
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function generate(action: "download" | "save") {
    setBusy(true); setError(null);
    try {
      const body = {
        caseId,
        templateKind: tpl.kind,
        addresseeId: addressee,
        copyContactIds: copies,
        signatoryId: signatory,
        executorIds: executor ? [executor] : [],
        subject,
        spoResponseDate: tpl.kind === "T3_letter_to_spo_remedy" ? spoResponse : undefined,
        nextVisitDate:   tpl.kind === "T3_letter_to_spo_remedy" || tpl.kind === "T6_letter_to_spo_on_defects_act" ? nextVisit : undefined,
        warrantyRemedyDate: tpl.kind === "T7_warranty_letter" ? warrantyRemedy : undefined,
        remedyDate: tpl.kind === "T6_letter_to_spo_on_defects_act" || tpl.kind === "T1_ao_mkd" ? remedy : undefined,
        attachments,
        action,
      };

      if (action === "download") {
        const r = await fetch("/api/documents/generate?download=1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        const blob = await r.blob();
        const cd = r.headers.get("content-disposition") || "";
        const m = cd.match(/filename\*=UTF-8''([^;]+)/) || cd.match(/filename="([^"]+)"/);
        const fn = m ? decodeURIComponent(m[1]) : `document_${Date.now()}.docx`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      } else {
        const r = await fetch("/api/documents/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        const json = await r.json();
        router.refresh();
        onClose();
        // мини-уведомление через alert, чтобы прототип оставался простым
        setTimeout(() => alert(`Сохранено в дело: исх. ${json.outgoingNumber}`), 50);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  const node = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
        background: "rgba(20, 24, 31, .55)", backdropFilter: "blur(2px)",
        overflow: "auto",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(1280px, calc(100vw - 48px))",
          maxHeight: "calc(100vh - 48px)",
          background: "var(--paper)",
          border: "1px solid var(--line)",
          boxShadow: "16px 16px 0 rgba(20,24,31,.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <header className="px-6 py-5 border-b" style={{ borderColor: "var(--line)", flex: "0 0 auto" }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="micro text-muted">
                Шаблон <span className="mono" style={{ color: "var(--ink)" }}>{tpl.kind.split("_")[0]}</span>
              </div>
              <h2 className="display text-[28px] leading-tight mt-1">{tpl.title}</h2>
              <div className="micro-2 text-muted mt-1">{tpl.subtitle}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="kbd">Esc</span>
              <button className="btn ghost" onClick={onClose}>Закрыть</button>
            </div>
          </div>
        </header>

        {/* body */}
        <div className="grid" style={{ gridTemplateColumns: "440px 1fr", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
          {/* form */}
          <div className="overflow-y-auto p-6 border-r grid gap-4" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }}>
            <div className="field">
              <label>Адресат</label>
              <select value={addressee} onChange={(e) => setAddressee(e.target.value)}>
                {adresseePool.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            <div className="field">
              <label>В копии</label>
              <div className="frame p-2 grid gap-2">
                {copyPool.map((c) => (
                  <label key={c.id} className="check">
                    <input
                      type="checkbox"
                      checked={copies.includes(c.id)}
                      onChange={(e) =>
                        setCopies((cs) =>
                          e.target.checked ? [...cs, c.id] : cs.filter((x) => x !== c.id),
                        )
                      }
                    />
                    {c.label}
                  </label>
                ))}
                {copyPool.length === 0 && <div className="text-muted text-[12.5px]">нет доступных контактов</div>}
              </div>
            </div>

            <div className="field">
              <label>Подписант</label>
              <select value={signatory} onChange={(e) => setSignatory(e.target.value)}>
                {ourSignatories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Исполнитель</label>
              <select value={executor} onChange={(e) => setExecutor(e.target.value)}>
                {ourExecutors.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            {(tpl.kind === "T3_letter_to_spo_remedy") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label>Срок ответа СПО</label><input type="date" value={spoResponse} onChange={(e) => setSpoResponse(e.target.value)} /></div>
                <div className="field"><label>Дата след. выезда</label><input type="date" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} /></div>
              </div>
            )}

            {(tpl.kind === "T6_letter_to_spo_on_defects_act") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label>Срок устранения</label><input type="date" value={remedy} onChange={(e) => setRemedy(e.target.value)} /></div>
                <div className="field"><label>Дата след. выезда</label><input type="date" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} /></div>
              </div>
            )}

            {(tpl.kind === "T7_warranty_letter") && (
              <div className="field"><label>Срок устранения по гарантии</label><input type="date" value={warrantyRemedy} onChange={(e) => setWarrantyRemedy(e.target.value)} /></div>
            )}

            {(tpl.kind === "T1_ao_mkd") && (
              <div className="field"><label>Срок устранения дефектов</label><input type="date" value={remedy} onChange={(e) => setRemedy(e.target.value)} /></div>
            )}

            <div className="field">
              <label>Тема</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div className="field">
              <label>Приложения</label>
              <div className="frame p-3 grid gap-2">
                {attachments.map((a, i) => (
                  <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: "1fr 60px auto" }}>
                    <input value={a.title} onChange={(e) =>
                      setAttachments((arr) => arr.map((x, j) => j === i ? { ...x, title: e.target.value } : x))
                    } />
                    <input type="number" min={1} value={a.pages} onChange={(e) =>
                      setAttachments((arr) => arr.map((x, j) => j === i ? { ...x, pages: Number(e.target.value) } : x))
                    } />
                    <button className="btn ghost sm" onClick={() => setAttachments((arr) => arr.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
                <button className="pill ghost mt-1 self-start" onClick={() => setAttachments((arr) => [...arr, { title: "", pages: 1 }])}>＋ ещё</button>
              </div>
            </div>

            {error && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{error}</div>}
          </div>

          {/* preview */}
          <div className="overflow-y-auto p-8" style={{ background: "linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="micro text-muted">Превью · A4 · подставлено из карточки</div>
              <div className="flex items-center gap-2 text-[12px] text-muted">
                <span className="pill" style={{ padding: "2px 7px", background: "#FFEFCF", borderColor: "#E2BB7E", color: "#6F3D08" }}>из БД</span>
                <span className="pill" style={{ padding: "2px 7px", background: "#DCEAFE", borderColor: "#1F2A6B", color: "#1F2A6B" }}>из формы</span>
              </div>
            </div>

            <div className="letter">
              <div className="corner-fold" />
              <div className="text-[10px] text-right mb-2 text-muted">
                Превью отображает структуру письма; точная вёрстка — в .docx после генерации.
              </div>
              <p>
                <b>{labelByKind(tpl.kind)}</b> · {previewNumber || "02/0246"} от {dateShort(new Date())}
              </p>
              <p style={{ marginTop: 8 }}>
                Адресат: <span className="var">{adresseePool.find((c) => c.id === addressee)?.label || "—"}</span>
              </p>
              <p>Копии: {copies.map((id) => <span key={id} className="var" style={{ marginRight: 6 }}>{copyPool.find((c) => c.id === id)?.label}</span>)}</p>
              <p style={{ marginTop: 8 }}>
                <span className="var var-edit">{subject}</span>
              </p>
              <p style={{ marginTop: 8 }}>
                Подписант: <span className="var">{ourSignatories.find((c) => c.id === signatory)?.label}</span>
              </p>
              <p>Исполнитель: <span className="var">{ourExecutors.find((c) => c.id === executor)?.label}</span></p>
              <p style={{ marginTop: 12 }}><b>Сроки:</b></p>
              {tpl.kind === "T3_letter_to_spo_remedy" && <>
                <p>Ответ СПО: <span className="var var-edit">{spoResponse}</span></p>
                <p>Следующий выезд: <span className="var var-edit">{nextVisit}</span></p>
              </>}
              {tpl.kind === "T6_letter_to_spo_on_defects_act" && <>
                <p>Устранение по Акту Н/Д: <span className="var var-edit">{remedy}</span></p>
                <p>Следующий выезд: <span className="var var-edit">{nextVisit}</span></p>
              </>}
              {tpl.kind === "T7_warranty_letter" && <>
                <p>Устранение по гарантии: <span className="var var-edit">{warrantyRemedy}</span></p>
              </>}
              <p style={{ marginTop: 12 }}><b>Приложения:</b></p>
              {attachments.length === 0 ? <p className="text-muted">— нет —</p> : (
                <ul style={{ listStyle: "disc", paddingLeft: 18 }}>
                  {attachments.map((a, i) => <li key={i}><span className="var">{a.title}</span> на <span className="var">{a.pages}</span> л.;</li>)}
                </ul>
              )}
              <div className="stamp">№ {previewNumber || "02/0246"}<br/>будет присвоен</div>
            </div>
          </div>
        </div>

        {/* footer */}
        <footer className="px-6 py-4 border-t flex items-center gap-3" style={{ borderColor: "var(--line)", background: "var(--paper)", flex: "0 0 auto" }}>
          <div className="micro text-muted">
            {addressee && signatory ? "✓ адресат и подписант выбраны" : "⚠ заполните адресата и подписанта"}
          </div>
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
          <button className="btn ghost" onClick={() => generate("download")} disabled={busy || !addressee || !signatory}>
            ↓ Скачать .docx
          </button>
          <button className="btn bordeaux" onClick={() => generate("save")} disabled={busy || !addressee || !signatory}>
            {busy ? "Генерация…" : `Сохранить в дело · присвоить № ${previewNumber || "…"}`}
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

function labelByKind(k: string): string {
  return ({
    T1_ao_mkd: "Акт осмотра МКД",
    T3_letter_to_spo_remedy: "Письмо в СПО · Об устранении",
    T5_reply_to_ppk: "Ответ в ППК",
    T6_letter_to_spo_on_defects_act: "Письмо в СПО · на основании Акта Н/Д",
    T7_warranty_letter: "О гарантиях субподрядчика",
    T8_claim_no_info: "Претензия за непредоставление информации",
  } as Record<string, string>)[k] || k;
}

function daysFromNowISO(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateShort(d: Date): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface IncomingOpt { id: string; number: string; date: string; subject: string; from: string; applicantName: string; buildingId?: string }
interface BuildingOpt { id: string; label: string; subcontractorId?: string }
interface Opt { id: string; label: string }

export function NewCaseWizard({
  incomings, buildings, subcontractors, users, ppkName, initialIncomingId,
}: {
  incomings: IncomingOpt[];
  buildings: BuildingOpt[];
  subcontractors: Opt[];
  users: Opt[];
  ppkName: string;
  initialIncomingId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [incomingId, setIncomingId] = useState(initialIncomingId || incomings[0]?.id || "");
  const incoming = incomings.find((i) => i.id === incomingId);
  const [buildingId, setBuildingId] = useState(incoming?.buildingId || buildings[0]?.id || "");
  const building = buildings.find((b) => b.id === buildingId);
  const [subcontractorId, setSubcontractorId] = useState(building?.subcontractorId || subcontractors[0]?.id || "");
  const [responsibleId, setResponsibleId] = useState(users[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // если поменяли входящее → автоподставить объект и СПО
  function pickIncoming(id: string) {
    setIncomingId(id);
    const inc = incomings.find((x) => x.id === id);
    if (inc?.buildingId) {
      setBuildingId(inc.buildingId);
      const b = buildings.find((x) => x.id === inc.buildingId);
      if (b?.subcontractorId) setSubcontractorId(b.subcontractorId);
    }
  }
  function pickBuilding(id: string) {
    setBuildingId(id);
    const b = buildings.find((x) => x.id === id);
    if (b?.subcontractorId) setSubcontractorId(b.subcontractorId);
  }

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incomingId, buildingId, subcontractorId, responsibleUserId: responsibleId }),
      });
      if (!r.ok) throw new Error(`Ошибка ${r.status}`);
      const json = await r.json();
      router.push(`/cases/${json.id}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
      setBusy(false);
    }
  }

  const StepDot = ({ n, label }: { n: number; label: string }) => (
    <div className={`flex items-center gap-2 ${step >= n ? "" : "text-muted"}`}>
      <span className={`mono text-[12px] w-6 h-6 grid place-items-center rounded-full ${step >= n ? "" : "border"}`}
        style={step >= n
          ? { background: "var(--ink)", color: "var(--paper)" }
          : { borderColor: "var(--line)" }}>
        {n}
      </span>
      <span className="text-[13px]">{label}</span>
    </div>
  );

  return (
    <section className="px-8 pt-8 pb-16 max-w-[920px]">
      <div className="micro text-muted">
        <Link href="/cases" className="hover:underline">Дела</Link> › новое
      </div>
      <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Завести дело</h1>
      <p className="read mt-2 text-[16px] text-muted">3 шага, ~90 секунд</p>

      <div className="ruler my-7" />

      <div className="flex items-center gap-6 mb-7">
        <StepDot n={1} label="Входящее" />
        <span className="text-muted">›</span>
        <StepDot n={2} label="Объект и СПО" />
        <span className="text-muted">›</span>
        <StepDot n={3} label="Ответственный" />
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="frame p-6 grid gap-4">
          <div className="micro text-muted">Шаг 1 — выберите входящее обращение</div>
          {incomings.length === 0 ? (
            <div className="text-muted">Нет непривязанных входящих. Сначала загрузите PDF на странице <Link className="underline" href="/inbox">/inbox</Link>.</div>
          ) : (
            <div className="grid gap-2">
              {incomings.map((i) => (
                <label key={i.id} className={`frame p-4 cursor-pointer ${incomingId === i.id ? "border-2" : ""}`} style={incomingId === i.id ? { borderColor: "var(--ink)" } : {}}>
                  <input type="radio" name="inc" className="hidden" checked={incomingId === i.id} onChange={() => pickIncoming(i.id)} />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="mono text-[13px]">{i.number}</div>
                      <div className="text-[13px] mt-1 text-muted">от {i.from} · {i.date}</div>
                      <div className="text-[14px] mt-1">{i.subject || "—"}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Link href="/cases" className="btn ghost">Отмена</Link>
            <button className="btn" disabled={!incomingId} onClick={() => setStep(2)}>Далее →</button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="frame p-6 grid gap-4">
          <div className="micro text-muted">Шаг 2 — выберите объект МКД и СПО</div>
          <div className="field">
            <label>Объект</label>
            <select value={buildingId} onChange={(e) => pickBuilding(e.target.value)}>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Субподрядчик (СПО)</label>
            <select value={subcontractorId} onChange={(e) => setSubcontractorId(e.target.value)}>
              {subcontractors.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="text-[12.5px] text-muted">Привязка к договору и контактам — автоматически из карточки СПО.</div>
          <div className="flex justify-between gap-2 pt-4">
            <button className="btn ghost" onClick={() => setStep(1)}>← Назад</button>
            <button className="btn" disabled={!buildingId || !subcontractorId} onClick={() => setStep(3)}>Далее →</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="frame p-6 grid gap-4">
          <div className="micro text-muted">Шаг 3 — назначьте ответственного</div>
          <div className="field">
            <label>Ответственный специалист</label>
            <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>

          <div className="ruler my-2" />
          <div className="text-[13px] text-muted">Сводка:</div>
          <ul className="text-[13px] grid gap-1.5">
            <li>Входящее: <span className="mono">{incoming?.number}</span> от {incoming?.date} ({incoming?.from})</li>
            <li>Объект: {buildings.find((b) => b.id === buildingId)?.label}</li>
            <li>СПО: {subcontractors.find((s) => s.id === subcontractorId)?.label}</li>
            <li>Ответственный: {users.find((u) => u.id === responsibleId)?.label}</li>
            <li>Заказчик (всегда): {ppkName}</li>
          </ul>

          {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}

          <div className="flex justify-between gap-2 pt-4">
            <button className="btn ghost" onClick={() => setStep(2)} disabled={busy}>← Назад</button>
            <button className="btn bordeaux" onClick={submit} disabled={busy}>
              {busy ? "Создаём…" : "Создать дело"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

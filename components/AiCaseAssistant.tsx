"use client";

import { useState } from "react";
import { Modal } from "./Modal";

export function AiCaseAssistant({ caseId }: { caseId: string }) {
  const [openChat, setOpenChat] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [busySummary, setBusySummary] = useState(false);

  async function loadSummary() {
    setBusySummary(true); setSummary(null);
    try {
      const r = await fetch("/api/ai/case-summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const j = await r.json();
      if (!r.ok) {
        setSummary(j.message || j.error || "Ошибка"); return;
      }
      setSummary(j.summary);
    } finally { setBusySummary(false); }
  }

  return (
    <div className="frame p-5 mt-6" style={{ background: "linear-gradient(180deg, var(--paper) 0%, #EFEEE7 100%)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="micro text-muted">AI-помощник</div>
          <div className="display text-[18px] mt-0.5">Claude Opus 4.7</div>
        </div>
        <div className="flex gap-2">
          <button className="btn ghost sm" onClick={loadSummary} disabled={busySummary}>
            {busySummary ? "…" : "✨ Резюме дела"}
          </button>
          <button className="btn sm" onClick={() => setOpenChat(true)}>💬 Чат с делом</button>
        </div>
      </div>

      {summary && (
        <>
          <div className="ruler my-3" />
          <div className="read text-[14px]" style={{ whiteSpace: "pre-wrap" }}>{summary}</div>
        </>
      )}

      {openChat && <ChatModal caseId={caseId} onClose={() => setOpenChat(false)} />}
    </div>
  );
}

function ChatModal({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>();

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, threadId, question: q }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMessages((m) => [...m, { role: "assistant", content: `⚠ ${j.message || j.error || "ошибка"}` }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: j.answer }]);
        if (j.threadId && !threadId) setThreadId(j.threadId);
      }
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title="Чат с делом"
      subtitle="Claude знает паспорт, хронологию, документы и выезды"
      onClose={onClose}
      width={760}
      footer={
        <>
          <input
            className="flex-1"
            style={{ background: "var(--paper)", border: "1px solid var(--line)", padding: "9px 11px", outline: "none" }}
            placeholder="Напишите вопрос…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            disabled={busy}
          />
          <button className="btn bordeaux" onClick={send} disabled={busy || !input.trim()}>
            {busy ? "…" : "Отправить"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        {messages.length === 0 && (
          <div className="text-muted text-[14px]">
            Например:<br />
            • «Какие сроки горят сейчас?»<br />
            • «Что СПО последний раз отвечал?»<br />
            • «Какой следующий шаг рекомендуешь?»<br />
            • «Какие пункты договора применимы?»
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`frame p-3 ${m.role === "user" ? "bg-paper2" : ""}`}>
            <div className="micro-2 text-muted mb-1">{m.role === "user" ? "Вы" : "Claude"}</div>
            <div className="read text-[14px]" style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="text-muted text-[13px]">Claude думает…</div>}
      </div>
    </Modal>
  );
}

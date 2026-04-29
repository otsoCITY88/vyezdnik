"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type Item = { id: string; kind: string; title: string; subtitle: string; href: string };

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((s) => !s);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) { setQ(""); setItems([]); setHighlight(0); return; }
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!q.trim()) { setItems([]); return; }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { cases: Item[]; buildings: Item[]; organizations: Item[]; outgoing: Item[] }) => {
        setItems([...d.cases, ...d.outgoing, ...d.buildings, ...d.organizations]);
        setHighlight(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [q, open]);

  function go(i: Item) {
    setOpen(false);
    router.push(i.href);
  }

  function onKeyInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter" && items[highlight]) { e.preventDefault(); go(items[highlight]); }
  }

  if (!open || typeof document === "undefined") return null;
  const node = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: 100,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "10vh", paddingLeft: 24, paddingRight: 24,
        background: "rgba(20, 24, 31, .55)", backdropFilter: "blur(2px)",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, calc(100vw - 48px))",
          maxHeight: "70vh",
          background: "var(--paper)",
          border: "1px solid var(--line)",
          boxShadow: "16px 16px 0 rgba(20,24,31,.18)",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          overflow: "hidden",
        }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyInput}
            placeholder="Поиск дел, объектов, исх.№, контрагентов…"
            className="w-full bg-transparent outline-none text-[16px]"
            style={{ padding: "8px 0" }}
          />
        </div>
        <div className="overflow-y-auto">
          {!q.trim() ? (
            <div className="p-8 text-center text-muted text-[13px]">
              Начните вводить — поиск идёт по номерам дел, адресам, входящим, контрагентам, исх.№
            </div>
          ) : loading ? (
            <div className="p-6 text-center text-muted text-[13px]">…ищем</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted text-[13px]">Ничего не найдено</div>
          ) : (
            <ul>
              {items.map((it, i) => (
                <li
                  key={`${it.kind}-${it.id}`}
                  className={`px-4 py-2.5 cursor-pointer flex items-center gap-3 ${highlight === i ? "" : ""}`}
                  style={highlight === i ? { background: "var(--paper-2)" } : {}}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => go(it)}
                >
                  <span
                    className="micro-2"
                    style={{
                      background: kindColor(it.kind), color: "white",
                      padding: "2px 6px", letterSpacing: ".1em",
                    }}
                  >
                    {kindLabel(it.kind)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] truncate">{it.title}</div>
                    <div className="text-[11.5px] text-muted truncate">{it.subtitle}</div>
                  </div>
                  <span className="kbd">↵</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
  return createPortal(node, document.body);
}

function kindLabel(k: string) {
  return ({ case: "ДЕЛО", building: "МКД", org: "КОНТР.", doc: "ИСХ." } as Record<string, string>)[k] || k;
}
function kindColor(k: string) {
  return ({
    case: "var(--bordeaux)",
    building: "var(--moss)",
    org: "var(--indigo)",
    doc: "var(--amber)",
  } as Record<string, string>)[k] || "var(--ink)";
}

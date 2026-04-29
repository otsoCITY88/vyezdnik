"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function Modal({
  title, subtitle, onClose, children, footer, width = 720,
}: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode; width?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!mounted) return null;

  const node = (
    <div
      className="modal-root"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0, left: 0,
        width: "100vw", height: "100vh",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(20, 24, 31, .55)",
        backdropFilter: "blur(2px)",
        overflow: "auto",
        boxSizing: "border-box",
      }}
    >
      <div
        className="modal-card-flex"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: `min(${width}px, calc(100vw - 48px))`,
          maxHeight: "calc(100vh - 48px)",
          background: "var(--paper)",
          border: "1px solid var(--line)",
          boxShadow: "16px 16px 0 rgba(20,24,31,.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          className="px-6 py-5 border-b"
          style={{ borderColor: "var(--line)", flex: "0 0 auto" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="display text-[24px] leading-tight">{title}</h2>
              {subtitle && <div className="micro-2 text-muted mt-1">{subtitle}</div>}
            </div>
            <div className="flex items-center gap-2 flex-none">
              <span className="kbd">Esc</span>
              <button className="btn ghost" onClick={onClose}>Закрыть</button>
            </div>
          </div>
        </header>
        <div className="p-6" style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
          {children}
        </div>
        {footer && (
          <footer
            className="px-6 py-4 border-t flex items-center gap-3 flex-wrap"
            style={{ borderColor: "var(--line)", background: "var(--paper)", flex: "0 0 auto" }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

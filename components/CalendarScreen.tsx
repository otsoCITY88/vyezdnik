"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ruLocale from "@fullcalendar/core/locales/ru";

export function CalendarScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="px-8 pt-8 pb-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="micro text-muted">Расписание</div>
          <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Выезды комиссии</h1>
          <p className="read mt-2 text-[16px] text-muted">
            Перетаскивайте выезды для переноса. Цвет — итог последнего выезда.
          </p>
        </div>
        <a href="/api/visits.ics" className="btn ghost">↓ Экспорт .ics (для Outlook/Google)</a>
      </div>

      <div className="ruler my-6" />

      {error && (
        <div className="frame p-3 mb-4 text-bordeaux text-[13px]" style={{ background: "var(--bordeaux-bg)" }}>
          {error}
          <button className="btn ghost sm ml-3" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="frame p-4 calendar-host">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ruLocale}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          height="auto"
          firstDay={1}
          editable
          events="/api/visits"
          eventClick={(info) => {
            const cid = info.event.extendedProps?.caseId;
            if (cid) router.push(`/cases/${cid}`);
          }}
          eventDrop={async (info) => {
            try {
              const r = await fetch(`/api/visits?id=${info.event.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visitDate: info.event.start?.toISOString() }),
              });
              if (!r.ok) throw new Error();
              setError(null);
            } catch {
              info.revert();
              setError("Не удалось перенести выезд. Попробуйте ещё раз.");
            }
          }}
        />
      </div>

      <style jsx global>{`
        .calendar-host .fc { font-family: 'Instrument Sans', system-ui, sans-serif; }
        .calendar-host .fc-toolbar-title { font-family: 'Fraunces', serif; font-weight: 500; }
        .calendar-host .fc-button { background: var(--ink) !important; border-color: var(--ink) !important; text-transform: uppercase; font-size: 11px; letter-spacing: .12em; }
        .calendar-host .fc-button:hover { background: var(--ink-2) !important; }
        .calendar-host .fc-button-active { background: var(--bordeaux) !important; border-color: var(--bordeaux) !important; }
        .calendar-host .fc-day-today { background: var(--paper-2) !important; }
        .calendar-host .fc-event { cursor: pointer; padding: 2px 4px; font-size: 11.5px; }
        .calendar-host .fc-event-done { border: none; }
        .calendar-host .fc-event-planned { border-style: dashed !important; border-width: 1.5px !important; background: transparent !important; }
        .calendar-host .fc-event-planned .fc-event-title,
        .calendar-host .fc-event-planned .fc-event-time { font-style: italic; }
        .calendar-host .fc-col-header-cell { background: var(--paper-2); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
      `}</style>

      <div className="flex items-center gap-3 mt-4 text-[12px] text-muted">
        <span><span style={{ display: "inline-block", width: 14, height: 10, background: "#1F2A6B", marginRight: 4, verticalAlign: "middle" }}></span> состоявшиеся</span>
        <span><span style={{ display: "inline-block", width: 14, height: 10, border: "1.5px dashed #1F2A6B", marginRight: 4, verticalAlign: "middle" }}></span> запланированные</span>
        <span className="ml-4">цвет = итог: <span className="text-bordeaux">бордо — дефекты</span> · <span className="text-amber">амбра — частично</span> · <span className="text-moss">мох — устранены</span></span>
      </div>
    </section>
  );
}

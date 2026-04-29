"use client";

import { useState } from "react";
import { AddOrganizationModal } from "./AddOrganizationModal";
import { AddContactModal } from "./AddContactModal";
import { EditOrganizationModal } from "./EditOrganizationModal";
import { EditContactModal, ContactView } from "./EditContactModal";

const KIND_LABEL: Record<string, string> = {
  ours: "Мы (РКС-НР)",
  customer: "Заказчик · ППК",
  subcontractor: "Субподрядчик",
  administration: "Администрация",
  prosecutor: "Прокуратура",
  fund: "Фонд / эксплуатация",
  balance_holder: "Балансодержатель",
  other: "Прочее",
};

export interface OrgView {
  id: string; kind: string; shortName: string; fullName: string;
  inn?: string | null; kpp?: string | null; ogrn?: string | null;
  legalAddress?: string | null; defaultEmail?: string | null;
  extraEmails?: string[];
  contacts: ContactView[];
  cases: number;
}

export function OrganizationsScreen({ orgs }: { orgs: OrgView[] }) {
  const [openAddOrg, setOpenAddOrg] = useState(false);
  const [addContactFor, setAddContactFor] = useState<OrgView | null>(null);
  const [editOrg, setEditOrg] = useState<OrgView | null>(null);
  const [editContact, setEditContact] = useState<ContactView | null>(null);

  const grouped = orgs.reduce<Record<string, OrgView[]>>((acc, o) => {
    (acc[o.kind] ||= []).push(o);
    return acc;
  }, {});

  return (
    <section className="px-8 pt-8 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <div className="micro text-muted">Справочник</div>
          <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Контрагенты</h1>
          <p className="read mt-2 text-[16px] text-muted">{orgs.length} организаций в реестре</p>
        </div>
        <button className="btn" onClick={() => setOpenAddOrg(true)}>＋ Добавить контрагента</button>
      </div>

      <div className="ruler my-7" />

      {Object.entries(grouped).map(([kind, items]) => (
        <div key={kind} className="mb-10">
          <div className="micro text-muted mb-3">{KIND_LABEL[kind] || kind}</div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            {items.map((o) => (
              <div key={o.id} className="frame p-5">
                <div className="flex items-center justify-between">
                  <div className="display text-[20px]">{o.shortName}</div>
                  <div className="flex items-center gap-2">
                    {o.cases > 0 && <span className="pill">{o.cases} дел</span>}
                    <button className="btn ghost sm" onClick={() => setEditOrg(o)}>✎</button>
                  </div>
                </div>
                <div className="text-[13px] text-muted mt-1">{o.fullName}</div>
                <div className="ruler my-3" />
                <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                  {o.inn && <div><span className="micro-2 text-muted">ИНН</span><div className="mono">{o.inn}</div></div>}
                  {o.kpp && <div><span className="micro-2 text-muted">КПП</span><div className="mono">{o.kpp}</div></div>}
                  {o.ogrn && <div><span className="micro-2 text-muted">ОГРН</span><div className="mono">{o.ogrn}</div></div>}
                  {o.defaultEmail && <div><span className="micro-2 text-muted">E-mail</span><div className="mono">{o.defaultEmail}</div></div>}
                </div>
                {o.legalAddress && (
                  <div className="mt-2 text-[12.5px]">
                    <span className="micro-2 text-muted">Адрес</span>
                    <div>{o.legalAddress}</div>
                  </div>
                )}
                <div className="ruler my-3" />
                <div className="flex items-center justify-between mb-1">
                  <div className="micro-2 text-muted">Контакты</div>
                  <button className="pill ghost" onClick={() => setAddContactFor(o)}>＋ контакт</button>
                </div>
                {o.contacts.length === 0 ? (
                  <div className="text-muted text-[12.5px]">контакты не добавлены</div>
                ) : (
                  <ul className="text-[12.5px] space-y-1">
                    {o.contacts.map((c) => (
                      <li key={c.id} className="flex justify-between gap-2 group">
                        <span>{c.shortName || `${c.lastName} ${c.firstName}`} · {c.position || "—"}</span>
                        <span className="flex items-center gap-2">
                          <span className="mono text-muted">{c.email || ""}</span>
                          <button className="text-muted hover:text-ink text-[12px]" onClick={() => setEditContact(c)}>✎</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {o.extraEmails && o.extraEmails.length > 0 && (
                  <div className="text-[11px] text-muted mt-2 mono">
                    Доп. e-mail: {o.extraEmails.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {openAddOrg && <AddOrganizationModal onClose={() => setOpenAddOrg(false)} />}
      {addContactFor && (
        <AddContactModal
          organizationId={addContactFor.id}
          organizationShortName={addContactFor.shortName}
          onClose={() => setAddContactFor(null)}
        />
      )}
      {editOrg && <EditOrganizationModal org={editOrg} onClose={() => setEditOrg(null)} />}
      {editContact && <EditContactModal contact={editContact} onClose={() => setEditContact(null)} />}
    </section>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dateShort, safeJSON } from "@/lib/format";
import { peekOutgoingNumber } from "@/lib/numbering";
import { Pill } from "@/components/Pill";
import { DocumentActions, DocumentMini } from "@/components/DocumentActions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  T1_ao_mkd: "T1 · Акт осмотра МКД",
  T3_letter_to_spo_remedy: "T3 · Об устранении (СПО)",
  T5_reply_to_ppk: "T5 · Ответ в ППК",
  T6_letter_to_spo_on_defects_act: "T6 · По Акту Н/Д (СПО)",
  T7_warranty_letter: "T7 · О гарантиях",
  T8_claim_no_info: "T8 · Претензия (штраф)",
};

export default async function OutgoingPage() {
  const docs = await prisma.document.findMany({
    where: { outgoingNumber: { not: null } },
    include: { case: { include: { building: true, subcontractor: true } } },
    orderBy: { outgoingDate: "desc" },
  });
  const next = await peekOutgoingNumber();

  // подписанты + адресаты
  const sigIds = Array.from(new Set(docs.map((d) => d.signatoryId).filter(Boolean) as string[]));
  const signatories = await prisma.contact.findMany({ where: { id: { in: sigIds } } });
  const sigById = Object.fromEntries(signatories.map((s) => [s.id, s]));

  const allCtIds = Array.from(new Set(docs.flatMap((d) =>
    safeJSON<Array<{ contactId: string; role: string }>>(d.addressees, []).map((a) => a.contactId),
  )));
  const recipients = await prisma.contact.findMany({ where: { id: { in: allCtIds } } });
  const ctById = new Map(recipients.map((c) => [c.id, c]));

  return (
    <section className="px-8 pt-8 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <div className="micro text-muted">Реестр</div>
          <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Исходящие</h1>
          <p className="read mt-2 text-[16px] text-muted">{docs.length} писем · автонумерация · УКЭП и ЭДО</p>
        </div>
        <div className="text-right">
          <div className="micro text-muted">След. номер</div>
          <div className="display text-[32px] mono mt-1">{next}</div>
        </div>
      </div>

      <div className="ruler my-7" />

      <div className="frame">
        <table className="editorial">
          <thead>
            <tr>
              <th>Исх. №</th><th>Дата</th><th>Тип</th><th>Объект · дело</th>
              <th>Адресат</th><th>Подписант</th><th>Статус</th><th></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const ads = safeJSON<Array<{ contactId: string; role: string }>>(d.addressees, []);
              const to = ads.filter((a) => a.role === "main").map((a) => ctById.get(a.contactId)?.email).filter(Boolean) as string[];
              const cc = ads.filter((a) => a.role === "copy").map((a) => ctById.get(a.contactId)?.email).filter(Boolean) as string[];
              const mini: DocumentMini = {
                id: d.id, outgoingNumber: d.outgoingNumber || "",
                status: d.status,
                signedAt: d.signedAt?.toISOString() || null,
                signerName: d.signerName, signatureFingerprint: d.signatureFingerprint,
                edoStatus: d.edoStatus, edoTrackId: d.edoTrackId, edoProvider: d.edoProvider,
                hasFile: !!d.renderedDocxPath,
                suggestedTo: to, suggestedCc: cc,
              };
              return (
                <tr key={d.id} className="flat">
                  <td className="mono">{d.outgoingNumber}</td>
                  <td className="mono">{d.outgoingDate ? dateShort(d.outgoingDate) : "—"}</td>
                  <td>{KIND_LABEL[d.templateKind] || d.templateKind}</td>
                  <td>
                    <div>{d.case.building.shortAddress}</div>
                    <div className="micro-2 text-muted mt-1">
                      <Link href={`/cases/${d.caseId}`} className="hover:underline mono">{d.case.caseNumber}</Link>
                    </div>
                  </td>
                  <td>{d.case.subcontractor.shortName}</td>
                  <td>{d.signatoryId ? sigById[d.signatoryId]?.shortName : "—"}</td>
                  <td>
                    <Pill tone={d.status === "sent" ? "moss" : d.status === "signed" ? "indigo" : "neutral"}>
                      {d.status}
                    </Pill>
                  </td>
                  <td><DocumentActions doc={mini} /></td>
                </tr>
              );
            })}
            {docs.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted p-10">Реестр пока пуст. Сгенерируйте первое письмо из карточки дела.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

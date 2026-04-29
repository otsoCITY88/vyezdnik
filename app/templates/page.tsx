import { TEMPLATE_CATALOG } from "@/lib/workflow";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BODIES } from "@/lib/template-defaults";
import { TemplatesScreen, TemplateView } from "@/components/TemplatesScreen";

export const dynamic = "force-dynamic";

export default async function Page() {
  const dbItems = await prisma.documentTemplate.findMany();
  const dbByKind = new Map(dbItems.map((t) => [t.kind, t]));

  const view: TemplateView[] = TEMPLATE_CATALOG.map((c) => {
    const db = dbByKind.get(c.kind);
    return {
      kind: c.kind,
      title: db?.title || c.title,
      subtitle: db?.subtitle || c.subtitle,
      source: db?.source || "code",
      active: db?.active ?? true,
      availableIn: c.availableIn,
      transitionsTo: c.transitionsTo,
      hasBody: !!(db?.body) || !!DEFAULT_BODIES[c.kind],
      hasUploadedDocx: !!db?.docxPath,
    };
  });

  return <TemplatesScreen templates={view} />;
}

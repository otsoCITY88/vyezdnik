import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LoginPage(
  { searchParams }: { searchParams: Promise<{ from?: string; error?: string }> },
) {
  const params = await searchParams;
  const from = params?.from || "/";
  const users = await prisma.user.findMany({ orderBy: { fullName: "asc" } });

  return (
    <div className="min-h-screen grid place-items-center" style={{ background: "var(--paper)" }}>
      <div className="frame p-8" style={{ width: 460, boxShadow: "16px 16px 0 rgba(20,24,31,.12)" }}>
        <div className="display text-[36px] leading-none">
          <span style={{ fontWeight: 600 }}>РКС</span>
          <span className="text-muted">·</span>
          <span style={{ fontStyle: "italic", fontWeight: 500 }}>Выезд</span>
        </div>
        <div className="micro-2 text-muted mt-2">Реестр обращений · ОП Мариуполь</div>
        <div className="ruler my-5" />

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("credentials", { email: String(formData.get("email") || ""), redirectTo: from });
          }}
          className="grid gap-4"
        >
          <div className="field">
            <label>E-mail</label>
            <input name="email" type="email" required placeholder="palkov.my@rks-nr.ru" defaultValue={users[0]?.email || ""} />
            <div className="micro-2 text-muted mt-1">Прототип: пароль не нужен — введите e-mail из списка ниже</div>
          </div>
          <button type="submit" className="btn bordeaux">Войти</button>
          {params?.error && (
            <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>
              Ошибка входа: {params.error}
            </div>
          )}
        </form>

        <div className="ruler my-5" />
        <div className="micro text-muted mb-2">Доступные аккаунты ({users.length})</div>
        <ul className="text-[12.5px] grid gap-1">
          {users.map((u) => (
            <li key={u.id} className="flex justify-between gap-2">
              <span>{u.fullName}</span>
              <span className="mono text-muted">{u.email}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

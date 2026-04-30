import { signIn } from "@/auth";

export const dynamic = "force-dynamic";

const ERROR_LABELS: Record<string, string> = {
  CredentialsSignin: "Неверный e-mail. Проверьте, что пользователь существует.",
  AccessDenied: "Доступ запрещён.",
  Configuration: "Ошибка конфигурации авторизации.",
  Verification: "Ссылка для входа недействительна или устарела.",
};

export default async function LoginPage(
  { searchParams }: { searchParams: Promise<{ from?: string; error?: string }> },
) {
  const params = await searchParams;
  const from = params?.from || "/";
  const errorLabel = params?.error
    ? ERROR_LABELS[params.error] || `Ошибка входа: ${params.error}`
    : null;

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
            await signIn("credentials", {
              email: String(formData.get("email") || ""),
              redirectTo: from,
            });
          }}
          className="grid gap-4"
        >
          <div className="field">
            <label>E-mail</label>
            <input
              name="email"
              type="email"
              required
              placeholder="name@rks-nr.ru"
              autoComplete="email"
              autoFocus
            />
            <div className="micro-2 text-muted mt-1">
              Введите e-mail вашего аккаунта. Если у вас ещё нет доступа — обратитесь к администратору.
            </div>
          </div>
          <button type="submit" className="btn bordeaux">Войти</button>
          {errorLabel && (
            <div
              className="text-bordeaux text-[13px] frame p-3"
              style={{ background: "var(--bordeaux-bg)" }}
            >
              {errorLabel}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

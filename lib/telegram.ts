// Простой Telegram-нотификатор. Без креденшелов — no-op + лог.

export async function tgNotify(text: string, chatId?: string): Promise<{ ok: boolean; reason?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatId || process.env.TELEGRAM_DEFAULT_CHAT;
  if (!token || !chat) return { ok: false, reason: "telegram_not_configured" };

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML" }),
    });
    if (!r.ok) return { ok: false, reason: `tg_${r.status}` };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, reason: e instanceof Error ? e.message : "tg_error" };
  }
}

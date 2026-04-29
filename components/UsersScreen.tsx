"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { Pill } from "./Pill";

export interface UserView {
  id: string; email: string; fullName: string;
  shortName?: string | null; position?: string | null;
  isHead?: boolean; isAdmin?: boolean; cases: number;
}

export function UsersScreen({ users }: { users: UserView[] }) {
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState<UserView | null>(null);
  return (
    <section className="px-8 pt-8 pb-16">
      <div className="flex items-end justify-between">
        <div>
          <div className="micro text-muted">Справочник</div>
          <h1 className="display text-[52px] leading-none mt-2 tracking-tight">Пользователи</h1>
          <p className="read mt-2 text-[16px] text-muted">{users.length} активных, к ним прикреплены дела</p>
        </div>
        <button className="btn" onClick={() => setAdd(true)}>＋ Добавить пользователя</button>
      </div>

      <div className="ruler my-7" />

      <div className="frame">
        <table className="editorial">
          <thead>
            <tr><th>ФИО</th><th>Должность</th><th>E-mail</th><th>Роль</th><th>Дел в работе</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="flat">
                <td>
                  <div className="font-medium">{u.fullName}</div>
                  <div className="micro-2 text-muted mt-0.5">{u.shortName}</div>
                </td>
                <td>{u.position || "—"}</td>
                <td className="mono">{u.email}</td>
                <td>
                  {u.isAdmin && <Pill tone="bordeaux">admin</Pill>}{" "}
                  {u.isHead && <Pill tone="indigo">head</Pill>}
                  {!u.isHead && !u.isAdmin && <Pill>specialist</Pill>}
                </td>
                <td>{u.cases > 0 ? <Pill tone="indigo">{u.cases}</Pill> : <span className="text-muted">0</span>}</td>
                <td><button className="btn ghost sm" onClick={() => setEdit(u)}>✎</button></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="text-center text-muted p-8">пока никого нет</td></tr>}
          </tbody>
        </table>
      </div>

      {add && <UserFormModal onClose={() => setAdd(false)} />}
      {edit && <UserFormModal user={edit} onClose={() => setEdit(null)} />}
    </section>
  );
}

function UserFormModal({ user, onClose }: { user?: UserView; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [askDel, setAskDel] = useState(false);
  const [f, setF] = useState({
    email: user?.email || "",
    fullName: user?.fullName || "",
    shortName: user?.shortName || "",
    position: user?.position || "",
    isHead: user?.isHead || false,
    isAdmin: user?.isAdmin || false,
  });

  async function save() {
    setBusy(true); setErr(null);
    try {
      const path = user ? `/api/users/${user.id}` : "/api/users";
      const method = user ? "PATCH" : "POST";
      const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        if (j.error === "email_taken") throw new Error("Этот e-mail уже зарегистрирован");
        throw new Error(j.message || `Ошибка ${r.status}`);
      }
      router.refresh(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setBusy(false); }
  }

  async function del() {
    if (!user) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.message || `Ошибка ${r.status}`);
      }
      router.refresh(); onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Ошибка");
      setAskDel(false);
    } finally { setBusy(false); }
  }

  return (
    <Modal
      title={user ? `Редактирование · ${user.fullName}` : "Новый пользователь"}
      onClose={onClose}
      width={620}
      footer={
        user && askDel ? (
          <>
            <span className="text-bordeaux text-[13px]">Точно удалить?</span>
            <div className="flex-1" />
            <button className="btn ghost" onClick={() => setAskDel(false)} disabled={busy}>Отмена</button>
            <button className="btn bordeaux" onClick={del} disabled={busy}>Удалить</button>
          </>
        ) : (
          <>
            {user && <button className="btn ghost" style={{ color: "var(--bordeaux)" }} onClick={() => setAskDel(true)}>Удалить</button>}
            <div className="flex-1" />
            <button className="btn ghost" onClick={onClose} disabled={busy}>Отмена</button>
            <button className="btn bordeaux" onClick={save} disabled={busy || !f.email || !f.fullName}>
              {busy ? "Сохраняем…" : "Сохранить"}
            </button>
          </>
        )
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="field"><label>E-mail *</label><input value={f.email} onChange={(e) => setF((s) => ({ ...s, email: e.target.value }))} /></div>
          <div className="field"><label>Краткое (для подписи)</label><input value={f.shortName} onChange={(e) => setF((s) => ({ ...s, shortName: e.target.value }))} placeholder="напр. М.Ю. Пальков" /></div>
        </div>
        <div className="field"><label>ФИО полностью *</label><input value={f.fullName} onChange={(e) => setF((s) => ({ ...s, fullName: e.target.value }))} /></div>
        <div className="field"><label>Должность</label><input value={f.position} onChange={(e) => setF((s) => ({ ...s, position: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="check"><input type="checkbox" checked={f.isHead} onChange={(e) => setF((s) => ({ ...s, isHead: e.target.checked }))} /> руководитель (может подписывать)</label>
          <label className="check"><input type="checkbox" checked={f.isAdmin} onChange={(e) => setF((s) => ({ ...s, isAdmin: e.target.checked }))} /> администратор</label>
        </div>
        {err && <div className="text-bordeaux text-[13px] frame p-3" style={{ background: "var(--bordeaux-bg)" }}>{err}</div>}
      </div>
    </Modal>
  );
}

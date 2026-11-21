"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Role, User } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";

export default function UsersPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<User[]>([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "specialist" as Role,
  });

  async function load() {
    const r = await fetch("/api/users");
    if (!r.ok) {
      setErr("Only administrators can manage users.");
      return;
    }
    const d = await r.json();
    setItems(d.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Failed to create account");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "specialist" });
    setErr("");
    load();
  }

  if (err && items.length === 0) {
    return <div className="rounded-3xl bg-white p-8 text-navy-900/60">{err}</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl bg-white p-5 shadow-card">
        <h1 className="font-display text-2xl font-extrabold">{t("users.title")}</h1>
        <p className="mt-1 text-sm text-navy-900/55">{t("users.subtitle")}</p>
        <div className="mt-5 divide-y divide-navy-900/5">
          {items.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-semibold">{u.name}</div>
                <div className="text-xs text-navy-900/45">{u.email}</div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  u.role === "admin" ? "bg-navy-900 text-white" : "bg-teal-100 text-teal-800"
                }`}
              >
                {u.role === "admin" ? t("users.admin") : t("users.specialist")}
              </span>
            </div>
          ))}
        </div>
      </section>
      <form onSubmit={onSubmit} className="rounded-3xl bg-white p-5 shadow-card">
        <h2 className="font-display text-lg font-bold">{t("users.createUser")}</h2>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-navy-900/50">
          {t("users.name")}
        </label>
        <input
          className="mt-1 w-full rounded-xl border border-navy-900/10 bg-[#f7fafb] px-3 py-2 text-sm"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-navy-900/50">
          {t("users.email")}
        </label>
        <input
          type="email"
          className="mt-1 w-full rounded-xl border border-navy-900/10 bg-[#f7fafb] px-3 py-2 text-sm"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-navy-900/50">
          {t("login.password")}
        </label>
        <input
          type="password"
          className="mt-1 w-full rounded-xl border border-navy-900/10 bg-[#f7fafb] px-3 py-2 text-sm"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={6}
        />
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-navy-900/50">
          {t("users.role")}
        </label>
        <select
          className="mt-1 w-full rounded-xl border border-navy-900/10 bg-[#f7fafb] px-3 py-2 text-sm"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
        >
          <option value="specialist">{t("users.specialist")}</option>
          <option value="admin">{t("users.admin")}</option>
        </select>
        {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
        <button className="mt-5 w-full rounded-xl bg-navy-900 py-2.5 text-sm font-semibold text-white">
          {t("users.createUser")}
        </button>
      </form>
    </div>
  );
}

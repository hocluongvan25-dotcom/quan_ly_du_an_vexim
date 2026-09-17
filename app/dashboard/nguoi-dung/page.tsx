"use client";

import { FormEvent, useEffect, useState } from "react";
import { RoleBadge } from "@/components/CrmBits";
import { CRM_ROLES, ROLE_DUTY, ROLE_LABEL, type Role, type Team, type User } from "@/lib/types";

/** Quản lý tài khoản & vai trò CRM — chỉ Founder/Admin. */
export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "lr" as Role,
    team_id: "",
  });
  const [teamName, setTeamName] = useState("");

  async function load() {
    const r = await fetch("/api/users");
    if (!r.ok) {
      setErr("Chỉ Founder / Admin được quản lý người dùng.");
      return;
    }
    const d = await r.json();
    setItems(d.items || []);
    const t = await fetch("/api/crm/teams").then((x) => x.json());
    setTeams(t.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        team_id: form.team_id ? Number(form.team_id) : null,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Không tạo được");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "lr", team_id: "" });
    setErr("");
    load();
  }

  async function createTeam(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/crm/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName }),
    });
    if (r.ok) {
      setTeamName("");
      load();
    } else {
      const d = await r.json();
      setErr(d.error || "Không tạo được team");
    }
  }

  if (err && items.length === 0) {
    return <div className="rounded-3xl bg-white p-8 text-navy-900/60">{err}</div>;
  }

  const byRole = (r: Role) => items.filter((u) => u.role === r);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Người dùng &amp; vai trò CRM</h1>
        <p className="mt-1 text-sm text-navy-900/55">
          Founder / Admin · AE (Pipeline Owner) · SR (Sales Research) · LR (Lead Research) · Bộ phận
          chuyên môn hồ sơ.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CRM_ROLES.map((r) => (
          <section key={r} className="rounded-3xl bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <RoleBadge role={r} />
              <span className="font-display text-xl font-extrabold text-navy-900">
                {byRole(r).length}
              </span>
            </div>
            <h2 className="mt-2 font-display text-base font-bold">{ROLE_LABEL[r]}</h2>
            <p className="mt-1 text-xs leading-relaxed text-navy-900/55">{ROLE_DUTY[r]}</p>
            <ul className="mt-3 space-y-1.5">
              {byRole(r).map((u) => (
                <li key={u.id} className="rounded-xl bg-teal-50 px-3 py-2">
                  <div className="text-sm font-semibold text-navy-900">{u.name}</div>
                  <div className="text-[11px] text-navy-900/50">{u.email}</div>
                  <div className="text-[11px] text-navy-900/45">
                    {teams.find((t) => t.id === u.team_id)?.name || "Chưa thuộc team nào"}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="rounded-3xl bg-white p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Thêm tài khoản</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/50">
                Họ tên
              </span>
              <input
                className="input mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/50">
                Email
              </span>
              <input
                type="email"
                className="input mt-1"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/50">
                Mật khẩu
              </span>
              <input
                type="password"
                className="input mt-1"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/50">
                Vai trò
              </span>
              <select
                className="input mt-1"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {CRM_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/50">
                Team
              </span>
              <select
                className="input mt-1"
                value={form.team_id}
                onChange={(e) => setForm({ ...form, team_id: e.target.value })}
              >
                <option value="">— Chưa thuộc team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.ae_name ? `(AE: ${t.ae_name})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 rounded-2xl bg-teal-50 px-3 py-2 text-xs text-navy-900/65">
            {ROLE_DUTY[form.role]}
          </p>
          {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
          <button className="mt-4 w-full rounded-xl bg-navy-900 py-2.5 text-sm font-semibold text-white">
            Tạo tài khoản
          </button>
        </form>

        <div className="space-y-4">
          <section className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="font-display text-lg font-bold">Team sales</h2>
            <p className="mt-1 text-sm text-navy-900/55">
              AE là Pipeline Owner của team — nhìn thấy toàn bộ lead và cơ hội của team.
            </p>
            <ul className="mt-3 divide-y divide-navy-900/5">
              {teams.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-[11px] text-navy-900/45">
                      AE: {t.ae_name || "chưa gán"} · {t.member_count} thành viên
                    </div>
                  </div>
                </li>
              ))}
              {teams.length === 0 && (
                <li className="py-3 text-sm text-navy-900/50">Chưa có team nào.</li>
              )}
            </ul>
            <form onSubmit={createTeam} className="mt-3 flex gap-2">
              <input
                className="input"
                placeholder="Tên team mới"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
              <button className="shrink-0 rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
                Tạo team
              </button>
            </form>
          </section>

          <section className="rounded-3xl bg-navy-900 p-5 text-white shadow-card">
            <h2 className="font-display text-lg font-bold">Phân quyền theo spec</h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/75">
              <li>
                <span className="font-bold text-gold-400">Founder / Admin</span> — xem toàn bộ dữ liệu,
                dashboard, pipeline, hiệu suất; không quản lý task hằng ngày.
              </li>
              <li>
                <span className="font-bold text-gold-400">AE</span> — xem lead của team, phân công
                lead, quản lý cơ hội, review hoạt động SR/LR, kiểm tra follow-up.
              </li>
              <li>
                <span className="font-bold text-gold-400">SR</span> — tạo lead, cập nhật thông tin
                doanh nghiệp, viết research note và qualification.
              </li>
              <li>
                <span className="font-bold text-gold-400">LR</span> — tạo lead mới, cập nhật
                contact/company information.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Field, Modal, OwnerTag, RoleBadge, StageBadge, StaleFlag } from "@/components/CrmBits";
import { CRM_STAGES, ROLE_LABEL, STALE_DAYS, type Role, type SessionUser, type User } from "@/lib/types";
import type { OppRow } from "@/lib/crm-core";
import { cn, compactVnd, daysSince, daysUntil, formatDate, formatVnd, fromNow } from "@/lib/utils";

/**
 * Pipeline board. AE nhìn vào đây để biết:
 *  - cơ hội nào vô chủ, cơ hội nào thiếu next action
 *  - cơ hội nào ngủ quên quá STALE_DAYS ngày
 *  - giá trị đang nằm ở stage nào
 */
export default function CrmPipelinePage() {
  const [items, setItems] = useState<OppRow[]>([]);
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("ALL");
  const [tab, setTab] = useState<"board" | "table">("board");
  const [me, setMe] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    company_name: "",
    title: "",
    standard: "FDA",
    value: "",
    owner_id: "",
    expected_close_date: "",
    next_action: "",
    next_action_due: "",
  });

  async function load() {
    const [ro, m] = await Promise.all([
      fetch("/api/crm/opportunities"),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    const o = await ro.json();
    if (!ro.ok) {
      setErr(o.error || "Không tải được pipeline.");
      return;
    }
    setErr("");
    setItems(o.items || []);
    setMe(m.user || null);
    if (["admin", "ae"].includes(m.user?.role)) {
      const u = await fetch("/api/crm/members").then((r) => r.json());
      setUsers((u.items || []).filter((x: User) => ["ae", "sr", "lr"].includes(x.role)));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canCreate = me?.role === "ae" || me?.role === "admin";

  async function create() {
    setErr("");
    const r = await fetch("/api/crm/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: form.company_name,
        title: form.title,
        standard: form.standard,
        value: Number(form.value || 0),
        owner_id: form.owner_id ? Number(form.owner_id) : undefined,
        expected_close_date: form.expected_close_date || undefined,
        next_action: form.next_action,
        next_action_due: form.next_action_due || undefined,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Không tạo được cơ hội");
      return;
    }
    setCreating(false);
    setForm({
      company_name: "",
      title: "",
      standard: "FDA",
      value: "",
      owner_id: "",
      expected_close_date: "",
      next_action: "",
      next_action_due: "",
    });
    load();
  }

  const owners = useMemo(() => {
    const map = new Map<number, string>();
    items.forEach((o) => {
      if (o.owner_id) map.set(o.owner_id, o.owner_name || `#${o.owner_id}`);
    });
    return Array.from(map.entries());
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((o) => {
      if (owner !== "ALL" && String(o.owner_id) !== owner) return false;
      const hay = `${o.code} ${o.company_name} ${o.title}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [items, q, owner]);

  const totals = useMemo(() => {
    const open = filtered.filter((o) => o.stage !== "won" && o.stage !== "lost");
    return {
      open: open.length,
      value: open.reduce((s, o) => s + o.value, 0),
      weighted: Math.round(open.reduce((s, o) => s + (o.value * o.probability) / 100, 0)),
      stale: filtered.filter((o) => o.stale).length,
      noAction: open.filter((o) => !String(o.next_action || "").trim()).length,
    };
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
            VEXIM CRM · Pipeline
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-navy-900">
            Cơ hội &amp; Pipeline doanh thu
          </h1>
          <p className="mt-1 text-sm text-navy-900/60">
            {totals.open} cơ hội mở · pipeline {formatVnd(totals.value)} · weighted{" "}
            {compactVnd(totals.weighted)} ₫
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Tạo cơ hội
            </button>
          )}
          {(["board", "table"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold",
                tab === t ? "bg-navy-900 text-white" : "bg-white text-navy-900/70"
              )}
            >
              {t === "board" ? "Board" : "Bảng"}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-navy-900/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm cơ hội, doanh nghiệp..."
            className="w-full rounded-xl border border-navy-900/10 bg-white py-2 pl-9 pr-3 text-sm outline-none"
          />
        </div>
        <select
          className="rounded-xl border border-navy-900/10 bg-white px-3 py-2 text-sm"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="ALL">Mọi owner</option>
          {owners.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <span className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {totals.stale} ngủ quên · {totals.noAction} thiếu next action
        </span>
      </div>

      {tab === "board" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {CRM_STAGES.map((stage) => {
            const rows = filtered.filter((o) => o.stage === stage.key);
            const value = rows.reduce((s, o) => s + o.value, 0);
            return (
              <section
                key={stage.key}
                className={cn(
                  "flex min-h-[240px] flex-col rounded-3xl p-3 shadow-card",
                  stage.closed ? "bg-white/70" : "bg-white"
                )}
              >
                <header className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-navy-900">{stage.label}</div>
                    <div className="text-[11px] text-navy-900/45">xác suất {stage.probability}%</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-sm font-extrabold text-navy-900">
                      {rows.length}
                    </div>
                    <div className="text-[10px] text-navy-900/45">{compactVnd(value)} ₫</div>
                  </div>
                </header>
                <div className="space-y-2">
                  {rows.map((o) => (
                    <Link
                      key={o.id}
                      href={`/dashboard/crm/co-hoi/${o.id}`}
                      className="block rounded-2xl border border-navy-900/5 bg-[#fffdf7] p-3 hover:border-gold-400/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-navy-900">{o.company_name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-navy-900/60">
                          {compactVnd(o.value)} ₫
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-navy-900/45">{o.code}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <OwnerTag name={o.owner_name} />
                        {Boolean(o.stale) && (
                          <StaleFlag
                            stale
                            days={daysSince(o.last_activity_at) ?? STALE_DAYS}
                          />
                        )}
                      </div>
                      <div
                        className={cn(
                          "mt-2 text-[11px]",
                          o.action_overdue ? "font-bold text-rose-600" : "text-navy-900/55"
                        )}
                      >
                        {o.next_action
                          ? `→ ${o.next_action}`
                          : "⚠ Chưa có next action"}
                        {o.next_action_due && ` · hạn ${formatDate(o.next_action_due)}`}
                      </div>
                    </Link>
                  ))}
                  {rows.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-navy-900/10 p-4 text-center text-xs text-navy-900/40">
                      Chưa có cơ hội nào
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-[#fffaf0] text-[11px] uppercase tracking-wider text-navy-900/45">
                <tr>
                  <th className="px-4 py-3">Cơ hội</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Giá trị</th>
                  <th className="px-4 py-3">Weighted</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Next action</th>
                  <th className="px-4 py-3">Dự kiến chốt</th>
                  <th className="px-4 py-3">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const d = daysUntil(o.next_action_due);
                  return (
                    <tr key={o.id} className="border-t border-navy-900/5">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/crm/co-hoi/${o.id}`}
                          className="font-semibold text-navy-900"
                        >
                          {o.company_name}
                        </Link>
                        <div className="text-[11px] text-navy-900/45">
                          {o.code}
                          {o.standard ? ` · ${o.standard}` : ""}
                        </div>
                        <div className="text-[11px] text-navy-900/60">{o.title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={o.stage} />
                        {Boolean(o.stale) && (
                          <div className="mt-1">
                            <StaleFlag stale days={daysSince(o.last_activity_at)} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatVnd(o.value)}</td>
                      <td className="px-4 py-3 tabular-nums text-navy-900/70">
                        {formatVnd(Math.round((o.value * o.probability) / 100))}
                      </td>
                      <td className="px-4 py-3">
                        <OwnerTag name={o.owner_name} />
                      </td>
                      <td className="px-4 py-3">
                        {o.next_action ? (
                          <>
                            <div className="text-navy-900/80">{o.next_action}</div>
                            <div
                              className={cn(
                                "text-[11px]",
                                o.action_overdue ? "font-bold text-rose-600" : "text-navy-900/45"
                              )}
                            >
                              hạn {o.next_action_due ? formatDate(o.next_action_due) : "—"}
                              {d !== null && d < 0 ? ` · quá hạn ${Math.abs(d)} ngày` : ""}
                            </div>
                          </>
                        ) : (
                          <span className="font-bold text-rose-600">⚠ Thiếu next action</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {o.expected_close_date ? formatDate(o.expected_close_date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-navy-900/55">
                        {fromNow(o.last_activity_at)}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-navy-900/50">
                      Không có cơ hội nào. AE hãy chuyển lead đủ điều kiện thành cơ hội.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Tạo cơ hội mới"
        subtitle="Cơ hội phải có owner. Đặt luôn next action để không rơi vào cảnh 'ngủ quên'."
        wide
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Doanh nghiệp *">
            <input
              className="input"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            />
          </Field>
          <Field label="Tên cơ hội">
            <input
              className="input"
              placeholder="VD: Đăng ký FDA — thuỷ sản đông lạnh"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="Chuẩn dịch vụ">
            <select
              className="input"
              value={form.standard}
              onChange={(e) => setForm({ ...form, standard: e.target.value })}
            >
              <option value="FDA">FDA</option>
              <option value="GACC">GACC</option>
            </select>
          </Field>
          <Field label="Giá trị dự kiến (VND)">
            <input
              className="input"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </Field>
          <Field label="Owner *" hint="Bắt buộc — không có cơ hội nào vô chủ.">
            <select
              className="input"
              value={form.owner_id}
              onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
            >
              <option value="">— Tôi —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABEL[u.role as Role]})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dự kiến chốt">
            <input
              className="input"
              type="date"
              value={form.expected_close_date}
              onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Next action">
              <input
                className="input"
                value={form.next_action}
                onChange={(e) => setForm({ ...form, next_action: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Hạn next action">
            <input
              className="input"
              type="date"
              value={form.next_action_due}
              onChange={(e) => setForm({ ...form, next_action_due: e.target.value })}
            />
          </Field>
          {me && (
            <div className="flex items-center gap-2 text-xs text-navy-900/55">
              <RoleBadge role={me.role} /> Tạo với vai trò {ROLE_LABEL[me.role]}
            </div>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              onClick={() => setCreating(false)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button
              disabled={!form.company_name.trim()}
              onClick={create}
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Tạo cơ hội
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Flag, Plus, Target, UserCog } from "lucide-react";
import { ActivityTypeBadge, Field, Modal, StageBadge } from "@/components/CrmBits";
import { StageStrip } from "@/components/CrmFollowUps";
import {
  ACTIVITY_TYPE_LABEL,
  CRM_STAGES,
  ROLE_LABEL,
  STALE_DAYS,
  type ActivityType,
  type CrmActivity,
  type CrmStageEvent,
  type Role,
  type SessionUser,
  type User,
} from "@/lib/types";
import type { OppRow } from "@/lib/crm-core";
import { daysSince, daysUntil, formatDate, formatVnd, fromNow } from "@/lib/utils";

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [me, setMe] = useState<SessionUser | null>(null);
  const [opp, setOpp] = useState<OppRow | null>(null);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [events, setEvents] = useState<CrmStageEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [certs, setCerts] = useState<Array<{ id: number; certificate_no: string; company_name: string }>>([]);
  const [err, setErr] = useState("");
  const [dialog, setDialog] = useState<"action" | "assign" | "lost" | "won" | "activity" | null>(null);
  const [actionForm, setActionForm] = useState({
    next_action: "",
    next_action_due: "",
    next_action_owner_id: "",
  });
  const [assignTo, setAssignTo] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [wonCert, setWonCert] = useState("");
  const [note, setNote] = useState("");
  const [act, setAct] = useState({
    type: "call" as ActivityType,
    subject: "",
    content: "",
    is_follow_up: false,
    due_at: "",
  });

  async function load() {
    const [d, m] = await Promise.all([
      fetch(`/api/crm/opportunities/${id}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    if (d.item) {
      setOpp(d.item);
      setActivities(d.activities || []);
      setEvents(d.events || []);
      setActionForm({
        next_action: d.item.next_action || "",
        next_action_due: d.item.next_action_due || "",
        next_action_owner_id: d.item.next_action_owner_id ? String(d.item.next_action_owner_id) : "",
      });
    } else if (d.error) {
      setErr(d.error === "FORBIDDEN" ? "Bạn không có quyền xem cơ hội này." : "Không tìm thấy cơ hội.");
    }
    setMe(m.user || null);
    if (["admin", "ae"].includes(m.user?.role)) {
      const [u, c] = await Promise.all([
        fetch("/api/crm/members").then((r) => r.json()),
        fetch("/api/certificates").then((r) => r.json()),
      ]);
      setUsers((u.items || []).filter((x: User) => ["ae", "sr", "lr"].includes(x.role)));
      setCerts(c.items || []);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function call(body: Record<string, unknown>, then?: () => void) {
    setErr("");
    const r = await fetch(`/api/crm/opportunities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) {
      setErr(d.error || "Không cập nhật được");
      return false;
    }
    setDialog(null);
    load();
    then?.();
    return true;
  }

  if (err && !opp) {
    return (
      <div className="rounded-3xl bg-white p-8 text-navy-900/60">
        {err}{" "}
        <Link href="/dashboard/crm/co-hoi" className="font-semibold text-teal-700">
          Về pipeline
        </Link>
      </div>
    );
  }
  if (!opp) return <div className="text-sm text-navy-900/50">Đang tải cơ hội...</div>;

  const closed = opp.stage === "won" || opp.stage === "lost";
  const isAE = me?.role === "ae" || me?.role === "admin";
  const staleDays = daysSince(opp.last_activity_at);
  const dueIn = daysUntil(opp.next_action_due);
  const nextStages = CRM_STAGES.filter(
    (s) => s.key !== opp.stage && !(opp.stage === "won" && s.key !== "lost")
  );

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/dashboard/crm/co-hoi"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900/55"
        >
          <ArrowLeft className="h-4 w-4" /> Pipeline
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-extrabold text-navy-900">{opp.company_name}</h1>
          <StageBadge stage={opp.stage} />
          <span className="text-xs text-navy-900/45">{opp.code}</span>
          {opp.standard && (
            <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
              {opp.standard}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-navy-900/60">{opp.title}</p>
        <div className="mt-2">
          <StageStrip stage={opp.stage} />
        </div>
      </div>

      {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Next action — trái tim của CRM vận hành */}
          <section className="rounded-3xl bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Target className="h-5 w-5 text-teal-700" /> Next action
              </h2>
              {!closed && (
                <button
                  onClick={() => setDialog("action")}
                  className="rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Cập nhật next action
                </button>
              )}
            </div>
            {opp.next_action ? (
              <div className="mt-3 rounded-2xl bg-teal-50 p-4">
                <div className="text-base font-semibold text-navy-900">{opp.next_action}</div>
                <div className="mt-1 text-xs text-navy-900/60">
                  Hạn {opp.next_action_due ? formatDate(opp.next_action_due) : "chưa đặt"} · người làm{" "}
                  {opp.next_action_owner_name || opp.owner_name || "—"}
                  {dueIn !== null && dueIn < 0 && (
                    <span className="ml-2 font-bold text-rose-600">quá hạn {Math.abs(dueIn)} ngày</span>
                  )}
                  {dueIn === 0 && <span className="ml-2 font-bold text-amber-600">đến hạn hôm nay</span>}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                Cơ hội này chưa có next action — vi phạm nguyên tắc pipeline của VEXIM. AE cần đặt việc
                tiếp theo ngay.
              </div>
            )}
          </section>

          {/* Stage + số liệu */}
          <section className="rounded-3xl bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">Diễn tiến</h2>
              {!closed && (
                <div className="flex flex-wrap gap-2">
                  {nextStages.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => {
                        if (s.key === "lost") {
                          setLostReason("");
                          setDialog("lost");
                        } else if (s.key === "won") {
                          setWonCert("");
                          setDialog("won");
                        } else {
                          call({ action: "stage", stage: s.key, note });
                        }
                      }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                        s.key === "won"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : s.key === "lost"
                            ? "bg-rose-500/15 text-rose-700"
                            : "bg-navy-900/5 text-navy-900/70"
                      }`}
                    >
                      → {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="mt-4 block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900/50">
                Ghi chú khi đổi stage (tuỳ chọn)
              </span>
              <input
                className="input mt-1"
                placeholder="VD: khách đã duyệt ngân sách, chuyển sang đàm phán"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Metric label="Giá trị" value={formatVnd(opp.value)} />
              <Metric label="Xác suất" value={`${opp.probability}%`} />
              <Metric
                label="Weighted"
                value={formatVnd(Math.round((opp.value * opp.probability) / 100))}
              />
              <Metric
                label="Dự kiến chốt"
                value={opp.expected_close_date ? formatDate(opp.expected_close_date) : "—"}
              />
            </div>

            {opp.stage === "lost" && opp.lost_reason && (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <span className="font-bold">Lý do mất deal:</span> {opp.lost_reason}
              </p>
            )}
            {opp.stage === "won" && (
              <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <div className="font-bold">Đã thắng — {formatVnd(opp.value)}</div>
                {opp.certificate_id ? (
                  <Link
                    href={`/dashboard/ho-so/${opp.certificate_id}`}
                    className="mt-1 inline-block font-semibold underline"
                  >
                    Mở hồ sơ FDA/GACC đã gắn →
                  </Link>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      className="input max-w-xs"
                      value={wonCert}
                      onChange={(e) => setWonCert(e.target.value)}
                    >
                      <option value="">— Chọn hồ sơ để gắn —</option>
                      {certs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.certificate_no} · {c.company_name}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!wonCert}
                      onClick={() =>
                        call({ action: "link_certificate", certificate_id: Number(wonCert) })
                      }
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                    >
                      Gắn hồ sơ
                    </button>
                  </div>
                )}
              </div>
            )}

            <h3 className="mt-6 font-display text-base font-bold">Lịch sử stage</h3>
            <ul className="mt-2 space-y-2">
              {events.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[11px] font-bold text-navy-900/60">
                    {e.from_stage ? `${e.from_stage} → ${e.to_stage}` : `→ ${e.to_stage}`}
                  </span>
                  <span className="text-navy-900/70">{e.note || "—"}</span>
                  <span className="text-[11px] text-navy-900/40">
                    {e.changed_by_name || "—"} · {fromNow(e.changed_at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Activity log */}
          <section className="rounded-3xl bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Activity log</h2>
              {!closed && (
                <button
                  onClick={() => setDialog("activity")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Ghi hoạt động
                </button>
              )}
            </div>
            <ul className="mt-3 space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="rounded-2xl border border-navy-900/5 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActivityTypeBadge type={a.type} />
                    <span className="text-sm font-semibold text-navy-900">{a.subject}</span>
                    {Boolean(a.is_follow_up) && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        follow-up
                      </span>
                    )}
                  </div>
                  {a.content && (
                    <p className="mt-1.5 whitespace-pre-line text-sm text-navy-900/70">{a.content}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-navy-900/45">
                    <span>
                      {a.created_by_name || "—"} · {fromNow(a.performed_at)}
                    </span>
                    {a.due_at && <span>· hạn {formatDate(a.due_at)}</span>}
                    {a.completed_at ? (
                      <span className="font-bold text-emerald-600">· đã hoàn thành</span>
                    ) : (
                      a.is_follow_up && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/crm/activities/${a.id}`, { method: "PUT" });
                            load();
                          }}
                          className="rounded-lg bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-700"
                        >
                          Đánh dấu xong
                        </button>
                      )
                    )}
                  </div>
                </li>
              ))}
              {activities.length === 0 && (
                <li className="text-sm text-navy-900/50">Chưa có hoạt động nào được ghi nhận.</li>
              )}
            </ul>
          </section>
        </div>

        {/* Cột phải */}
        <div className="space-y-4">
          <section className="rounded-3xl bg-navy-900 p-5 text-white shadow-card">
            <h2 className="font-display text-lg font-bold">Owner &amp; trách nhiệm</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-[11px] uppercase tracking-wider text-teal-300">Owner</div>
                <div className="mt-1 font-semibold">{opp.owner_name || "Chưa có owner"}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-[11px] uppercase tracking-wider text-teal-300">Trạng thái chăm sóc</div>
                <div className="mt-1">
                  {closed ? (
                    <span className="text-white/80">Cơ hội đã đóng</span>
                  ) : opp.stale ? (
                    <span className="font-bold text-gold-400">
                      Ngủ quên {staleDays ?? STALE_DAYS}+ ngày — cần đánh thức
                    </span>
                  ) : (
                    <span className="text-emerald-300">
                      Đang được chăm sóc · cập nhật {fromNow(opp.last_activity_at)}
                    </span>
                  )}
                </div>
              </div>
              {opp.lead_code && (
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-[11px] uppercase tracking-wider text-teal-300">Lead nguồn</div>
                  <Link
                    href={`/dashboard/crm/leads/${opp.lead_id}`}
                    className="mt-1 block font-semibold underline decoration-teal-300"
                  >
                    {opp.lead_code} · {opp.lead_company}
                  </Link>
                </div>
              )}
            </div>
            {isAE && !closed && (
              <button
                onClick={() => {
                  setAssignTo(opp.owner_id ? String(opp.owner_id) : "");
                  setDialog("assign");
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-500 py-2.5 text-sm font-bold text-navy-950"
              >
                <UserCog className="h-4 w-4" /> Đổi chủ cơ hội
              </button>
            )}
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-card">
            <h2 className="font-display text-base font-bold">Nguyên tắc pipeline VEXIM</h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-navy-900/65">
              <li>• Mọi cơ hội phải có một owner chịu trách nhiệm.</li>
              <li>• Mọi cơ hội phải có next action và hạn làm.</li>
              <li>
                • Không để cơ hội không cập nhật quá {STALE_DAYS} ngày — hệ thống tự đánh dấu "ngủ
                quên".
              </li>
              <li>• Mất deal phải ghi lý do để cả đội học được.</li>
              <li>• Thắng deal thì gắn ngay với hồ sơ FDA/GACC để không rơi doanh thu.</li>
            </ul>
          </section>
        </div>
      </div>

      {/* Dialogs */}
      <Modal
        open={dialog === "action"}
        onClose={() => setDialog(null)}
        title="Đặt next action"
        subtitle={opp.company_name}
      >
        <div className="space-y-3">
          <Field label="Việc tiếp theo *">
            <input
              className="input"
              value={actionForm.next_action}
              onChange={(e) => setActionForm({ ...actionForm, next_action: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hạn làm">
              <input
                className="input"
                type="date"
                value={actionForm.next_action_due}
                onChange={(e) => setActionForm({ ...actionForm, next_action_due: e.target.value })}
              />
            </Field>
            <Field label="Người thực hiện">
              <select
                className="input"
                value={actionForm.next_action_owner_id}
                onChange={(e) =>
                  setActionForm({ ...actionForm, next_action_owner_id: e.target.value })
                }
              >
                <option value="">— Owner hiện tại —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({ROLE_LABEL[u.role as Role]})
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDialog(null)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button
              onClick={() =>
                call({
                  action: "next_action",
                  next_action: actionForm.next_action,
                  next_action_due: actionForm.next_action_due || null,
                  next_action_owner_id: actionForm.next_action_owner_id
                    ? Number(actionForm.next_action_owner_id)
                    : undefined,
                })
              }
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Lưu
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={dialog === "assign"}
        onClose={() => setDialog(null)}
        title="Đổi chủ cơ hội"
        subtitle={opp.company_name}
      >
        <div className="space-y-3">
          <Field label="Owner mới">
            <select className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
              <option value="">— Chọn người —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABEL[u.role as Role]})
                </option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-navy-900/50">
            Việc đổi owner được ghi vào activity log — AE dùng để review trách nhiệm.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDialog(null)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button
              disabled={!assignTo}
              onClick={() => call({ action: "assign", owner_id: Number(assignTo) })}
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Giao việc
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={dialog === "lost"}
        onClose={() => setDialog(null)}
        title="Đánh dấu mất deal"
        subtitle={opp.company_name}
      >
        <div className="space-y-3">
          <Field label="Lý do mất *" hint="Bắt buộc — để Founder thấy vì sao pipeline rơi.">
            <textarea
              className="input min-h-[90px]"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDialog(null)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button
              disabled={!lostReason.trim()}
              onClick={() => call({ action: "stage", stage: "lost", lost_reason: lostReason, note })}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Flag className="mr-1 inline h-4 w-4" /> Lost
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={dialog === "won"}
        onClose={() => setDialog(null)}
        title="Chốt deal thắng"
        subtitle={`${opp.company_name} · ${formatVnd(opp.value)}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-navy-900/65">
            Cơ hội sẽ chuyển thành khách hàng. Nếu bộ phận chuyên môn đã tạo hồ sơ FDA/GACC, hãy gắn
            ngay để nối doanh thu với hồ sơ.
          </p>
          <Field label="Gắn hồ sơ (tuỳ chọn)">
            <select className="input" value={wonCert} onChange={(e) => setWonCert(e.target.value)}>
              <option value="">— Chưa gắn —</option>
              {certs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.certificate_no} · {c.company_name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDialog(null)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button
              onClick={() =>
                call({
                  action: "stage",
                  stage: "won",
                  note,
                  certificate_id: wonCert ? Number(wonCert) : undefined,
                })
              }
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Won
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={dialog === "activity"}
        onClose={() => setDialog(null)}
        title="Ghi hoạt động"
        subtitle={opp.company_name}
        wide
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Loại">
              <select
                className="input"
                value={act.type}
                onChange={(e) => setAct({ ...act, type: e.target.value as ActivityType })}
              >
                {Object.entries(ACTIVITY_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tiêu đề *">
              <input
                className="input"
                value={act.subject}
                onChange={(e) => setAct({ ...act, subject: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Nội dung">
            <textarea
              className="input min-h-[100px]"
              value={act.content}
              onChange={(e) => setAct({ ...act, content: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={act.is_follow_up}
                onChange={(e) => setAct({ ...act, is_follow_up: e.target.checked })}
              />
              Là follow-up cần theo dõi
            </label>
            {act.is_follow_up && (
              <Field label="Hạn">
                <input
                  className="input"
                  type="date"
                  value={act.due_at}
                  onChange={(e) => setAct({ ...act, due_at: e.target.value })}
                />
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDialog(null)}
              className="rounded-xl border border-navy-900/10 px-4 py-2 text-sm font-semibold"
            >
              Huỷ
            </button>
            <button
              disabled={!act.subject.trim()}
              onClick={async () => {
                setErr("");
                const r = await fetch("/api/crm/activities", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    opportunity_id: id,
                    lead_id: opp.lead_id,
                    type: act.type,
                    subject: act.subject,
                    content: act.content,
                    is_follow_up: act.is_follow_up,
                    due_at: act.due_at || undefined,
                  }),
                });
                const d = await r.json();
                if (!r.ok) {
                  setErr(d.error || "Không ghi được hoạt động");
                  return;
                }
                setAct({ type: "call", subject: "", content: "", is_follow_up: false, due_at: "" });
                setDialog(null);
                load();
              }}
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Lưu hoạt động
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-teal-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-navy-900/45">{label}</div>
      <div className="mt-0.5 font-display text-base font-extrabold text-navy-900">{value}</div>
    </div>
  );
}

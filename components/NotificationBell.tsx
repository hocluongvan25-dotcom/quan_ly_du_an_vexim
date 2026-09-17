"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Volume2, VolumeX, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

type FollowupItem = {
  id: number;
  company_name: string;
  contact_phone: string;
  stage_name: string;
  stage_color: string;
  owner_name: string;
  next_action: string;
  next_action_date: string | null;
  days_to_followup: number | null;
};

type AlertItem = FollowupItem & {
  days_in_stage: number;
  alerts: Array<{ type: string; label: string }>;
  health: string;
};

type LeadItem = {
  id: number;
  service_type: "sales" | "amazon";
  name: string;
  phone: string;
  company_name: string;
  status: string;
  created_at: string;
};

type RecordItem = FollowupItem & {
  pipeline_key: string;
  contact_email?: string;
  estimated_value?: number;
  waiting_days: number;
};

type Tab = "followups" | "records" | "alerts" | "leads";

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    playTone(880, 0, 0.4, 0.3);
    playTone(1320, 0.15, 0.5, 0.25);
  } catch {}
}

function followupLabel(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return `Trễ ${Math.abs(days)} ngày`;
  if (days === 0) return "Hôm nay";
  return `Còn ${days} ngày`;
}

export function NotificationBell() {
  const router = useRouter();
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [counts, setCounts] = useState({ followups: 0, missingRecords: 0, alerts: 0, leads: 0 });
  const [scope, setScope] = useState("mine");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("followups");
  const [snoozing, setSnoozing] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const seenLeadsRef = useRef<Set<number>>(new Set());
  const prevFollowupIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const soundRef = useRef(true);
  const permRef = useRef(false);

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);
  useEffect(() => {
    permRef.current = hasPermission;
  }, [hasPermission]);

  useEffect(() => {
    const saved = localStorage.getItem("vexim_leads_sound");
    if (saved !== null) setSoundEnabled(saved === "1");
    const seen = localStorage.getItem("vexim_leads_seen_ids");
    if (seen) {
      try {
        seenLeadsRef.current = new Set(JSON.parse(seen));
      } catch {}
    }
    if ("Notification" in window) {
      setHasPermission(Notification.permission === "granted");
    }
  }, []);

  const persistSeenLeads = (set: Set<number>) => {
    localStorage.setItem("vexim_leads_seen_ids", JSON.stringify(Array.from(set)));
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("vexim_leads_sound", next ? "1" : "0");
    if (next) playNotificationSound();
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setHasPermission(perm === "granted");
  };

  // Dời hẹn 1 chạm: +N ngày tính từ hôm nay
  const snooze = async (e: React.MouseEvent, id: number, days: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSnoozing(id);
    try {
      const d = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
      await fetch(`/api/crm/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_action_date: d }),
      });
      await fetchAll();
    } catch {}
    setSnoozing(null);
  };

  const markLeadsSeen = () => {
    const merged = new Set([...Array.from(seenLeadsRef.current), ...leads.map((l) => l.id)]);
    seenLeadsRef.current = merged;
    persistSeenLeads(merged);
  };

  const unseenLeads = leads.filter((l) => !seenLeadsRef.current.has(l.id)).length;
  const badgeTotal = counts.followups + (counts.missingRecords || 0) + counts.alerts + unseenLeads;

  const fetchAll = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      const f: FollowupItem[] = d.followups || [];
      const r: RecordItem[] = d.missingRecords || [];
      const a: AlertItem[] = d.alerts || [];
      const l: LeadItem[] = d.leads || [];
      setFollowups(f);
      setRecords(r);
      setAlerts(a);
      setLeads(l);
      setCounts(d.counts || { followups: 0, missingRecords: 0, alerts: 0, leads: 0 });
      setScope(d.scope || "mine");

      if (!initializedRef.current) {
        prevFollowupIdsRef.current = new Set(f.map((x) => x.id));
        initializedRef.current = true;
        return;
      }
      // Hẹn mới đến hạn (xuất hiện lần đầu) → kêu chuông + popup trình duyệt
      const fresh = f.filter((x) => !prevFollowupIdsRef.current.has(x.id));
      if (fresh.length > 0) {
        if (soundRef.current) playNotificationSound();
        if (permRef.current && "Notification" in window) {
          const first = fresh[0];
          const more = fresh.length > 1 ? ` +${fresh.length - 1} hẹn khác` : "";
          try {
            new Notification(`⏰ Đến hạn follow-up: ${first.company_name}${more}`, {
              body: `${first.next_action || "Có hẹn follow-up"} — ${followupLabel(first.days_to_followup)}`,
              icon: "/favicon.ico",
            });
          } catch {}
        }
      }
      prevFollowupIdsRef.current = new Set(f.map((x) => x.id));
    } catch {}
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlock = () => {
      if (!audioUnlockedRef.current) {
        audioUnlockedRef.current = true;
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        } catch {}
      }
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "leads") markLeadsSeen();
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) fetchAll();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-900/70 transition-colors hover:bg-slate-50 hover:text-navy-900"
        title="Trung tâm thông báo"
      >
        <Bell className="h-[18px] w-[18px]" />
        {badgeTotal > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] animate-pulse items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-extrabold text-white ring-2 ring-white">
            {badgeTotal > 99 ? "99+" : badgeTotal}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 max-h-[80vh] w-[380px] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <div className="text-sm font-bold">
                Thông báo {scope === "all" && <span className="ml-1 rounded-full bg-navy-900 px-2 py-0.5 text-[10px] text-white">Cả team</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleSound}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border ${soundEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}
                  title={soundEnabled ? "Tắt chuông" : "Bật chuông"}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-1 border-b border-slate-100 bg-slate-50/60 p-1.5">
              {(
                [
                  ["followups", `⏰ Hẹn (${counts.followups})`],
                  ["records", `📁 Hồ sơ (${counts.missingRecords || 0})`],
                  ["alerts", `🚨 Cảnh báo (${counts.alerts})`],
                  ["leads", `🔔 Leads (${unseenLeads})`],
                ] as Array<[Tab, string]>
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => switchTab(k)}
                  className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-bold transition ${
                    tab === k ? "bg-navy-900 text-white shadow" : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {tab === "followups" && (
                <>
                  {followups.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">
                      ✅ Tuyệt vời! Không có hẹn nào cần lo hôm nay.
                    </div>
                  )}
                  {followups.length > 0 && (
                    <div className="border-b border-teal-100 bg-teal-50/70 px-4 py-2.5 text-xs font-bold text-teal-800">
                      💪 Hôm nay bạn có {counts.followups} khách cần gọi — xử lý từng bạn một nhé!
                    </div>
                  )}
                  {followups.map((f) => (
                    <Link
                      key={f.id}
                      href={`/dashboard/crm/co-hoi/${f.id}`}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 border-b border-slate-50 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <div className={`mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full ${f.days_to_followup !== null && f.days_to_followup < 0 ? "bg-red-500" : "bg-amber-500"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold">{f.company_name}</div>
                        <div className="mt-0.5 truncate text-xs text-slate-600">
                          → {f.next_action || "Có hẹn follow-up"}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className={`rounded-full px-2 py-0.5 font-bold ${f.days_to_followup !== null && f.days_to_followup < 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                            {followupLabel(f.days_to_followup)}
                            {f.next_action_date ? ` · ${formatDate(f.next_action_date)}` : ""}
                          </span>
                          <span className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: f.stage_color }}>
                            {f.stage_name}
                          </span>
                          {scope === "all" && <span className="text-slate-400">· {f.owner_name}</span>}
                        </div>
                        <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="self-center text-[11px] text-slate-400">Dời hẹn:</span>
                          {([1, 3] as const).map((n) => (
                            <button
                              key={n}
                              onClick={(e) => snooze(e, f.id, n)}
                              disabled={snoozing === f.id}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-100 disabled:opacity-40"
                            >
                              {snoozing === f.id ? "..." : `+${n} ngày`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {counts.followups > followups.length && (
                    <div className="px-4 py-2 text-center text-[11px] text-slate-400">
                      + {counts.followups - followups.length} hẹn khác — xem ở Dashboard CRM
                    </div>
                  )}
                </>
              )}

              {tab === "records" && (
                <>
                  {records.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">
                      ✅ Mọi deal chốt đều đã có hồ sơ. Chuẩn!
                    </div>
                  )}
                  {records.length > 0 && (
                    <div className="border-b border-teal-100 bg-teal-50/70 px-4 py-2.5 text-xs font-bold text-teal-800">
                      📁 {counts.missingRecords} deal đã chốt đang chờ tạo hồ sơ — tạo xong là hết nhắc!
                    </div>
                  )}
                  {records.map((r) => {
                    const qs = new URLSearchParams({
                      standard: r.pipeline_key,
                      company: r.company_name,
                      ...(r.contact_email ? { email: r.contact_email } : {}),
                      ...(r.estimated_value ? { price: String(r.estimated_value) } : {}),
                    }).toString();
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setOpen(false);
                          router.push(`/dashboard/crm/co-hoi/${r.id}`);
                        }}
                        className="flex cursor-pointer gap-3 border-b border-slate-50 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-bold">{r.company_name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="rounded-full bg-navy-900 px-2 py-0.5 font-bold text-white">
                              {r.pipeline_key}
                            </span>
                            <span className="font-semibold text-amber-700">
                              Chờ tạo hồ sơ {r.waiting_days} ngày
                            </span>
                            {scope === "all" && <span className="text-slate-400">· {r.owner_name}</span>}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen(false);
                              router.push(`/dashboard/ho-so/moi?${qs}`);
                            }}
                            className="mt-2 rounded-full bg-teal-500 px-3 py-1.5 text-[11px] font-extrabold text-navy-950 hover:bg-teal-400"
                          >
                            📁 Tạo hồ sơ {r.pipeline_key} →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(counts.missingRecords || 0) > records.length && (
                    <div className="px-4 py-2 text-center text-[11px] text-slate-400">
                      + {(counts.missingRecords || 0) - records.length} deal khác
                    </div>
                  )}
                </>
              )}

              {tab === "alerts" && (
                <>
                  {alerts.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">
                      ✅ Mọi khách hàng đều đang được chăm tốt!
                    </div>
                  )}
                  {alerts.length > 0 && (
                    <div className="border-b border-amber-100 bg-amber-50/70 px-4 py-2.5 text-xs font-bold text-amber-800">
                      💛 Có {counts.alerts} khách cần bạn quan tâm thêm chút nữa
                    </div>
                  )}
                  {alerts.map((a) => (
                    <Link
                      key={a.id}
                      href={`/dashboard/crm/co-hoi/${a.id}`}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 border-b border-slate-50 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.health === "danger" ? "bg-red-500" : "bg-amber-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold">{a.company_name}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {a.alerts.map((al, i) => (
                            <span
                              key={i}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${al.type === "sla" || al.type === "stale" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}
                            >
                              {al.label}
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {a.stage_name} · {a.days_in_stage} ngày · {a.owner_name}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {counts.alerts > alerts.length && (
                    <div className="px-4 py-2 text-center text-[11px] text-slate-400">
                      + {counts.alerts - alerts.length} cảnh báo khác — xem ở Dashboard CRM
                    </div>
                  )}
                </>
              )}

              {tab === "leads" && (
                <>
                  {leads.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">Chưa có lead mới nào</div>
                  )}
                  {leads.map((l) => {
                    const isUnseen = !seenLeadsRef.current.has(l.id);
                    return (
                      <Link
                        key={l.id}
                        href="/dashboard/leads"
                        onClick={() => setOpen(false)}
                        className={`flex gap-3 border-b border-slate-50 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50 ${isUnseen ? "bg-amber-50/70" : ""}`}
                      >
                        <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isUnseen ? "animate-pulse bg-red-500" : "bg-slate-300"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold">{l.name}</span>
                            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold ${l.service_type === "sales" ? "bg-amber-100 text-amber-800" : "bg-slate-900 text-white"}`}>
                              {l.service_type === "sales" ? "Sale" : "Amazon"}
                            </span>
                            {isUnseen && <span className="text-[10px] font-bold text-red-600">NEW</span>}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-600">
                            {l.phone} {l.company_name ? `· ${l.company_name}` : ""}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">{formatDate(l.created_at)}</div>
                        </div>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2">
              <div>
                {!hasPermission ? (
                  <button onClick={requestPermission} className="text-[11px] font-semibold text-teal-700 hover:underline">
                    Bật thông báo trình duyệt
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Tự làm mới 30s</span>
                )}
              </div>
              <Link
                href={tab === "leads" ? "/dashboard/leads" : "/dashboard/crm"}
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-black"
              >
                Xem tất cả →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

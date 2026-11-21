"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CalendarClock, FileText, Volume2, VolumeX, X } from "lucide-react";
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

type RecordItem = FollowupItem & {
  pipeline_key: "FDA" | "GACC";
  contact_email?: string;
  estimated_value?: number;
  waiting_days: number;
};

type Tab = "followups" | "records" | "alerts";

type Counts = { followups: number; missingRecords: number; alerts: number };

function playNotificationSound() {
  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    for (const [frequency, start] of [[880, 0], [1320, 0.15]] as const) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, context.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.2, context.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + start + 0.4);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + 0.4);
    }
  } catch {}
}

function followupLabel(days: number | null) {
  if (days === null) return "";
  if (days < 0) return `Trễ ${Math.abs(days)} ngày`;
  if (days === 0) return "Đến hạn hôm nay";
  return `Còn ${days} ngày`;
}

export function NotificationBell() {
  const router = useRouter();
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ followups: 0, missingRecords: 0, alerts: 0 });
  const [scope, setScope] = useState("mine");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("followups");
  const [snoozing, setSnoozing] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const previousIds = useRef<Set<number>>(new Set());
  const initialized = useRef(false);
  const soundRef = useRef(true);
  const permissionRef = useRef(false);
  const audioUnlocked = useRef(false);

  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { permissionRef.current = hasPermission; }, [hasPermission]);

  useEffect(() => {
    const saved = localStorage.getItem("vexim_notifications_sound");
    if (saved !== null) setSoundEnabled(saved === "1");
    if ("Notification" in window) setHasPermission(Notification.permission === "granted");
  }, []);

  const fetchAll = async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const nextFollowups: FollowupItem[] = data.followups || [];
      setFollowups(nextFollowups);
      setRecords(data.missingRecords || []);
      setAlerts(data.alerts || []);
      setCounts(data.counts || { followups: 0, missingRecords: 0, alerts: 0 });
      setScope(data.scope || "mine");

      if (!initialized.current) {
        previousIds.current = new Set(nextFollowups.map((item) => item.id));
        initialized.current = true;
        return;
      }
      const newItems = nextFollowups.filter((item) => !previousIds.current.has(item.id));
      if (newItems.length) {
        if (soundRef.current) playNotificationSound();
        if (permissionRef.current && "Notification" in window) {
          const first = newItems[0];
          try {
            new Notification(`Đến hạn xử lý: ${first.company_name}`, {
              body: `${first.next_action || "Có việc cần xử lý"}. ${followupLabel(first.days_to_followup)}`,
              icon: "/favicon.ico",
            });
          } catch {}
        }
      }
      previousIds.current = new Set(nextFollowups.map((item) => item.id));
    } catch {}
  };

  useEffect(() => {
    fetchAll();
    const interval = window.setInterval(fetchAll, 30000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlock = () => {
      if (!audioUnlocked.current) {
        audioUnlocked.current = true;
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const buffer = context.createBuffer(1, 1, 22050);
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
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

  const snooze = async (event: React.MouseEvent, id: number, days: number) => {
    event.preventDefault();
    event.stopPropagation();
    setSnoozing(id);
    try {
      const date = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
      await fetch(`/api/crm/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_action_date: date }),
      });
      await fetchAll();
    } catch {}
    setSnoozing(null);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("vexim_notifications_sound", next ? "1" : "0");
    if (next) playNotificationSound();
  };

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    setHasPermission((await Notification.requestPermission()) === "granted");
  };

  const badgeTotal = counts.followups + counts.missingRecords + counts.alerts;
  const tabs: Array<[Tab, string, number]> = [
    ["followups", "Đến hạn", counts.followups],
    ["records", "Tạo hồ sơ", counts.missingRecords],
    ["alerts", "Cảnh báo", counts.alerts],
  ];

  const openOpportunity = (id: number) => {
    setOpen(false);
    router.push(`/dashboard/crm/co-hoi/${id}`);
  };

  const recordHref = (item: RecordItem) => {
    const query = new URLSearchParams({
      standard: item.pipeline_key,
      company: item.company_name,
      ...(item.contact_email ? { email: item.contact_email } : {}),
      ...(item.estimated_value ? { price: String(item.estimated_value) } : {}),
    });
    return `/dashboard/ho-so/moi?${query.toString()}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchAll(); }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[#6e6e73] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
        title="Thông báo"
        aria-label="Thông báo"
      >
        <Bell className="h-[18px] w-[18px]" />
        {badgeTotal > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d70015] px-1 text-[10px] font-semibold text-white ring-2 ring-white">{badgeTotal > 99 ? "99+" : badgeTotal}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <section className="absolute right-0 top-11 z-40 w-[390px] max-w-[92vw] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl" aria-label="Trung tâm thông báo">
            <header className="flex items-center justify-between border-b border-black/[0.07] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-[#1d1d1f]">Thông báo</h2>
                <p className="mt-0.5 text-[11px] text-[#86868b]">{scope === "all" ? "Toàn nhóm" : "Việc của bạn"}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={toggleSound} className="rounded-full p-2 text-[#6e6e73] hover:bg-[#f5f5f7]" title={soundEnabled ? "Tắt âm báo" : "Bật âm báo"}>
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button onClick={() => setOpen(false)} className="rounded-full p-2 text-[#6e6e73] hover:bg-[#f5f5f7]" aria-label="Đóng"><X className="h-4 w-4" /></button>
              </div>
            </header>

            <nav className="flex gap-1 border-b border-black/[0.07] bg-[#f5f5f7] p-1.5" aria-label="Loại thông báo">
              {tabs.map(([key, label, count]) => (
                <button key={key} onClick={() => setTab(key)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition ${tab === key ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:bg-white/70"}`}>
                  {label} <span className="text-[#86868b]">{count}</span>
                </button>
              ))}
            </nav>

            <div className="max-h-[370px] overflow-y-auto">
              {tab === "followups" && (
                <>
                  {!followups.length && <EmptyMessage text="Không có việc nào đến hạn." />}
                  {followups.map((item) => (
                    <Link key={item.id} href={`/dashboard/crm/co-hoi/${item.id}`} onClick={() => setOpen(false)} className="block border-b border-black/[0.05] px-4 py-3 last:border-0 hover:bg-[#fafafc]">
                      <div className="flex items-start gap-3">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#0071e3]" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[#1d1d1f]">{item.company_name}</div>
                          <p className="mt-1 text-xs text-[#6e6e73]">{item.next_action || "Cần liên hệ khách hàng"}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#86868b]">
                            <span>{followupLabel(item.days_to_followup)}</span>
                            {item.next_action_date && <span>{formatDate(item.next_action_date)}</span>}
                            <span className="rounded-full px-2 py-0.5 text-white" style={{ background: item.stage_color }}>{item.stage_name}</span>
                            {scope === "all" && <span>{item.owner_name}</span>}
                          </div>
                          <div className="mt-2 flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                            <span className="text-[11px] text-[#86868b]">Dời lịch:</span>
                            {[1, 3].map((days) => <button key={days} onClick={(event) => snooze(event, item.id, days)} disabled={snoozing === item.id} className="rounded-full bg-[#f2f2f7] px-2.5 py-1 text-[11px] font-medium text-[#1d1d1f] hover:bg-[#e8e8ed] disabled:opacity-50">{snoozing === item.id ? "Đang lưu" : `${days} ngày`}</button>)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </>
              )}

              {tab === "records" && (
                <>
                  {!records.length && <EmptyMessage text="Không có hồ sơ nào đang chờ tạo." />}
                  {records.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 border-b border-black/[0.05] px-4 py-3 last:border-0">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#0071e3]" />
                      <div className="min-w-0 flex-1">
                        <button onClick={() => openOpportunity(item.id)} className="truncate text-left text-sm font-semibold text-[#1d1d1f] hover:text-[#0071e3]">{item.company_name}</button>
                        <p className="mt-1 text-xs text-[#6e6e73]">{item.pipeline_key}, chờ {item.waiting_days} ngày</p>
                        <Link href={recordHref(item)} onClick={() => setOpen(false)} className="mt-2 inline-flex rounded-full bg-[#1d1d1f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#333336]">Tạo hồ sơ {item.pipeline_key}</Link>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {tab === "alerts" && (
                <>
                  {!alerts.length && <EmptyMessage text="Không có cảnh báo cần xử lý." />}
                  {alerts.map((item) => (
                    <Link key={item.id} href={`/dashboard/crm/co-hoi/${item.id}`} onClick={() => setOpen(false)} className="flex gap-3 border-b border-black/[0.05] px-4 py-3 last:border-0 hover:bg-[#fafafc]">
                      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${item.health === "danger" ? "text-[#b3261e]" : "text-[#0071e3]"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[#1d1d1f]">{item.company_name}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">{item.alerts.map((alert, index) => <span key={`${alert.type}-${index}`} className="rounded-full bg-[#f2f2f7] px-2 py-0.5 text-[10px] text-[#6e6e73]">{alert.label}</span>)}</div>
                        <p className="mt-1 text-[11px] text-[#86868b]">{item.stage_name}, {item.days_in_stage} ngày{scope === "all" ? `, ${item.owner_name}` : ""}</p>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-black/[0.07] bg-[#fafafc] px-4 py-3">
              {!hasPermission ? <button onClick={requestPermission} className="text-xs font-medium text-[#0071e3]">Bật thông báo trình duyệt</button> : <span className="text-[11px] text-[#86868b]">Tự làm mới sau 30 giây</span>}
              <Link href={tab === "records" ? "/dashboard/ho-so" : "/dashboard/crm"} onClick={() => setOpen(false)} className="text-xs font-semibold text-[#0071e3]">Mở danh sách</Link>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return <div className="px-4 py-10 text-center text-sm text-[#6e6e73]">{text}</div>;
}

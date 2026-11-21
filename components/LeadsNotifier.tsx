"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X, Volume2, VolumeX } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Lead = {
  id: number;
  service_type: "sales" | "amazon";
  name: string;
  phone: string;
  company_name: string;
  status: string;
  created_at: string;
};

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

export function LeadsNotifier() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const allPrevIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const audioUnlockedRef = useRef(false);

  // Load preferences
  useEffect(() => {
    const saved = localStorage.getItem("vexim_leads_sound");
    if (saved !== null) setSoundEnabled(saved === "1");
    const seen = localStorage.getItem("vexim_leads_seen_ids");
    if (seen) {
      try {
        seenIdsRef.current = new Set(JSON.parse(seen));
      } catch {}
    }
    if ("Notification" in window) {
      setHasPermission(Notification.permission === "granted");
    }
  }, []);

  const persistSeen = (set: Set<number>) => {
    localStorage.setItem("vexim_leads_seen_ids", JSON.stringify(Array.from(set)));
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("vexim_leads_sound", next ? "1" : "0");
    if (next) playNotificationSound();
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setHasPermission(perm === "granted");
  };

  const markAllSeen = () => {
    // Add all current leads to seen set and clear badge
    const merged = new Set([...Array.from(seenIdsRef.current), ...leads.map((l) => l.id), ...Array.from(allPrevIdsRef.current)]);
    seenIdsRef.current = merged;
    persistSeen(merged);
    setNewCount(0);
  };

  const markOneSeen = (id: number) => {
    if (!seenIdsRef.current.has(id)) {
      const next = new Set(seenIdsRef.current);
      next.add(id);
      seenIdsRef.current = next;
      persistSeen(next);
      // Decrement count if this lead was counted as new & unseen
      setNewCount((c) => Math.max(0, c - 1));
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/consultation", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const items: Lead[] = data.items || [];

      // Unseen new leads = status new AND not in seen set
      const unseenNew = items.filter((l) => l.status === "new" && !seenIdsRef.current.has(l.id));
      setLeads(items.slice(0, 10));
      setNewCount(unseenNew.length);

      if (!initializedRef.current) {
        // First load - don't play sound, just init prev ids
        allPrevIdsRef.current = new Set(items.map((l) => l.id));
        initializedRef.current = true;
        return;
      }

      // Detect truly new arrivals (IDs not seen in previous fetch)
      const currentIds = new Set(items.map((l) => l.id));
      const newArrivalIds = Array.from(currentIds).filter((id) => !allPrevIdsRef.current.has(id));
      const newArrivalLeads = items.filter((l) => newArrivalIds.includes(l.id) && l.status === "new");

      if (newArrivalLeads.length > 0) {
        if (soundEnabled) playNotificationSound();
        if (hasPermission && "Notification" in window) {
          const first = newArrivalLeads[0];
          const more = newArrivalLeads.length > 1 ? ` +${newArrivalLeads.length - 1} lead khác` : "";
          new Notification(`🔔 Lead mới: ${first.name}${more}`, {
            body: `${first.service_type === "sales" ? "Sale Mỹ" : "Amazon US"} - ${first.phone} ${first.company_name ? " - " + first.company_name : ""}`,
            icon: "/favicon.ico",
          });
        }
      }

      allPrevIdsRef.current = currentIds;
    } catch {}
  };

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [soundEnabled, hasPermission]);

  // Unlock audio on first interaction
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

  return (
    <div className="relative">
      <button
        onClick={() => {
          const willOpen = !open;
          setOpen(willOpen);
          if (willOpen) {
            // When opening, mark all as seen and clear badge
            markAllSeen();
          }
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-navy-900/10 bg-white text-navy-900/70 hover:bg-slate-50 hover:text-navy-900 transition-colors"
        title="Thông báo leads mới"
      >
        <Bell className="h-[18px] w-[18px]" />
        {newCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-extrabold text-white ring-2 ring-white animate-pulse">
            {newCount > 99 ? "99+" : newCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-[360px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="font-bold text-sm">Leads mới</div>
                {newCount > 0 ? (
                  <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    {newCount} chưa xem
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    Đã xem hết
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleSound}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border ${soundEnabled ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}
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

            <div className="max-h-[380px] overflow-y-auto">
              {leads.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">Chưa có lead nào</div>
              ) : (
                leads.map((l) => {
                  const isUnseen = !seenIdsRef.current.has(l.id) && l.status === "new";
                  return (
                    <Link
                      key={l.id}
                      href="/dashboard/leads"
                      onClick={() => {
                        markOneSeen(l.id);
                        setOpen(false);
                      }}
                      className={`flex gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors ${isUnseen ? "bg-amber-50/70" : l.status === "new" ? "bg-amber-50/30" : ""}`}
                    >
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isUnseen ? "bg-red-500 animate-pulse" : l.status === "new" ? "bg-amber-500" : "bg-slate-300"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] truncate">{l.name}</span>
                          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${l.service_type === "sales" ? "bg-amber-100 text-amber-800" : "bg-slate-900 text-white"}`}>
                            {l.service_type === "sales" ? "Sale" : "Amazon"}
                          </span>
                          {isUnseen && <span className="text-[10px] font-bold text-red-600">NEW</span>}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-600 truncate">{l.phone} {l.company_name ? `· ${l.company_name}` : ""}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{formatDate(l.created_at)}</div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!hasPermission ? (
                  <button
                    onClick={requestNotificationPermission}
                    className="text-[11px] font-semibold text-teal-700 hover:underline"
                  >
                    Bật thông báo trình duyệt
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Chuông {soundEnabled ? "bật" : "tắt"} · Tự làm mới 30s</span>
                )}
              </div>
              <Link
                href="/dashboard/leads"
                onClick={() => {
                  markAllSeen();
                  setOpen(false);
                }}
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

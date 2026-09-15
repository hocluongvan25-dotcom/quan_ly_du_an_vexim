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
    // Pleasant double chime
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
  const prevCountRef = useRef<number>(0);
  const prevIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const audioUnlockedRef = useRef(false);

  // Load sound preference
  useEffect(() => {
    const saved = localStorage.getItem("vexim_leads_sound");
    if (saved !== null) setSoundEnabled(saved === "1");
    const ids = localStorage.getItem("vexim_leads_seen_ids");
    if (ids) {
      try {
        prevIdsRef.current = new Set(JSON.parse(ids));
      } catch {}
    }
    if ("Notification" in window) {
      setHasPermission(Notification.permission === "granted");
    }
  }, []);

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

  const fetchLeads = async (isInitial = false) => {
    try {
      const res = await fetch("/api/consultation", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const items: Lead[] = data.items || [];
      const newLeads = items.filter((l) => l.status === "new");
      setLeads(items.slice(0, 10));
      setNewCount(newLeads.length);

      if (!initializedRef.current) {
        // First load - just init without sound
        prevCountRef.current = newLeads.length;
        prevIdsRef.current = new Set(items.map((l) => l.id));
        localStorage.setItem("vexim_leads_seen_ids", JSON.stringify(Array.from(prevIdsRef.current)));
        initializedRef.current = true;
        return;
      }

      // Detect truly new leads by ID
      const currentIds = new Set(items.map((l) => l.id));
      const unseenIds = Array.from(currentIds).filter((id) => !prevIdsRef.current.has(id));
      const unseenNewLeads = items.filter((l) => unseenIds.includes(l.id) && l.status === "new");

      if (unseenNewLeads.length > 0) {
        // Play sound
        if (soundEnabled) {
          if (!audioUnlockedRef.current) {
            // Try to unlock audio context on first interaction
            audioUnlockedRef.current = true;
          }
          playNotificationSound();
        }

        // Browser notification
        if (hasPermission && "Notification" in window) {
          const first = unseenNewLeads[0];
          new Notification(`🔔 Lead mới: ${first.name}`, {
            body: `${first.service_type === "sales" ? "Sale Mỹ" : "Amazon US"} - ${first.phone} ${first.company_name ? " - " + first.company_name : ""}`,
            icon: "/favicon.ico",
          });
        }

        // Update seen IDs
        const merged = new Set([...Array.from(prevIdsRef.current), ...Array.from(currentIds)]);
        prevIdsRef.current = merged;
        localStorage.setItem("vexim_leads_seen_ids", JSON.stringify(Array.from(merged)));
      }

      prevCountRef.current = newLeads.length;
    } catch {}
  };

  useEffect(() => {
    fetchLeads(true);
    const interval = setInterval(() => fetchLeads(false), 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [soundEnabled, hasPermission]);

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      if (!audioUnlockedRef.current) {
        audioUnlockedRef.current = true;
        // Create silent context to unlock
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

  const markAllSeen = () => {
    const allIds = leads.map((l) => l.id);
    const merged = new Set([...Array.from(prevIdsRef.current), ...allIds]);
    prevIdsRef.current = merged;
    localStorage.setItem("vexim_leads_seen_ids", JSON.stringify(Array.from(merged)));
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markAllSeen();
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
                {newCount > 0 && (
                  <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
                    {newCount} chưa liên hệ
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
                leads.map((l) => (
                  <Link
                    key={l.id}
                    href="/dashboard/leads"
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 ${l.status === "new" ? "bg-amber-50/50" : ""}`}
                  >
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${l.status === "new" ? "bg-red-500 animate-pulse" : "bg-slate-300"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px] truncate">{l.name}</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${l.service_type === "sales" ? "bg-amber-100 text-amber-800" : "bg-slate-900 text-white"}`}>
                          {l.service_type === "sales" ? "Sale" : "Amazon"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-600 truncate">{l.phone} {l.company_name ? `· ${l.company_name}` : ""}</div>
                      <div className="mt-1 text-[11px] text-slate-400">{formatDate(l.created_at)}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {!hasPermission && (
                  <button
                    onClick={requestNotificationPermission}
                    className="text-[11px] font-semibold text-teal-700 hover:underline"
                  >
                    Bật thông báo trình duyệt
                  </button>
                )}
              </div>
              <Link
                href="/dashboard/leads"
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

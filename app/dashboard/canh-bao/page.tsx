"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle, Clock, Mail, Send, Loader2, CheckCircle, XCircle, Calendar, Building2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Notification = {
  id: number;
  certificate_id: number;
  company_name: string;
  notification_type: string;
  recipient_email: string;
  status: string;
  sent_at: string;
  created_at: string;
};

type ExpiringCert = {
  id: number;
  certificate_no: string;
  company_name: string;
  standard: string;
  registration_code: string;
  expires_at: string;
  remaining_days: number;
  status: string;
};

export default function ExpiryAlertsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expiring, setExpiring] = useState<ExpiringCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [threshold, setThreshold] = useState(90);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expiry-notifications?withExpiring=1&threshold=${threshold}&limit=100`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setExpiring(data.expiring || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [threshold]);

  const handleScan = async () => {
    setScanning(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/cron/expiry-check", { method: "GET" });
      const data = await res.json();
      setLastResult(data);
      await fetchData();
    } catch (err: any) {
      setLastResult({ success: false, error: err.message });
    }
    setScanning(false);
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      "90_days": "Còn 90 ngày",
      "60_days": "Còn 60 ngày",
      "30_days": "Còn 30 ngày",
      "14_days": "Còn 14 ngày",
      "7_days": "Còn 7 ngày",
      "3_days": "Còn 3 ngày",
      "1_day": "Còn 1 ngày / Hôm nay",
      expired: "Đã hết hạn",
      renewal_reminder: "Nhắc gia hạn",
    };
    return map[type] || type;
  };

  const getUrgencyColor = (remaining: number) => {
    if (remaining < 0) return "bg-rose-100 text-rose-800 border-rose-200";
    if (remaining <= 7) return "bg-orange-100 text-orange-800 border-orange-200";
    if (remaining <= 30) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-500" /> Cảnh Báo Hết Hạn Tự Động
          </h1>
          <p className="mt-1 text-sm text-navy-900/60">
            Hệ thống tự động quét thời gian đăng ký dịch vụ (FDA, GACC) và gửi email cảnh báo cho doanh nghiệp & admin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="input py-2.5 text-sm">
            <option value={7}>7 ngày tới</option>
            <option value={14}>14 ngày tới</option>
            <option value={30}>30 ngày tới</option>
            <option value={60}>60 ngày tới</option>
            <option value={90}>90 ngày tới</option>
            <option value={365}>1 năm tới</option>
          </select>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-black disabled:opacity-50"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {scanning ? "Đang quét..." : "Quét & Gửi Cảnh Báo"}
          </button>
        </div>
      </div>

      {lastResult && (
        <div className={`rounded-2xl p-5 border ${lastResult.success ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
          <div className="flex items-center gap-2 font-bold">
            {lastResult.success ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />}
            {lastResult.success ? `Đã quét ${lastResult.totalScanned} chứng nhận, gửi ${lastResult.warningsSent} cảnh báo, ${lastResult.expiredFound} hết hạn` : "Lỗi quét"}
          </div>
          {lastResult.details && (
            <div className="mt-3 max-h-[200px] overflow-y-auto text-xs space-y-1">
              {lastResult.details
                .filter((d: any) => d.type)
                .map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-mono">{d.certificate_no}</span>
                    <span>{d.company_name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${d.sent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {d.type} {d.sent ? "✓ sent" : `✗ ${d.error || ""}`}
                    </span>
                  </div>
                ))}
            </div>
          )}
          <div className="mt-2 text-[11px] text-slate-500">Thời gian: {new Date(lastResult.timestamp).toLocaleString("vi-VN")}</div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Expiring Soon */}
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <h2 className="font-display text-lg font-bold text-navy-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Sắp Hết Hạn ({expiring.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">Tự động quét từ database chính thức, tính theo công thức UTC đã audit</p>

          {loading ? (
            <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
            </div>
          ) : expiring.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
              Không có chứng nhận nào sắp hết hạn trong {threshold} ngày tới
            </div>
          ) : (
            <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto">
              {expiring.map((c) => (
                <div key={c.id} className="rounded-xl border p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono font-bold text-sm text-navy-900">{c.certificate_no}</div>
                      <div className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" /> {c.company_name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.standard === "FDA" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{c.standard}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(c.expires_at)}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getUrgencyColor(c.remaining_days)}`}>
                      {c.remaining_days < 0 ? `Hết hạn ${Math.abs(c.remaining_days)} ngày` : c.remaining_days === 0 ? "Hết hạn hôm nay" : `Còn ${c.remaining_days} ngày`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification History */}
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <h2 className="font-display text-lg font-bold text-navy-900 flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-600" /> Lịch Sử Gửi Email ({notifications.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">Tránh gửi trùng: mỗi ngưỡng chỉ gửi 1 lần / chứng nhận</p>

          {loading ? (
            <div className="py-8 text-center text-slate-400">Đang tải...</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-20" />
              Chưa có email cảnh báo nào được gửi
            </div>
          ) : (
            <div className="mt-4 space-y-2 max-h-[500px] overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold">{n.company_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${n.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{n.status}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 border text-[10px] font-bold">{getTypeLabel(n.notification_type)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(n.sent_at).toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 truncate">To: {n.recipient_email}</div>
                  <div className="text-[11px] text-slate-400">Cert ID: {n.certificate_id}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

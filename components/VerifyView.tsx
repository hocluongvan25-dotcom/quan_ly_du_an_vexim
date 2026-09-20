"use client";

import { useEffect, useState } from "react";
import { COMPANY, type Certificate } from "@/lib/types";
import {
  daysBetween,
  formatDate,
  remainingDays,
  getValidityYears,
  formatDuns,
} from "@/lib/utils";

type Props = {
  cert: Omit<Certificate, "service_price"> & { duns_code?: string; us_agent?: string };
};

export function VerifyView({ cert }: Props) {
  const [activeTab, setActiveTab] = useState<"facility" | "services">("facility");
  const [modal, setModal] = useState<"sales" | "amazon" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [salesForm, setSalesForm] = useState({ name: "", phone: "" });
  const [amazonForm, setAmazonForm] = useState({ name: "", phone: "" });

  const valid =
    Boolean(cert.validity_confirmed) &&
    remainingDays(cert.expires_at) >= 0;
  const left = remainingDays(cert.expires_at);
  const total = daysBetween(cert.registered_at, cert.expires_at);
  const validityYears = getValidityYears(cert as any);
  const isGacc = cert.standard === "GACC";
  const isFda = cert.standard === "FDA";
  const duns = isFda ? ((cert as any).duns_code || "") : "";
  const usAgent = isFda ? ((cert as any).us_agent || "") : "";
  const expiryYear = cert.expires_at.slice(0, 4);
  const regCode = cert.registration_code || "—";
  const scope = cert.scope || "";

  // Load FontAwesome for B2B icons
  useEffect(() => {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (modal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  const showToast = (msg: string) => setToast(msg);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showToast(`Đã sao chép: ${text}`);
    } catch {
      showToast("Sao chép thất bại");
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const submitConsultation = async (serviceName: "sales" | "amazon") => {
    const form = serviceName === "sales" ? salesForm : amazonForm;
    if (!form.name.trim() || !form.phone.trim()) {
      showToast("Vui lòng nhập đủ Họ tên và SĐT/Zalo");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 9) {
      showToast("SĐT không hợp lệ");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: serviceName,
          name: form.name.trim(),
          phone: form.phone.trim(),
          company_name: cert.company_name,
          certificate_no: cert.certificate_no,
          public_code: cert.public_code,
          source_url: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gửi thất bại");
      showToast(
        `Đã gửi yêu cầu tư vấn ${serviceName === "sales" ? "Phòng Sale Xuất Khẩu Mỹ" : "Vận Hành Amazon US"}! Vexim sẽ liên hệ trong 24h.`
      );
      if (serviceName === "sales") setSalesForm({ name: "", phone: "" });
      else setAmazonForm({ name: "", phone: "" });
      setTimeout(() => setModal(null), 1500);
    } catch (err: any) {
      showToast(err.message || "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

  const switchTab = (tab: "facility" | "services") => setActiveTab(tab);

  return (
    <div className="min-h-[100dvh] bg-[#eef2f7] flex justify-center sm:py-6 sm:px-4">
      <div className="w-full max-w-md bg-white sm:rounded-[32px] shadow-2xl overflow-hidden relative flex flex-col min-h-[100dvh] sm:min-h-[90vh] border border-slate-200 mx-auto">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex">
            <div className="bg-slate-900 text-white px-5 py-3 rounded-full text-[13px] font-semibold shadow-2xl flex items-center gap-2.5 max-w-[90vw]">
              <i className="fa-solid fa-circle-check text-emerald-400"></i>
              <span>{toast}</span>
            </div>
          </div>
        )}

        {/* Header & Trust Banner */}
        <header className="relative bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 px-5 pt-6 pb-7 text-white overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white text-slate-900 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved text-emerald-600"></i> VEXIM
              </div>
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full border border-white/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase">Live Sync</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/20 w-9 h-9 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-shield-check text-[16px]"></i>
            </div>
          </div>

          <h1 className="relative mt-6 font-extrabold text-[22px] leading-[1.15] tracking-tight">
            {isGacc ? (
              <>Xác Thực Cơ Sở<br />GACC Hợp Lệ</>
            ) : (
              <>Xác Thực Cơ Sở<br />FDA Hợp Lệ</>
            )}
          </h1>
          <p className="relative mt-2.5 text-[12.5px] leading-[1.6] text-white/80 max-w-[300px]">
            {isGacc
              ? "Xác minh đăng ký doanh nghiệp xuất khẩu thực phẩm sang Trung Quốc (GACC Decree 248). Hồ sơ chính thức được đồng bộ từ hệ thống Vexim Global."
              : "Xác minh đăng ký cơ sở FDA & mã FFRN. Hồ sơ chính thức được đồng bộ từ hệ thống Vexim Global."}
          </p>

          <div className="relative mt-6 grid grid-cols-2 gap-2 bg-black/20 backdrop-blur p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => switchTab("facility")}
              className={`py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === "facility" ? "bg-white text-slate-900 shadow" : "text-white/70 hover:text-white"}`}
            >
              <i className="fa-solid fa-building mr-1.5"></i> Thông Tin Cơ Sở
            </button>
            <button
              onClick={() => switchTab("services")}
              className={`py-2.5 rounded-xl text-[13px] font-bold transition-all ${activeTab === "services" ? "bg-white text-slate-900 shadow" : "text-white/70 hover:text-white"}`}
            >
              <i className="fa-solid fa-rocket mr-1.5"></i> Dịch Vụ Xuất Khẩu Mỹ
            </button>
          </div>
        </header>

        <main className="flex-1 bg-[#f8fafc] overflow-y-auto">
          {/* TAB 1 */}
          {activeTab === "facility" && (
            <div className="p-4 space-y-4">
              {/* Registration Card - Registration Details + Scope merged */}
              <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 bg-[#fcfdfc]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                      <i className={`fa-solid ${isGacc ? "fa-globe" : "fa-file-shield"} text-[14px]`}></i>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {isGacc ? "GACC Registration" : "FDA Registration"}
                      </div>
                      <div className="text-[13px] font-bold text-slate-900">{isGacc ? "Hồ sơ GACC" : "Hồ sơ FDA"}</div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider flex items-center gap-1 ${valid ? "bg-emerald-600 text-white" : "bg-red-50 text-red-700 border border-red-200"}`}>
                    <i className={`fa-solid ${valid ? "fa-circle-check" : "fa-triangle-exclamation"} text-[10px]`}></i> {valid ? `HỢP LỆ ${expiryYear}` : "HẾT HẠN"}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      {isGacc ? "Mã Đăng Ký GACC (China Customs)" : "Mã Đăng Ký FDA (FFRN)"}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 hover:border-amber-300 transition-colors">
                      <div className="font-mono text-[15px] font-bold tracking-wide text-slate-900 break-all">{regCode}</div>
                      <button
                        onClick={() => copyToClipboard(regCode)}
                        className="bg-white border border-slate-200 w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm shrink-0 ml-2"
                      >
                        <i className="fa-regular fa-copy text-[12px]"></i>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-500"><i className="fa-solid fa-industry text-[12px]"></i></div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cơ Sở / Nhà Máy</div>
                      <div className="mt-0.5 text-[13.5px] font-semibold leading-[1.4] text-slate-900">{cert.company_name}</div>
                      <div className="mt-1 text-[11px] text-slate-500">Certificate: <span className="font-mono font-bold text-slate-700">{cert.certificate_no}</span></div>
                    </div>
                  </div>

                  {/* FDA only: DUNS + Status */}
                  {isFda ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mã Số DUNS®</div>
                        <div className="mt-1 font-mono text-[13px] font-bold text-slate-900">{duns ? formatDuns(duns) : "—"}</div>
                        <div className="mt-1 text-[10px] text-slate-500">Dun & Bradstreet</div>
                      </div>
                      <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng Thái Đăng Ký</div>
                        <div className={`mt-1 flex items-center gap-1.5 text-[12px] font-bold ${valid ? "text-emerald-700" : "text-red-600"}`}>
                          <span className={`w-2 h-2 rounded-full ${valid ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span> {valid ? "Active" : "Expired"}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">{valid ? "Đang Hoạt Động" : "Hết hạn"} · {left < 0 ? "0" : left} ngày còn lại</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng Thái Đăng Ký</div>
                      <div className={`mt-1 flex items-center gap-1.5 text-[13px] font-bold ${valid ? "text-emerald-700" : "text-red-600"}`}>
                        <span className={`w-2 h-2 rounded-full ${valid ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span> {valid ? "Active — GACC Certified" : "Expired"} · {left < 0 ? "0" : left} ngày còn lại
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">GACC Decree 248 · Fixed 5-year validity · {formatDate(cert.registered_at)} → {formatDate(cert.expires_at)}</div>
                    </div>
                  )}

                  {/* Scope - part of merged frame */}
                  <div className={`rounded-xl p-3.5 border ${isGacc ? "bg-blue-50/60 border-blue-200" : "bg-amber-50/60 border-amber-200"}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isGacc ? "text-blue-700/70" : "text-amber-700/70"}`}>Ngành Hàng Đăng Ký</div>
                    <div className="mt-1 text-[13px] font-semibold leading-[1.5] text-slate-900">{scope || "—"}</div>
                    <div className="mt-1 text-[11px] leading-[1.5] text-slate-600">Kỳ hạn: {validityYears} năm ({total} ngày) · {formatDate(cert.registered_at)} → {formatDate(cert.expires_at)}</div>
                  </div>

                  <div className="grid grid-cols-1 gap-1">
                    {isFda && usAgent && (
                      <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-2"><i className="fa-solid fa-user-tie text-slate-400 w-4"></i> Đại Diện US Agent</div>
                        <div className="text-[12px] font-semibold text-slate-900 text-right max-w-[60%] truncate">{usAgent}</div>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-2"><i className="fa-regular fa-calendar text-slate-400 w-4"></i> Kỳ Gia Hạn Tiếp Theo</div>
                      <div className="text-[12px] font-semibold text-slate-900">{formatDate(cert.expires_at)}</div>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-2"><i className="fa-solid fa-building-columns text-slate-400 w-4"></i> Đơn vị thực hiện</div>
                      <div className="text-[11px] font-bold text-slate-700">{COMPANY.legal}</div>
                    </div>
                  </div>
                </div>

                <div className="mx-5 mb-5 bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-3 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0"><i className="fa-solid fa-lock text-[12px]"></i></div>
                  <div>
                    <div className="text-[11px] font-bold text-blue-900">Xác thực bảo mật</div>
                    <div className="mt-0.5 text-[11px] leading-[1.5] text-blue-800/80">Tên miền chính thức <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-200">verify.vexim.vn</span> · Mã: <span className="font-mono font-bold">{cert.public_code}</span></div>
                  </div>
                </div>
              </div>

              {/* Registration Service Provider */}
              <div className="bg-white rounded-[20px] border border-slate-200 p-4">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span> Đơn vị thực hiện đăng ký
                </div>
                <div className="mt-3">
                  <div className="font-bold text-[13px] text-slate-900">{COMPANY.legal}</div>
                  <div className="mt-1 text-[11.5px] leading-[1.6] text-slate-600">{COMPANY.address}<br/>Phone: {COMPANY.phone} · {COMPANY.email}<br/>Website: {COMPANY.website.replace("https://","")}</div>
                </div>
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mã Xác Thực</div>
                  <div className="font-mono text-[12px] font-bold tracking-wider">{cert.public_code}</div>
                </div>
              </div>

              {/* Cross-Selling Banner */}
              <div className="rounded-[20px] bg-gradient-to-br from-slate-900 to-slate-800 p-[1px] shadow-lg">
                <div className="rounded-[19px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl"></div>
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-900 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                      <i className="fa-solid fa-bolt"></i> Growth
                    </div>
                    <h3 className="mt-3 font-bold text-[15px] leading-[1.3] text-white">Giải Pháp Tăng Trưởng Cho Nhà Máy Sau {isGacc ? "GACC" : "FDA"}</h3>
                    <p className="mt-1.5 text-[11.5px] leading-[1.6] text-white/60">{isGacc ? "GACC là vé vào Trung Quốc, FDA là vé vào Mỹ. Vexim giúp bạn bán được hàng tại Mỹ với 2 dịch vụ cốt lõi." : "FDA chỉ là vé vào cửa. Vexim giúp bạn bán được hàng tại Mỹ với 2 dịch vụ cốt lõi."}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <button onClick={() => setModal("sales")} className="bg-white text-slate-900 rounded-xl py-3 px-3 text-left hover:bg-amber-50 transition-colors border border-white">
                        <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700"><i className="fa-solid fa-handshake text-[13px]"></i></div>
                        <div className="mt-2 text-[12px] font-bold leading-[1.2]">Phòng Sale Xuất Khẩu Mỹ</div>
                        <div className="mt-1 text-[10px] text-slate-500">Kết nối buyer B2B</div>
                      </button>
                      <button onClick={() => setModal("amazon")} className="bg-slate-800 border border-white/10 rounded-xl py-3 px-3 text-left hover:border-amber-400/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white"><i className="fa-brands fa-amazon text-[14px]"></i></div>
                        <div className="mt-2 text-[12px] font-bold leading-[1.2] text-white">Vận Hành Amazon US</div>
                        <div className="mt-1 text-[10px] text-white/50">FBA & Store Ops</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "services" && (
            <div className="p-4 space-y-4">
              <div className="rounded-[20px] bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 p-5 relative overflow-hidden shadow-sm">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
                <div className="relative">
                  <div className="inline-flex bg-slate-900 text-amber-300 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"><i className="fa-solid fa-crown mr-1"></i> Vexim Growth Hub</div>
                  <h2 className="mt-3 font-black text-[18px] leading-[1.2] text-slate-900">Mở Rộng Thị Trường Mỹ Sau FDA</h2>
                  <p className="mt-2 text-[12px] leading-[1.6] text-slate-800/80">Bạn đã có FDA. Giờ là lúc biến chứng nhận thành doanh thu USD. Vexim cung cấp đội ngũ bán hàng và vận hành tại Mỹ thay cho việc mở văn phòng tốn kém.</p>
                </div>
              </div>

              <div onClick={() => setModal("sales")} className="group bg-white rounded-[20px] border border-slate-200 p-5 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm"><i className="fa-solid fa-people-group"></i></div>
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">B2B Focus</div>
                </div>
                <h3 className="mt-4 font-bold text-[14px] leading-[1.3] text-slate-900">Tư Vấn & Ủy Thác Phòng Sale Xuất Khẩu Mỹ</h3>
                <p className="mt-2 text-[12px] leading-[1.6] text-slate-600">Kết nối buyer B2B, chuỗi bán lẻ, bảo vệ thanh toán L/C, tuân thủ FSVP. Tiết kiệm 70% chi phí so với mở văn phòng tại Mỹ.</p>
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2 text-[11px] text-slate-700"><i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i> Kết nối buyer & phân phối bán lẻ Mỹ</div>
                  <div className="flex gap-2 text-[11px] text-slate-700"><i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i> Đàm phán L/C & bảo vệ thanh toán</div>
                  <div className="flex gap-2 text-[11px] text-slate-700"><i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i> Tuân thủ FSVP & chứng từ xuất khẩu</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="flex-1 bg-slate-900 text-white text-center py-2.5 rounded-xl text-[12px] font-bold group-hover:bg-black">Tư Vấn Ngay <i className="fa-solid fa-arrow-right ml-1"></i></span>
                  <a href="https://veximtrade.com" target="_blank" onClick={(e)=>e.stopPropagation()} className="px-3 py-2.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50">veximtrade.com <i className="fa-solid fa-external-link ml-1"></i></a>
                </div>
              </div>

              <div onClick={() => setModal("amazon")} className="group bg-white rounded-[20px] border border-slate-200 p-5 hover:border-slate-900 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-sm"><i className="fa-brands fa-amazon text-[18px]"></i></div>
                  <div className="bg-slate-900 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase">300M+ Reach</div>
                </div>
                <h3 className="mt-4 font-bold text-[14px] leading-[1.3] text-slate-900">Vận Hành & Tối Ưu Gian Hàng Amazon US</h3>
                <p className="mt-2 text-[12px] leading-[1.6] text-slate-600">Tiếp cận 300M+ khách hàng toàn cầu. Quản lý Brand Registry (USPTO), A+ Content, PPC, FBA logistics trọn gói.</p>
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2 text-[11px] text-slate-700"><i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i> Đăng ký thương hiệu USPTO & Brand Registry</div>
                  <div className="flex gap-2 text-[11px] text-slate-700"><i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i> A+ Content, Storefront, PPC tối ưu</div>
                  <div className="flex gap-2 text-[11px] text-slate-700"><i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i> Vận hành FBA & xử lý vận chuyển Mỹ</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="flex-1 bg-slate-900 text-white text-center py-2.5 rounded-xl text-[12px] font-bold group-hover:bg-black">Tư Vấn Ngay <i className="fa-solid fa-arrow-right ml-1"></i></span>
                  <a href="https://veximops.com" target="_blank" onClick={(e)=>e.stopPropagation()} className="px-3 py-2.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50">veximops.com <i className="fa-solid fa-external-link ml-1"></i></a>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="bg-white border-t border-slate-200 p-3">
          <button onClick={() => copyToClipboard(window.location.href)} className="w-full bg-slate-900 text-white rounded-xl py-3.5 text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors">
            <i className="fa-solid fa-share-nodes"></i> Chia Sẻ Kết Quả Xác Thực
          </button>
          <div className="mt-3 flex items-center justify-between px-1">
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">VEXIM | Hệ Thống Quản Lý Chuỗi Cung Ứng</div>
            <div className="text-[10px] text-slate-400">© 2026 Vexim Global</div>
          </div>
        </footer>

        {/* Modals - Fixed size on mobile, no stretch when keyboard appears */}
        {modal === "sales" && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModal(null)}></div>
            <div className="relative bg-white w-full max-w-md rounded-t-[28px] sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col h-[85dvh] sm:h-auto sm:max-h-[90vh] max-h-[85dvh] sm:max-h-[90vh]">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 text-slate-900 relative shrink-0">
                <button onClick={() => setModal(null)} className="absolute top-4 right-4 w-8 h-8 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
                <div className="inline-flex bg-slate-900 text-amber-300 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Phòng Sale Mỹ</div>
                <h3 className="mt-3 font-black text-[18px] leading-[1.2]">Ủy Thác Phòng Sale Xuất Khẩu Mỹ</h3>
                <p className="mt-2 text-[12px] leading-[1.5] text-slate-900/80">Tiết kiệm 70% chi phí so với mở văn phòng tại Mỹ. Có ngay đội ngũ sale bản địa.</p>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1">
                <div className="space-y-2.5">
                  <div className="flex gap-2.5"><div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><i className="fa-solid fa-check text-[10px]"></i></div><div className="text-[12px] leading-[1.5] text-slate-700"><b>Kết nối Buyer B2B</b> - Chuỗi siêu thị, phân phối Mỹ</div></div>
                  <div className="flex gap-2.5"><div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><i className="fa-solid fa-check text-[10px]"></i></div><div className="text-[12px] leading-[1.5] text-slate-700"><b>Bảo vệ L/C</b> - An toàn giao dịch quốc tế</div></div>
                  <div className="flex gap-2.5"><div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><i className="fa-solid fa-check text-[10px]"></i></div><div className="text-[12px] leading-[1.5] text-slate-700"><b>FSVP</b> - Chứng từ & kiểm tra nhập khẩu</div></div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đăng ký tư vấn miễn phí</div>
                  <div className="mt-3 space-y-3">
                    <input value={salesForm.name} onChange={(e)=>setSalesForm({...salesForm, name: e.target.value})} placeholder="Họ tên / Tên nhà máy" className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[16px] sm:text-[13px] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"/>
                    <input value={salesForm.phone} onChange={(e)=>setSalesForm({...salesForm, phone: e.target.value})} placeholder="SĐT / Zalo" inputMode="numeric" className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[16px] sm:text-[13px] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"/>
                    <button disabled={submitting} onClick={()=>submitConsultation("sales")} className="w-full bg-slate-900 text-white rounded-xl py-3 text-[13px] font-bold hover:bg-black disabled:opacity-60 shrink-0">{submitting ? "Đang gửi..." : <>Gửi Yêu Cầu Tư Vấn <i className="fa-solid fa-paper-plane ml-1.5"></i></>}</button>
                    <a href="https://veximtrade.com" target="_blank" className="block text-center text-[11px] font-bold text-slate-600 hover:text-slate-900 underline">Hoặc truy cập veximtrade.com <i className="fa-solid fa-external-link ml-1"></i></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {modal === "amazon" && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModal(null)}></div>
            <div className="relative bg-white w-full max-w-md rounded-t-[28px] sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col h-[85dvh] sm:h-auto sm:max-h-[90vh] max-h-[85dvh] sm:max-h-[90vh]">
              <div className="bg-slate-900 p-6 text-white relative shrink-0">
                <button onClick={() => setModal(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
                <div className="inline-flex bg-white text-slate-900 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"><i className="fa-brands fa-amazon mr-1"></i> Amazon US</div>
                <h3 className="mt-3 font-black text-[18px] leading-[1.2]">Vận Hành Gian Hàng Amazon US</h3>
                <p className="mt-2 text-[12px] leading-[1.5] text-white/70">Tiếp cận 300M+ khách hàng toàn cầu. Vexim quản lý toàn bộ vận hành.</p>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1">
                <div className="space-y-2.5">
                  <div className="flex gap-2.5"><div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0"><i className="fa-solid fa-check text-[10px]"></i></div><div className="text-[12px] leading-[1.5] text-slate-700"><b>Brand Registry & USPTO</b> - Bảo hộ thương hiệu</div></div>
                  <div className="flex gap-2.5"><div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0"><i className="fa-solid fa-check text-[10px]"></i></div><div className="text-[12px] leading-[1.5] text-slate-700"><b>A+ Content & PPC</b> - Tối ưu hiển thị & quảng cáo</div></div>
                  <div className="flex gap-2.5"><div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0"><i className="fa-solid fa-check text-[10px]"></i></div><div className="text-[12px] leading-[1.5] text-slate-700"><b>FBA Logistics</b> - Lưu kho, đóng gói, giao hàng</div></div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đăng ký tư vấn miễn phí</div>
                  <div className="mt-3 space-y-3">
                    <input value={amazonForm.name} onChange={(e)=>setAmazonForm({...amazonForm, name: e.target.value})} placeholder="Họ tên / Tên nhà máy" className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[16px] sm:text-[13px] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"/>
                    <input value={amazonForm.phone} onChange={(e)=>setAmazonForm({...amazonForm, phone: e.target.value})} placeholder="SĐT / Zalo" inputMode="numeric" className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-[16px] sm:text-[13px] focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"/>
                    <button disabled={submitting} onClick={()=>submitConsultation("amazon")} className="w-full bg-slate-900 text-white rounded-xl py-3 text-[13px] font-bold hover:bg-black disabled:opacity-60 shrink-0">{submitting ? "Đang gửi..." : <>Gửi Yêu Cầu Tư Vấn <i className="fa-solid fa-paper-plane ml-1.5"></i></>}</button>
                    <a href="https://veximops.com" target="_blank" className="block text-center text-[11px] font-bold text-slate-600 hover:text-slate-900 underline">Hoặc truy cập veximops.com <i className="fa-solid fa-external-link ml-1"></i></a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

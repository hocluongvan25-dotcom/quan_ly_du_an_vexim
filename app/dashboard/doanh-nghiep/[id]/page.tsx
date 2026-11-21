"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, FileText, Calendar, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Company = {
  id: number;
  company_name: string;
  email: string;
  phone: string;
  tax_code: string;
  address: string;
  contact_person: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export default function CompanyDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // If id is negative (auto from certificates), fetch by name if provided, or try to get name from companies list
        if (id < 0) {
          const name = searchParams.get("name") || "";
          if (!name) {
            // Try to find company name from local list via API
            const resList = await fetch("/api/companies");
            const dataList = await resList.json();
            const found = (dataList.companies || []).find((c: any) => c.id === id);
            if (found) {
              setCompany(found);
              // Fetch stats via name
              const resStats = await fetch(`/api/companies/stats?name=${encodeURIComponent(found.company_name)}`);
              if (resStats.ok) {
                const dataStats = await resStats.json();
                setStats(dataStats.stats);
              }
            }
          } else {
            // Create temp company object
            setCompany({
              id,
              company_name: name,
              email: "",
              phone: "",
              tax_code: "",
              address: "",
              contact_person: "",
              notes: "Tự động từ chứng nhận - chưa có hồ sơ chính thức",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            const resStats = await fetch(`/api/companies/stats?name=${encodeURIComponent(name)}`);
            if (resStats.ok) {
              const dataStats = await resStats.json();
              setStats(dataStats.stats);
            }
          }
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/companies/${id}`);
        const data = await res.json();
        if (res.ok) {
          setCompany(data.company);
          setStats(data.stats);
        } else {
          alert(data.error || "Không tìm thấy");
          router.replace("/dashboard/doanh-nghiep");
        }
      } catch {}
      setLoading(false);
    };
    if (id) fetchData();
  }, [id, searchParams]);

  if (loading) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;
  if (!company) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/dashboard/doanh-nghiep" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </Link>

      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy-900 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-teal-600" /> {company.company_name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Hồ sơ chính thức từ database</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold">ID: {company.id}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-4 border">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Thông Tin Liên Hệ</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {company.email || "—"}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {company.phone || "—"}</div>
                <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400" /> MST: <span className="font-mono font-bold">{company.tax_code || "—"}</span></div>
                <div className="text-sm"><span className="text-slate-500">Người LH:</span> {company.contact_person || "—"}</div>
                <div className="text-sm"><span className="text-slate-500">Địa chỉ:</span> {company.address || "—"}</div>
              </div>
            </div>
            {company.notes && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Ghi Chú</div>
                <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{company.notes}</div>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-navy-900 text-white p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">Dịch Vụ Đã Đăng Ký</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {stats?.services?.length ? (
                stats.services.map((s: string) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold">
                    {s === "FDA" ? "FDA Hoa Kỳ" : s === "GACC" ? "GACC Trung Quốc" : s === "SALE_EXPORT" ? "Phòng Sale XK Mỹ" : s === "AMAZON_OPS" ? "Vận Hành Amazon" : s}
                  </span>
                ))
              ) : (
                <span className="text-sm text-white/60">Chưa có dịch vụ</span>
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <div className="text-[11px] text-white/60">Tổng Chứng Nhận</div>
                <div className="mt-1 text-xl font-bold">{stats?.totalCertificates ?? 0}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <div className="text-[11px] text-white/60">Leads Tư Vấn</div>
                <div className="mt-1 text-xl font-bold">{stats?.totalLeads ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificates */}
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <h2 className="font-display text-lg font-bold text-navy-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-teal-600" /> Chứng Nhận FDA / GACC
        </h2>
        {stats?.certificates?.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b">
                  <th className="py-2 px-2 text-left">Số Chứng Nhận</th>
                  <th className="py-2 px-2 text-left">Tiêu Chuẩn</th>
                  <th className="py-2 px-2 text-left">Mã ĐK</th>
                  <th className="py-2 px-2 text-left">Ngày ĐK / Hết Hạn</th>
                  <th className="py-2 px-2 text-left">Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {stats.certificates.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-3 px-2">
                      <Link href={`/dashboard/ho-so/${c.id}`} className="font-mono font-semibold text-navy-900 hover:underline flex items-center gap-1">
                        {c.certificate_no} <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${c.standard === "FDA" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{c.standard}</span>
                    </td>
                    <td className="py-3 px-2 font-mono text-xs">{c.registration_code}</td>
                    <td className="py-3 px-2 text-xs">
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(c.registered_at)} → {formatDate(c.expires_at)}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${c.status === "published" ? "bg-emerald-100 text-emerald-800" : c.status === "expired" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 py-8 text-center text-sm text-slate-500">Chưa có chứng nhận nào cho công ty này</div>
        )}
      </div>

      {/* Leads */}
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <h2 className="font-display text-lg font-bold text-navy-900">Lịch Sử Tư Vấn Dịch Vụ</h2>
        {stats?.leads?.length ? (
          <div className="mt-4 space-y-3">
            {stats.leads.map((l: any) => (
              <div key={l.id} className="rounded-xl border p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm">{l.name} · {l.phone}</div>
                  <div className="text-xs text-slate-500 mt-1">Dịch vụ: <b>{l.service_type === "sales" ? "Phòng Sale Xuất Khẩu Mỹ (veximtrade.com)" : "Vận Hành Amazon US (veximops.com)"}</b> · {formatDate(l.created_at)}</div>
                  <div className="text-xs text-slate-600 mt-1">Nguồn: {l.source_url || "—"}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${l.status === "new" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{l.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 py-8 text-center text-sm text-slate-500">Chưa có yêu cầu tư vấn nào</div>
        )}
      </div>
    </div>
  );
}

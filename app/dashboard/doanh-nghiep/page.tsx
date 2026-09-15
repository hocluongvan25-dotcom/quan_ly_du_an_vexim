"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Mail, Phone, FileText, Search, Plus, Edit3, Trash2, Loader2 } from "lucide-react";

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

type CompanyWithStats = Company & {
  stats?: {
    certificates: any[];
    leads: any[];
    services: string[];
    totalCertificates: number;
    totalLeads: number;
  };
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({
    company_name: "",
    email: "",
    phone: "",
    tax_code: "",
    address: "",
    contact_person: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/companies");
      const data = await res.json();
      if (res.ok) setCompanies(data.companies || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filtered = companies.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.company_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.tax_code.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      company_name: "",
      email: "",
      phone: "",
      tax_code: "",
      address: "",
      contact_person: "",
      notes: "",
    });
    setShowForm(true);
    setMsg("");
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({
      company_name: c.company_name,
      email: c.email,
      phone: c.phone,
      tax_code: c.tax_code,
      address: c.address,
      contact_person: c.contact_person,
      notes: c.notes,
    });
    setShowForm(true);
    setMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const url = editing ? `/api/companies/${editing.id}` : "/api/companies";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Lỗi khi lưu");
        setBusy(false);
        return;
      }
      setShowForm(false);
      await fetchCompanies();
    } catch (err: any) {
      setMsg(err.message || "Lỗi");
    }
    setBusy(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn chắc chắn muốn xóa hồ sơ doanh nghiệp này?")) return;
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Xóa thất bại");
        return;
      }
      await fetchCompanies();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-600" /> Quản Lý Hồ Sơ Doanh Nghiệp
          </h1>
          <p className="mt-1 text-sm text-navy-900/60">
            Dữ liệu chính thức từ database: tên công ty, email, SĐT, MST, dịch vụ đã đăng ký (FDA, GACC, Sale Export, Amazon)
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-black"
        >
          <Plus className="h-4 w-4" /> Thêm Doanh Nghiệp
        </button>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT, MST..."
              className="input pl-10"
            />
          </div>
          <div className="text-sm text-slate-500">{filtered.length} doanh nghiệp</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <div>Chưa có hồ sơ doanh nghiệp nào</div>
            <div className="text-xs mt-1">Thêm mới hoặc hệ thống sẽ tự tạo khi có chứng nhận FDA/GACC</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b">
                  <th className="py-3 px-3">Công Ty</th>
                  <th className="py-3 px-3">Email / SĐT</th>
                  <th className="py-3 px-3">MST</th>
                  <th className="py-3 px-3">Dịch Vụ Đã ĐK</th>
                  <th className="py-3 px-3">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50/70">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-navy-900">{c.company_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        {c.contact_person && <span>{c.contact_person} · </span>}
                        {c.address && <span className="truncate max-w-[200px]">{c.address}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Mail className="h-3 w-3 text-slate-400" /> {c.email || "—"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs mt-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {c.phone || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-xs font-semibold">{c.tax_code || "—"}</div>
                    </td>
                    <td className="py-3 px-3">
                      <CompanyServices companyName={c.company_name} />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {c.id > 0 ? (
                          <>
                            <Link
                              href={`/dashboard/doanh-nghiep/${c.id}`}
                              className="p-2 rounded-lg border hover:bg-white"
                              title="Xem chi tiết"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>
                            <button onClick={() => openEdit(c)} className="p-2 rounded-lg border hover:bg-white" title="Sửa">
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg border hover:bg-rose-50 text-rose-600" title="Xóa">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Chưa có hồ sơ</span>
                            <button
                              onClick={() => {
                                setEditing(null);
                                setForm({
                                  company_name: c.company_name,
                                  email: "",
                                  phone: "",
                                  tax_code: "",
                                  address: "",
                                  contact_person: "",
                                  notes: "",
                                });
                                setShowForm(true);
                              }}
                              className="p-2 rounded-lg bg-navy-900 text-white hover:bg-black"
                              title="Tạo hồ sơ chính thức"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-xl font-bold text-navy-900">
              {editing ? "Sửa Hồ Sơ Doanh Nghiệp" : "Thêm Doanh Nghiệp Mới"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Dữ liệu lưu chính thức vào database (Supabase / SQLite)</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tên Công Ty *</label>
                <input className="input mt-1" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="VD: An Phat Food JSC" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</label>
                  <input className="input mt-1" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@company.com" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">SĐT</label>
                  <input className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09xxxxxxx" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mã Số Thuế</label>
                  <input className="input mt-1 font-mono" value={form.tax_code} onChange={(e) => setForm({ ...form, tax_code: e.target.value })} placeholder="0101234567" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Người Liên Hệ</label>
                  <input className="input mt-1" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Nguyễn Văn A" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Địa Chỉ</label>
                <input className="input mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Số nhà, đường, quận, tỉnh" />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ghi Chú</label>
                <textarea className="input mt-1 min-h-[70px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú nội bộ..." />
              </div>

              {msg && <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{msg}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">
                  Hủy
                </button>
                <button type="submit" disabled={busy} className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Cập Nhật" : "Tạo Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyServices({ companyName }: { companyName: string }) {
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Try to get from companies API stats via name search in certificates
        // For simplicity, we fetch certificates list and filter
        const res = await fetch("/api/certificates");
        if (!res.ok) return;
        const data = await res.json();
        const certs = (data.items || data.certificates || []).filter((c: any) => c.company_name === companyName);
        const svc = new Set<string>();
        certs.forEach((c: any) => svc.add(c.standard));
        // Also try leads
        try {
          const res2 = await fetch("/api/consultation");
          if (res2.ok) {
            const data2 = await res2.json();
            const leads = (data2.leads || []).filter((l: any) => l.company_name === companyName);
            leads.forEach((l: any) => svc.add(l.service_type === "sales" ? "SALE" : "AMAZON"));
          }
        } catch {}
        setServices(Array.from(svc));
      } catch {}
      setLoading(false);
    };
    fetchStats();
  }, [companyName]);

  if (loading) return <span className="text-xs text-slate-400">...</span>;
  if (services.length === 0) return <span className="text-xs text-slate-400">Chưa có DV</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {services.map((s) => (
        <span
          key={s}
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            s === "FDA"
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : s === "GACC"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : s === "SALE"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-slate-900 text-white border-slate-900"
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

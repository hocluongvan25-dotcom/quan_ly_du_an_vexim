"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

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
  standards?: string[];
  certificate_count?: number;
  nearest_expiry?: string | null;
  nearest_remaining?: number | null;
  nearest_cert_no?: string | null;
  nearest_standard?: string | null;
};

type CompanyForm = Pick<Company, "company_name" | "email" | "phone" | "tax_code" | "address" | "contact_person" | "notes">;

const emptyForm: CompanyForm = {
  company_name: "",
  email: "",
  phone: "",
  tax_code: "",
  address: "",
  contact_person: "",
  notes: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/companies");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tải được danh sách doanh nghiệp.");
      setCompanies(data.companies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách doanh nghiệp.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("vi");
    if (!query) return companies;
    return companies.filter((company) =>
      [company.company_name, company.email, company.phone, company.tax_code, company.contact_person]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(query)
    );
  }, [companies, search]);

  const openCreate = (company?: Company) => {
    setEditing(null);
    setForm(company ? { ...emptyForm, company_name: company.company_name } : emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({
      company_name: company.company_name,
      email: company.email,
      phone: company.phone,
      tax_code: company.tax_code,
      address: company.address,
      contact_person: company.contact_person,
      notes: company.notes,
    });
    setError("");
    setShowForm(true);
  };

  const saveCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/companies/${editing.id}` : "/api/companies", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không lưu được hồ sơ.");
      setShowForm(false);
      await fetchCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được hồ sơ.");
    } finally {
      setBusy(false);
    }
  };

  const deleteCompany = async (company: Company) => {
    if (!window.confirm(`Xóa hồ sơ của ${company.company_name}?`)) return;
    try {
      const response = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không xóa được hồ sơ.");
      await fetchCompanies();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Không xóa được hồ sơ.");
    }
  };

  return (
    <div className="records-page">
      <div className="records-page__inner">
        <header className="rec-head">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6e6e73]">Vận hành</p>
            <h1 className="rec-head__title mt-1">Doanh nghiệp</h1>
            <p className="rec-head__sub">Theo dõi hồ sơ, báo giá, chứng nhận và bước tiếp theo tại một nơi.</p>
          </div>
          <div className="rec-head__actions">
            <button className="rec-btn-primary" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" /> Thêm doanh nghiệp
            </button>
          </div>
        </header>

        <section className="rec-toolbar" aria-label="Tìm doanh nghiệp">
          <div className="rec-toolbar__row">
            <div className="rec-search">
              <Search className="rec-search__icon" />
              <input
                className="rec-search__input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên, email, số điện thoại hoặc mã số thuế"
                aria-label="Tìm doanh nghiệp"
              />
              {search && (
                <button className="rec-search__clear" onClick={() => setSearch("")} aria-label="Xóa nội dung tìm kiếm">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <span className="rec-count">{filtered.length} doanh nghiệp</span>
          </div>
        </section>

        {error && !showForm && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rec-fallback flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải doanh nghiệp
          </div>
        ) : filtered.length === 0 ? (
          <div className="rec-card mt-4">
            <div className="rec-empty">
              <div className="rec-empty__icon"><Building2 className="h-5 w-5" /></div>
              <div className="rec-empty__title">{search ? "Không tìm thấy doanh nghiệp" : "Chưa có doanh nghiệp"}</div>
              <div className="rec-empty__text">
                {search ? "Thử tên công ty, email hoặc mã số thuế khác." : "Tạo hồ sơ để bắt đầu theo dõi công việc của khách hàng."}
              </div>
              {!search && <button className="rec-btn-primary mt-4" onClick={() => openCreate()}><Plus className="h-4 w-4" /> Thêm doanh nghiệp</button>}
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {filtered.map((company) => (
              <article key={company.id} className="rounded-[20px] border border-black/[0.08] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04)] transition hover:border-black/[0.14] sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f2f2f7] text-[#6e6e73]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={company.id > 0 ? `/dashboard/doanh-nghiep/${company.id}` : `/dashboard/doanh-nghiep/${company.id}?name=${encodeURIComponent(company.company_name)}`}
                          className="truncate text-base font-semibold tracking-tight text-[#1d1d1f] hover:text-[#0071e3]"
                        >
                          {company.company_name}
                          <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 text-[#86868b]" />
                        </Link>
                        {company.id < 0 && <span className="rec-badge rec-badge--draft">Chưa hoàn thiện</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[#6e6e73]">
                        {company.contact_person && <span>{company.contact_person}</span>}
                        {company.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{company.email}</span>}
                        {company.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{company.phone}</span>}
                        {company.tax_code && <span>MST {company.tax_code}</span>}
                        {company.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{company.address}</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {(company.standards || []).length > 0 ? company.standards!.map((standard) => (
                          <span key={standard} className={`rec-standard ${standard === "GACC" ? "rec-standard--gacc" : ""}`}>{standard}</span>
                        )) : <span className="text-xs text-[#86868b]">Chưa có chứng nhận</span>}
                        {company.certificate_count ? (
                          <span className="rec-term"><FileText className="mr-1 h-3 w-3" />{company.certificate_count} chứng nhận</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] pt-3 sm:w-[240px] sm:justify-end sm:border-0 sm:pt-0">
                    <ExpiryBadge company={company} />
                    <div className="flex shrink-0 items-center gap-1">
                      {company.id < 0 ? (
                        <button className="rec-btn-quiet" onClick={() => openCreate(company)}><Plus className="h-3.5 w-3.5" /> Hoàn thiện</button>
                      ) : (
                        <>
                          <button className="rec-btn-quiet" onClick={() => openEdit(company)} title="Sửa hồ sơ" aria-label={`Sửa ${company.company_name}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button className="rec-btn-quiet text-[#b3261e]" onClick={() => deleteCompany(company)} title="Xóa hồ sơ" aria-label={`Xóa ${company.company_name}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <Link className="rec-btn-quiet" href={`/dashboard/doanh-nghiep/${company.id}`} aria-label={`Mở ${company.company_name}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
          <div className="w-full max-w-xl overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-black/[0.08] px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">{editing ? "Sửa hồ sơ doanh nghiệp" : "Thêm doanh nghiệp"}</h2>
                <p className="mt-1 text-sm text-[#6e6e73]">Nhập thông tin để theo dõi mọi bước xử lý.</p>
              </div>
              <button className="rounded-full bg-[#f2f2f7] p-2 text-[#6e6e73] hover:bg-[#e8e8ed]" onClick={() => setShowForm(false)} aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveCompany} className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
              <Field label="Tên doanh nghiệp" required>
                <input className="rec-form-input" required autoFocus value={form.company_name} onChange={(event) => setForm({ ...form, company_name: event.target.value })} placeholder="Tên công ty" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email"><input className="rec-form-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="ten@congty.vn" /></Field>
                <Field label="Số điện thoại"><input className="rec-form-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="09xx xxx xxx" /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mã số thuế"><input className="rec-form-input" value={form.tax_code} onChange={(event) => setForm({ ...form, tax_code: event.target.value })} placeholder="Mã số thuế" /></Field>
                <Field label="Người liên hệ"><input className="rec-form-input" value={form.contact_person} onChange={(event) => setForm({ ...form, contact_person: event.target.value })} placeholder="Họ và tên" /></Field>
              </div>
              <Field label="Địa chỉ"><input className="rec-form-input" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Địa chỉ doanh nghiệp" /></Field>
              <Field label="Ghi chú"><textarea className="rec-form-input min-h-20 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Thông tin cần nhớ" /></Field>
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</div>}
              <div className="flex justify-end gap-2 border-t border-black/[0.08] pt-4">
                <button type="button" className="rec-btn-quiet" onClick={() => setShowForm(false)}>Hủy</button>
                <button type="submit" className="rec-btn-primary" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Lưu thay đổi" : "Tạo hồ sơ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ children, label, required }: { children: React.ReactNode; label: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-[#1d1d1f]">
      {label}{required && <span className="ml-1 text-[#b3261e]">*</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ExpiryBadge({ company }: { company: Company }) {
  const remaining = company.nearest_remaining;
  if (remaining === undefined || remaining === null) {
    return <span className="inline-flex items-center gap-1.5 text-xs text-[#86868b]"><Clock3 className="h-3.5 w-3.5" />Chưa có hạn</span>;
  }
  const expired = remaining < 0;
  const urgent = !expired && remaining <= 30;
  const warning = !expired && remaining <= 90;
  const className = expired ? "rec-badge--expired" : urgent || warning ? "rec-badge--expiring" : "rec-badge--valid";
  const text = expired ? `Hết hạn ${Math.abs(remaining)} ngày` : remaining === 0 ? "Hết hạn hôm nay" : `Còn ${remaining} ngày`;
  const Icon = expired || urgent ? AlertTriangle : remaining <= 90 ? Clock3 : CheckCircle2;
  return (
    <span className={`rec-badge ${className}`} title={company.nearest_cert_no ? `${company.nearest_standard || ""} ${company.nearest_cert_no}` : undefined}>
      <Icon className="h-3 w-3" />{text}
    </span>
  );
}

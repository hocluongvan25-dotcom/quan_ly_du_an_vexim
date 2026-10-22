import { listCertificates, listCompanies } from "@/lib/db";
import type { Standard } from "@/lib/types";
import { todayUtcIso } from "@/lib/utils";
import type { LookupStatus } from "./content";
import {
  formatDdMmYyyy,
  lookupStatus,
  maskRegistrationCode,
  normalizeForSearch,
  MAX_LOOKUP_RESULTS,
  MIN_QUERY_LENGTH,
} from "./lookup";

export type PublicLookupRecord = {
  id: number;
  companyName: string;
  standard: Standard;
  registrationNumber: string;
  status: LookupStatus;
  expiresAt: string;
  updatedAt: string;
};

type Candidate = {
  id: number;
  companyName: string;
  standard: Standard;
  registrationCode: string;
  certificateNo: string;
  publicCode: string;
  expiresAt: string;
  updatedAt: string;
  score: number;
};

/**
 * Tra cứu công khai trên hồ sơ đã công bố.
 *
 * Chỉ trả về thông tin được phép công bố: tên doanh nghiệp, loại đăng ký,
 * số đăng ký đã ẩn phần giữa, tình trạng, ngày hết hạn và ngày cập nhật.
 * Không trả về phí dịch vụ, số hợp đồng, tài liệu hay người liên hệ.
 */
export async function searchPublicRecords(rawQuery: string, standard?: Standard): Promise<PublicLookupRecord[]> {
  const query = normalizeForSearch(rawQuery);
  if (query.length < MIN_QUERY_LENGTH) return [];

  const [certificates, companies] = await Promise.all([listCertificates(), listCompanies()]);

  const taxCodeCompanies = new Set(
    companies
      .filter((company) => company.tax_code && normalizeForSearch(company.tax_code) === query)
      .map((company) => normalizeForSearch(company.company_name))
  );

  const today = todayUtcIso();

  const candidates: Candidate[] = certificates
    .filter((cert) => cert.status !== "draft")
    .filter((cert) => !standard || cert.standard === standard)
    .flatMap((cert) => {
      const registration = normalizeForSearch(cert.registration_code);
      const certificateNo = normalizeForSearch(cert.certificate_no);
      const publicCode = normalizeForSearch(cert.public_code);
      const companyName = normalizeForSearch(cert.company_name);

      let score = 0;
      if (registration && registration === query) score = 100;
      else if (certificateNo && certificateNo === query) score = 90;
      else if (publicCode && publicCode === query) score = 90;
      else if (registration && registration.startsWith(query)) score = 80;
      else if (registration && registration.includes(query)) score = 70;
      else if (certificateNo && certificateNo.includes(query)) score = 60;
      else if (companyName && companyName.includes(query)) score = 50;
      else if (taxCodeCompanies.has(companyName)) score = 40;
      else return [];

      return [
        {
          id: cert.id,
          companyName: cert.company_name,
          standard: cert.standard,
          registrationCode: cert.registration_code,
          certificateNo: cert.certificate_no,
          publicCode: cert.public_code,
          expiresAt: cert.expires_at,
          updatedAt: cert.updated_at,
          score,
        },
      ];
    })
    .sort((a, b) => b.score - a.score || (a.expiresAt < b.expiresAt ? 1 : -1))
    .slice(0, MAX_LOOKUP_RESULTS);

  return candidates.map((candidate) => ({
    id: candidate.id,
    companyName: candidate.companyName,
    standard: candidate.standard,
    registrationNumber: maskRegistrationCode(candidate.registrationCode || candidate.certificateNo),
    status: lookupStatus(candidate.expiresAt, today),
    expiresAt: formatDdMmYyyy(candidate.expiresAt),
    updatedAt: formatDdMmYyyy(candidate.updatedAt),
  }));
}

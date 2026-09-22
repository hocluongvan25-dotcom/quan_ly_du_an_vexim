import type { Certificate, Standard } from "./types";
import { resolveValidityYears } from "./types";
import { expiryFromStandard } from "./utils";

export type CertificateInput = {
  standard: Standard;
  registration_code: string;
  duns_code?: string;
  us_agent?: string;
  service_price: number;
  company_name: string;
  company_email?: string;
  portal_user?: string;
  portal_pass?: string;
  scope: string;
  registered_at: string;
  validity_years?: number;
};

export type CertificateChanges = Required<CertificateInput> & { expires_at: string };

export const certificateFields = [
  "standard", "registration_code", "duns_code", "us_agent", "service_price",
  "company_name", "company_email", "portal_user", "portal_pass", "scope", "registered_at",
  "validity_years", "expires_at",
] as const;

/** Only changing contract dates/standard may recalculate expiry. Never lose a renewal on a metadata edit. */
export function prepareCertificateChanges(current: Certificate, input: CertificateInput): CertificateChanges {
  const validity = resolveValidityYears(input.validity_years, input.standard);
  const datesChanged = current.registered_at !== input.registered_at ||
    current.standard !== input.standard || current.validity_years !== validity;
  const changes: CertificateChanges = {
    standard: input.standard,
    registration_code: input.registration_code.trim(),
    duns_code: input.standard === "GACC" ? "" : (input.duns_code ?? current.duns_code).replace(/\D/g, "").slice(0, 9),
    us_agent: input.standard === "GACC" ? "" : (input.us_agent ?? current.us_agent).trim().slice(0, 200),
    service_price: Math.max(0, Math.round(input.service_price || 0)),
    company_name: input.company_name.trim(),
    company_email: (input.company_email ?? current.company_email).trim(),
    portal_user: (input.portal_user ?? current.portal_user ?? "").trim().slice(0, 200),
    portal_pass: (input.portal_pass ?? current.portal_pass ?? "").slice(0, 200),
    scope: input.scope.trim(),
    registered_at: input.registered_at,
    validity_years: validity,
    expires_at: datesChanged ? expiryFromStandard(input.registered_at, input.standard, validity) : current.expires_at,
  };
  if (!changes.company_name || !changes.registration_code) throw new Error("INCOMPLETE");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(changes.registered_at) ||
      !Number.isFinite(Date.parse(changes.registered_at)) ||
      new Date(changes.registered_at).toISOString().slice(0, 10) !== changes.registered_at || !changes.expires_at) throw new Error("MISSING_DATES");
  return changes;
}

export function sameCertificateFields(a: CertificateChanges | Certificate, b: CertificateChanges | Certificate) {
  return certificateFields.every((field) => a[field] === b[field]);
}

export function needsCertificateApproval(item: Certificate) {
  return item.status === "draft" || Boolean(item.pending_changes) || !item.validity_confirmed;
}

/** Mask a stored credential before it is shown in a diff/review list. */
export function maskCredential(value: string) {
  const text = (value || "").trim();
  return text ? "\u2022".repeat(Math.min(text.length, 10)) : "";
}

/** Explicit public allowlist: never serialize pending edits, prices, contact details or
 *  customer portal credentials into the QR page. */
export function publicCertificate(item: Certificate) {
  return {
    public_code: item.public_code, certificate_no: item.certificate_no,
    standard: item.standard, registration_code: item.registration_code,
    duns_code: item.duns_code, us_agent: item.us_agent, company_name: item.company_name,
    scope: item.scope, registered_at: item.registered_at, expires_at: item.expires_at,
    validity_years: item.validity_years, validity_confirmed: item.validity_confirmed,
    status: item.status, renewal_count: item.renewal_count, last_renewed_at: item.last_renewed_at,
  };
}

/** Strictly monotonic even for two writes in the same millisecond. Used for optimistic locking. */
export function certificateUpdatedAt(current: Certificate) {
  return new Date(Math.max(Date.now(), (Date.parse(current.updated_at) || 0) + 1)).toISOString();
}

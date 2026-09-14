import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { hashPassword } from "./auth";
import { expiryFromStandard, randomCode, remainingDays, getValidityYears } from "./utils";
import type { Certificate, Role, Standard, User } from "./types";
import { DEFAULT_VALIDITY, isValidValidityYears } from "./types";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "vexim.db");

let singleton: DatabaseSync | null = null;

function openDb() {
  if (singleton) return singleton;
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  seed(db);
  singleton = db;
  return db;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','specialist')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_code TEXT NOT NULL UNIQUE,
      certificate_no TEXT NOT NULL UNIQUE,
      standard TEXT NOT NULL CHECK (standard IN ('FDA','GACC')),
      registration_code TEXT NOT NULL DEFAULT '',
      duns_code TEXT NOT NULL DEFAULT '',
      service_price INTEGER NOT NULL DEFAULT 0,
      company_name TEXT NOT NULL DEFAULT '',
      scope TEXT NOT NULL DEFAULT '',
      registered_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      validity_years INTEGER NOT NULL DEFAULT 2 CHECK (validity_years BETWEEN 1 AND 10),
      validity_confirmed INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','expired')),
      published_at TEXT,
      revenue_recorded INTEGER NOT NULL DEFAULT 0,
      renewal_count INTEGER NOT NULL DEFAULT 0,
      last_renewed_at TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration for old DBs
  try {
    const cols = db.prepare("PRAGMA table_info(certificates)").all() as Array<{ name: string }>;
    const has = (name: string) => cols.some((c) => c.name === name);

    if (!has("validity_years")) {
      db.exec("ALTER TABLE certificates ADD COLUMN validity_years INTEGER NOT NULL DEFAULT 2 CHECK (validity_years BETWEEN 1 AND 10)");
      db.exec("UPDATE certificates SET validity_years = 2 WHERE standard='FDA'");
      db.exec("UPDATE certificates SET validity_years = 5 WHERE standard='GACC'");
    }
    if (!has("duns_code")) {
      db.exec("ALTER TABLE certificates ADD COLUMN duns_code TEXT NOT NULL DEFAULT ''");
    }
    // Remove fda_registration_status if it exists (feature removed)
    if (has("fda_registration_status")) {
      try {
        // SQLite < 3.35 doesn't support DROP COLUMN easily, so we try; if fails, ignore and let hydrate handle
        db.exec("ALTER TABLE certificates DROP COLUMN fda_registration_status");
      } catch {
        // For older SQLite, just leave column - hydrate will ignore it
        console.warn("[migrate] fda_registration_status column exists but cannot drop in this SQLite version, ignoring");
      }
    }
  } catch (e) {
    console.warn("[migrate] Could not add columns:", e);
  }
}

function seed(db: DatabaseSync) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (count.c > 0) return;

  db.exec("BEGIN");
  try {
    const insertUser = db.prepare(
      "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)"
    );
    insertUser.run(
      "admin@veximglobal.com",
      "Administrator",
      hashPassword("Vexim@Admin2026"),
      "admin"
    );
    insertUser.run(
      "chuyenmon@veximglobal.com",
      "Documentation Specialist",
      hashPassword("Vexim@CM2026"),
      "specialist"
    );

    const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@veximglobal.com") as {
      id: number;
    };
    const spec = db.prepare("SELECT id FROM users WHERE email = ?").get(
      "chuyenmon@veximglobal.com"
    ) as { id: number };

    const samples: Array<{
      no: string;
      standard: Standard;
      code: string;
      duns: string;
      price: number;
      company: string;
      scope: string;
      registered: string;
      published: string;
      validity: number;
      by: number;
    }> = [
      {
        no: "VXM-FDA-2025-0001",
        standard: "FDA",
        code: "17823456789",
        duns: "12-345-6789",
        price: 18500000,
        company: "An Phat Food JSC",
        scope: "Food Facility Registration — frozen seafood processing for export to USA",
        registered: "2025-01-15",
        published: "2025-01-16",
        validity: 2,
        by: spec.id,
      },
      {
        no: "VXM-GACC-2024-0008",
        standard: "GACC",
        code: "VN-GACC-44012345678",
        duns: "98-765-4321",
        price: 42000000,
        company: "Mekong Agri Products Co., Ltd",
        scope: "Food enterprise registration for export to China (GACC Decree 248)",
        registered: "2024-03-20",
        published: "2024-03-22",
        validity: 5,
        by: spec.id,
      },
      {
        no: "VXM-FDA-2026-0004",
        standard: "FDA",
        code: "18900123456",
        duns: "11-222-3333",
        price: 21000000,
        company: "Green Leaf Cosmetics JSC",
        scope: "MoCRA facility registration & cosmetic product listing",
        registered: "2026-02-10",
        published: "2026-02-12",
        validity: 3,
        by: admin.id,
      },
      {
        no: "VXM-GACC-2026-0002",
        standard: "GACC",
        code: "VN-GACC-33098765432",
        duns: "44-555-6666",
        price: 38500000,
        company: "Viet Phat Rice JSC",
        scope: "Rice milling and packaging facility for export to China market",
        registered: "2026-06-01",
        published: "2026-06-03",
        validity: 5,
        by: spec.id,
      },
      {
        no: "VXM-FDA-2026-0012",
        standard: "FDA",
        code: "17200998877",
        duns: "77-888-9999",
        price: 16500000,
        company: "Binh Minh Seafood Co., Ltd",
        scope: "FDA Food Facility Registration — fresh and frozen seafood",
        registered: "2026-08-18",
        published: "2026-08-20",
        validity: 2,
        by: spec.id,
      },
    ];

    const insertCert = db.prepare(`
      INSERT INTO certificates (
        public_code, certificate_no, standard, registration_code, duns_code,
        service_price, company_name, scope, registered_at, expires_at, validity_years, validity_confirmed,
        status, published_at, revenue_recorded, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', ?, 1, ?)
    `);

    for (const s of samples) {
      insertCert.run(
        randomCode(12),
        s.no,
        s.standard,
        s.code,
        s.duns.replace(/\D/g, ""),
        s.price,
        s.company,
        s.scope,
        s.registered,
        expiryFromStandard(s.registered, s.standard, s.validity),
        s.validity,
        `${s.published} 09:30:00`,
        s.by
      );
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function db() {
  return openDb();
}

export function findUserByEmail(email: string) {
  return db()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as
    | (User & { password_hash: string })
    | undefined;
}

export function listUsers(): User[] {
  return (db()
    .prepare("SELECT id, email, name, role, created_at FROM users ORDER BY id")
    .all() as User[]).map(plain);
}

export function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: Role;
}) {
  const info = db()
    .prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(input.email.toLowerCase().trim(), input.name.trim(), hashPassword(input.password), input.role);
  return info.lastInsertRowid;
}

export function nextCertificateNo(standard: Standard) {
  const year = new Date().getFullYear();
  const prefix = `VXM-${standard}-${year}-`;
  const row = db()
    .prepare(
      "SELECT certificate_no FROM certificates WHERE certificate_no LIKE ? ORDER BY certificate_no DESC LIMIT 1"
    )
    .get(`${prefix}%`) as { certificate_no: string } | undefined;
  let seq = 1;
  if (row?.certificate_no) {
    const n = Number(row.certificate_no.split("-").pop());
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function plain<T>(row: T): T {
  if (row == null) return row;
  return JSON.parse(JSON.stringify(row));
}

function hydrate(row: Certificate): Certificate {
  if (!row) return row;
  const next = plain(row);
  if (!next.validity_years) {
    next.validity_years = getValidityYears(next as any);
  }
  if (!next.duns_code) next.duns_code = "";
  if (next.status === "published" && remainingDays(next.expires_at) < 0) {
    return { ...next, status: "expired" };
  }
  return next;
}

export function listCertificates(): Certificate[] {
  const rows = db()
    .prepare(
      `SELECT c.*, u.name AS created_by_name
       FROM certificates c
       LEFT JOIN users u ON u.id = c.created_by
       ORDER BY c.updated_at DESC, c.id DESC`
    )
    .all() as Certificate[];
  return rows.map(hydrate);
}

export function getCertificate(id: number) {
  const row = db()
    .prepare(
      `SELECT c.*, u.name AS created_by_name
       FROM certificates c
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.id = ?`
    )
    .get(id) as Certificate | undefined;
  return row ? hydrate(row) : undefined;
}

export function getCertificateByPublicCode(code: string) {
  const row = db()
    .prepare("SELECT * FROM certificates WHERE public_code = ?")
    .get(code.toUpperCase()) as Certificate | undefined;
  return row ? hydrate(row) : undefined;
}

function normalizeValidityYears(input: number | undefined, standard: Standard): number {
  if (input && isValidValidityYears(input)) return Math.round(input);
  return DEFAULT_VALIDITY[standard] ?? 2;
}

export function createCertificate(input: {
  standard: Standard;
  registration_code: string;
  duns_code?: string;
  service_price: number;
  company_name: string;
  scope: string;
  registered_at: string;
  validity_years?: number;
  created_by: number;
}) {
  const validity = normalizeValidityYears(input.validity_years, input.standard);
  const expires = expiryFromStandard(input.registered_at, input.standard, validity);
  const no = nextCertificateNo(input.standard);
  const publicCode = randomCode(12);
  const duns = (input.duns_code || "").replace(/\D/g, "").slice(0, 9);
  const info = db()
    .prepare(
      `INSERT INTO certificates (
        public_code, certificate_no, standard, registration_code, duns_code,
        service_price, company_name, scope, registered_at, expires_at, validity_years, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      publicCode,
      no,
      input.standard,
      input.registration_code.trim(),
      duns,
      Math.max(0, Math.round(input.service_price || 0)),
      input.company_name.trim(),
      input.scope.trim(),
      input.registered_at,
      expires,
      validity,
      input.created_by
    );
  return Number(info.lastInsertRowid);
}

export function updateCertificate(
  id: number,
  input: {
    standard: Standard;
    registration_code: string;
    duns_code?: string;
    service_price: number;
    company_name: string;
    scope: string;
    registered_at: string;
    validity_years?: number;
  }
) {
  const current = getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  const validity = normalizeValidityYears(input.validity_years ?? current.validity_years, input.standard);
  const expires = expiryFromStandard(input.registered_at, input.standard, validity);
  const duns = input.duns_code !== undefined ? input.duns_code.replace(/\D/g, "").slice(0, 9) : current.duns_code;
  db()
    .prepare(
      `UPDATE certificates SET
        standard = ?, registration_code = ?, duns_code = ?,
        service_price = ?, company_name = ?,
        scope = ?, registered_at = ?, expires_at = ?, validity_years = ?,
        validity_confirmed = CASE WHEN registered_at = ? AND standard = ? AND validity_years = ? THEN validity_confirmed ELSE 0 END,
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      input.standard,
      input.registration_code.trim(),
      duns,
      Math.max(0, Math.round(input.service_price || 0)),
      input.company_name.trim(),
      input.scope.trim(),
      input.registered_at,
      expires,
      validity,
      input.registered_at,
      input.standard,
      validity,
      id
    );
}

export function confirmValidity(id: number) {
  const current = getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (!current.registered_at || !current.expires_at) throw new Error("MISSING_DATES");
  db()
    .prepare(
      "UPDATE certificates SET validity_confirmed = 1, updated_at = datetime('now') WHERE id = ?"
    )
    .run(id);
}

export function publishCertificate(id: number) {
  const current = getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (!current.validity_confirmed) throw new Error("NOT_CONFIRMED");
  if (!current.company_name || !current.registration_code) throw new Error("INCOMPLETE");
  const already = current.revenue_recorded ? 1 : 1;
  db()
    .prepare(
      `UPDATE certificates SET
        status = 'published',
        published_at = COALESCE(published_at, datetime('now')),
        revenue_recorded = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(already, id);
  return getCertificate(id)!;
}

export function renewCertificate(id: number, extraFee = 0, renewalYears?: number) {
  const current = getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  // Renewal can be custom years (1-10) selected by user, otherwise follow current contract
  let validity: number;
  if (renewalYears && isValidValidityYears(renewalYears)) {
    validity = Math.round(renewalYears);
  } else {
    validity = getValidityYears(current);
  }
  const baseDate =
    remainingDays(current.expires_at) >= 0
      ? current.expires_at
      : new Date().toISOString().slice(0, 10);
  const nextExpiry = expiryFromStandard(baseDate, current.standard, validity);
  const extra = Math.max(0, Math.round(extraFee || 0));
  db()
    .prepare(
      `UPDATE certificates SET
        expires_at = ?,
        validity_years = ?,
        renewal_count = renewal_count + 1,
        last_renewed_at = datetime('now'),
        service_price = service_price + ?,
        status = 'published',
        validity_confirmed = 1,
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(nextExpiry, validity, extra, id);
  return getCertificate(id)!;
}

export function deleteCertificate(id: number) {
  const current = getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  if (current.status === "published" && current.revenue_recorded) {
    throw new Error("PUBLISHED");
  }
  db().prepare("DELETE FROM certificates WHERE id = ?").run(id);
}

export function revenueStats() {
  const rows = db()
    .prepare(
      `SELECT id, standard, service_price, published_at, registered_at, company_name, certificate_no, status
       FROM certificates
       WHERE revenue_recorded = 1 AND published_at IS NOT NULL`
    )
    .all() as Array<{
    id: number;
    standard: Standard;
    service_price: number;
    published_at: string;
    registered_at: string;
    company_name: string;
    certificate_no: string;
    status: string;
  }>;

  const monthMap = new Map<string, { month: string; FDA: number; GACC: number; total: number }>();
  const quarterMap = new Map<string, { quarter: string; FDA: number; GACC: number; total: number }>();
  const yearMap = new Map<string, { year: string; FDA: number; GACC: number; total: number }>();

  let total = 0;
  let fda = 0;
  let gacc = 0;

  for (const r of rows) {
    const d = new Date(r.published_at.replace(" ", "T"));
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const q = Math.floor((m - 1) / 3) + 1;
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const quarterKey = `${y}-Q${q}`;
    const yearKey = String(y);
    const amt = r.service_price || 0;
    total += amt;
    if (r.standard === "FDA") fda += amt;
    else gacc += amt;

    const bump = (map: Map<string, any>, key: string, labelKey: string) => {
      const cur = map.get(key) || { [labelKey]: key, FDA: 0, GACC: 0, total: 0 };
      cur[r.standard] = (cur[r.standard] || 0) + amt;
      cur.total = (cur.total || 0) + amt;
      map.set(key, cur);
    };
    bump(monthMap, monthKey, "month");
    bump(quarterMap, quarterKey, "quarter");
    bump(yearMap, yearKey, "year");
  }

  const months = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  const quarters = Array.from(quarterMap.values()).sort((a, b) => a.quarter.localeCompare(b.quarter));
  const years = Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year));

  return {
    total,
    fda,
    gacc,
    count: rows.length,
    months,
    quarters,
    years,
    recent: rows
      .slice()
      .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
      .slice(0, 8),
  };
}

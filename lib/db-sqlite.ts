import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { hashPassword } from "./auth";
import { seedCrm } from "./crm-sqlite";
import { bucketRevenue, expiryFromStandard, randomCode, remainingDays } from "./utils";
import type { Certificate, Role, Standard, User } from "./types";

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
  seedCrm(db);
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
      role TEXT NOT NULL CHECK (role IN ('admin','specialist','ae','sr','lr')),
      team_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_code TEXT NOT NULL UNIQUE,
      certificate_no TEXT NOT NULL UNIQUE,
      standard TEXT NOT NULL CHECK (standard IN ('FDA','GACC')),
      registration_code TEXT NOT NULL DEFAULT '',
      service_price INTEGER NOT NULL DEFAULT 0,
      company_name TEXT NOT NULL DEFAULT '',
      scope TEXT NOT NULL DEFAULT '',
      registered_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
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

  migrateUsersForCrm(db);
  migrateCrm(db);
}

/**
 * Nâng cấp bảng users cho CRM:
 *  - thêm cột team_id
 *  - mở rộng CHECK của role sang 5 vai trò (admin, specialist, ae, sr, lr)
 * SQLite không sửa được CHECK nên phải rebuild bảng, giữ nguyên id và dữ liệu cũ.
 */
function migrateUsersForCrm(db: DatabaseSync) {
  const cols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const names = cols.map((c) => c.name);
  if (!names.includes("team_id")) {
    db.exec("ALTER TABLE users ADD COLUMN team_id INTEGER");
  }
  const ddl = String(
    (db.prepare("SELECT sql AS sql FROM sqlite_master WHERE type='table' AND name='users'").get() as {
      sql: string;
    }).sql || ""
  );
  if (ddl.includes("'lr'")) return;

  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("BEGIN;");
  try {
    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin','specialist','ae','sr','lr')),
        team_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO users_new (id, email, name, password_hash, role, team_id, created_at)
        SELECT id, email, name, password_hash, role, team_id, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);
    db.exec("COMMIT;");
  } catch (e) {
    db.exec("ROLLBACK;");
    throw e;
  }
  db.exec("PRAGMA foreign_keys = ON;");
}

/** Các bảng của VEXIM CRM: lead → opportunity → customer. */
function migrateCrm(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      ae_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL DEFAULT '',
      contact_title TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      employee_size TEXT NOT NULL DEFAULT '',
      annual_revenue TEXT NOT NULL DEFAULT '',
      main_products TEXT NOT NULL DEFAULT '',
      target_market TEXT NOT NULL DEFAULT '',
      current_standards TEXT NOT NULL DEFAULT '',
      pain_points TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'other',
      source_detail TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new','contacted','qualified','unqualified','converted')),
      quality_score INTEGER NOT NULL DEFAULT 0,
      owner_id INTEGER REFERENCES users(id),
      team_id INTEGER,
      assigned_at TEXT,
      last_activity_at TEXT,
      converted_opportunity_id INTEGER,
      certificate_id INTEGER REFERENCES certificates(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      lead_id INTEGER REFERENCES crm_leads(id) ON DELETE SET NULL,
      company_name TEXT NOT NULL,
      standard TEXT CHECK (standard IN ('FDA','GACC')),
      stage TEXT NOT NULL DEFAULT 'contacted'
        CHECK (stage IN ('contacted','qualified','proposal','negotiation','won','lost')),
      stage_entered_at TEXT NOT NULL DEFAULT (datetime('now')),
      stage_changed_by INTEGER REFERENCES users(id),
      value INTEGER NOT NULL DEFAULT 0,
      probability INTEGER NOT NULL DEFAULT 20,
      currency TEXT NOT NULL DEFAULT 'VND',
      owner_id INTEGER REFERENCES users(id),
      team_id INTEGER,
      expected_close_date TEXT,
      closed_at TEXT,
      lost_reason TEXT NOT NULL DEFAULT '',
      next_action TEXT NOT NULL DEFAULT '',
      next_action_due TEXT,
      next_action_owner_id INTEGER REFERENCES users(id),
      last_activity_at TEXT,
      certificate_id INTEGER REFERENCES certificates(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER REFERENCES crm_leads(id) ON DELETE CASCADE,
      opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'note',
      subject TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      performed_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER NOT NULL REFERENCES users(id),
      is_follow_up INTEGER NOT NULL DEFAULT 0,
      due_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS crm_stage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      from_stage TEXT,
      to_stage TEXT NOT NULL,
      changed_by INTEGER REFERENCES users(id),
      note TEXT NOT NULL DEFAULT '',
      changed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS crm_leads_owner_idx ON crm_leads(owner_id);
    CREATE INDEX IF NOT EXISTS crm_leads_team_idx ON crm_leads(team_id);
    CREATE INDEX IF NOT EXISTS crm_leads_status_idx ON crm_leads(status);
    CREATE INDEX IF NOT EXISTS crm_opps_owner_idx ON crm_opportunities(owner_id);
    CREATE INDEX IF NOT EXISTS crm_opps_team_idx ON crm_opportunities(team_id);
    CREATE INDEX IF NOT EXISTS crm_opps_stage_idx ON crm_opportunities(stage);
    CREATE INDEX IF NOT EXISTS crm_activities_opp_idx ON crm_activities(opportunity_id);
    CREATE INDEX IF NOT EXISTS crm_activities_lead_idx ON crm_activities(lead_id);
    CREATE INDEX IF NOT EXISTS crm_stage_events_opp_idx ON crm_stage_events(opportunity_id);
  `);
}

function seed(db: DatabaseSync) {
  if (process.env.VEXIM_DISABLE_DEMO_SEED === "1") return;
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (count.c > 0) return;

  db.exec("BEGIN");
  try {
    const insertUser = db.prepare(
      "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)"
    );
    insertUser.run(
      "admin@veximglobal.com",
      "Quản trị viên",
      hashPassword("Vexim@Admin2026"),
      "admin"
    );
    insertUser.run(
      "chuyenmon@veximglobal.com",
      "Chuyên viên hồ sơ",
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
      price: number;
      company: string;
      scope: string;
      registered: string;
      published: string;
      by: number;
    }> = [
      {
        no: "VXM-FDA-2025-0001",
        standard: "FDA",
        code: "17823456789",
        price: 18500000,
        company: "Công ty CP Thực phẩm An Phát",
        scope: "Food Facility Registration — chế biến thủy sản đông lạnh xuất khẩu sang Hoa Kỳ",
        registered: "2025-01-15",
        published: "2025-01-16",
        by: spec.id,
      },
      {
        no: "VXM-GACC-2024-0008",
        standard: "GACC",
        code: "VN-GACC-44012345678",
        price: 42000000,
        company: "Công ty TNHH Nông sản Mekong",
        scope: "Đăng ký doanh nghiệp sản xuất thực phẩm xuất khẩu vào Trung Quốc (GACC Decree 248)",
        registered: "2024-03-20",
        published: "2024-03-22",
        by: spec.id,
      },
      {
        no: "VXM-FDA-2026-0004",
        standard: "FDA",
        code: "18900123456",
        price: 21000000,
        company: "Green Leaf Cosmetics JSC",
        scope: "MoCRA facility registration & cosmetic product listing",
        registered: "2026-02-10",
        published: "2026-02-12",
        by: admin.id,
      },
      {
        no: "VXM-GACC-2026-0002",
        standard: "GACC",
        code: "VN-GACC-33098765432",
        price: 38500000,
        company: "Công ty CP Gạo Việt Phát",
        scope: "Cơ sở xay xát, đóng gói gạo xuất khẩu sang thị trường Trung Quốc",
        registered: "2026-06-01",
        published: "2026-06-03",
        by: spec.id,
      },
      {
        no: "VXM-FDA-2026-0012",
        standard: "FDA",
        code: "17200998877",
        price: 16500000,
        company: "Công ty TNHH Hải sản Bình Minh",
        scope: "FDA Food Facility Registration — thủy sản tươi sống và đông lạnh",
        registered: "2026-08-18",
        published: "2026-08-20",
        by: spec.id,
      },
    ];

    const insertCert = db.prepare(`
      INSERT INTO certificates (
        public_code, certificate_no, standard, registration_code, service_price,
        company_name, scope, registered_at, expires_at, validity_confirmed,
        status, published_at, revenue_recorded, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', ?, 1, ?)
    `);

    for (const s of samples) {
      insertCert.run(
        randomCode(12),
        s.no,
        s.standard,
        s.code,
        s.price,
        s.company,
        s.scope,
        s.registered,
        expiryFromStandard(s.registered, s.standard),
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
    .prepare("SELECT id, email, name, role, team_id, created_at FROM users ORDER BY id")
    .all() as User[]).map(plain);
}

export function createUser(input: {
  email: string;
  name: string;
  password: string;
  role: Role;
  team_id?: number | null;
}) {
  const info = db()
    .prepare("INSERT INTO users (email, name, password_hash, role, team_id) VALUES (?, ?, ?, ?, ?)")
    .run(
      input.email.toLowerCase().trim(),
      input.name.trim(),
      hashPassword(input.password),
      input.role,
      input.team_id ?? null
    );
  return info.lastInsertRowid;
}

export function updateUserTeam(userId: number, teamId: number | null) {
  db().prepare("UPDATE users SET team_id = ? WHERE id = ?").run(teamId, userId);
}

export function updateUserRole(userId: number, role: Role) {
  db().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
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

export function createCertificate(input: {
  standard: Standard;
  registration_code: string;
  service_price: number;
  company_name: string;
  scope: string;
  registered_at: string;
  created_by: number;
}) {
  const expires = expiryFromStandard(input.registered_at, input.standard);
  const no = nextCertificateNo(input.standard);
  const publicCode = randomCode(12);
  const info = db()
    .prepare(
      `INSERT INTO certificates (
        public_code, certificate_no, standard, registration_code, service_price,
        company_name, scope, registered_at, expires_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      publicCode,
      no,
      input.standard,
      input.registration_code.trim(),
      Math.max(0, Math.round(input.service_price || 0)),
      input.company_name.trim(),
      input.scope.trim(),
      input.registered_at,
      expires,
      input.created_by
    );
  return Number(info.lastInsertRowid);
}

export function updateCertificate(
  id: number,
  input: {
    standard: Standard;
    registration_code: string;
    service_price: number;
    company_name: string;
    scope: string;
    registered_at: string;
  }
) {
  const current = getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  const expires = expiryFromStandard(input.registered_at, input.standard);
  db()
    .prepare(
      `UPDATE certificates SET
        standard = ?, registration_code = ?, service_price = ?, company_name = ?,
        scope = ?, registered_at = ?, expires_at = ?,
        validity_confirmed = CASE WHEN registered_at = ? AND standard = ? THEN validity_confirmed ELSE 0 END,
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      input.standard,
      input.registration_code.trim(),
      Math.max(0, Math.round(input.service_price || 0)),
      input.company_name.trim(),
      input.scope.trim(),
      input.registered_at,
      expires,
      input.registered_at,
      input.standard,
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

export function renewCertificate(id: number, extraFee = 0) {
  const current = getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  const nextExpiry = expiryFromStandard(
    remainingDays(current.expires_at) >= 0 ? current.expires_at : new Date().toISOString().slice(0, 10),
    current.standard
  );
  const extra = Math.max(0, Math.round(extraFee || 0));
  db()
    .prepare(
      `UPDATE certificates SET
        expires_at = ?,
        renewal_count = renewal_count + 1,
        last_renewed_at = datetime('now'),
        service_price = service_price + ?,
        status = 'published',
        validity_confirmed = 1,
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(nextExpiry, extra, id);
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
  return bucketRevenue(rows);
}

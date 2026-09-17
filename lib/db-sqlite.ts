import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { hashPassword } from "./auth";
import { expiryFromStandard, randomCode, remainingDays, getValidityYears, todayUtcIso } from "./utils";
import type { Certificate, Role, Standard, User } from "./types";
import { DEFAULT_VALIDITY, isValidValidityYears, GACC_FIXED_YEARS, isValidValidityYearsForStandard } from "./types";
import {
  PIPELINE_DEFS,
  enrichOpportunity,
  validateTransition,
  type CrmActivity,
  type CrmChecklistState,
  type CrmOpportunity,
  type CrmOpportunityEnriched,
  type CrmPipeline,
  type CrmStage,
  type CrmStageHistory,
} from "./crm-types";

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
  ensureCrmPipelines(db);
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
      us_agent TEXT NOT NULL DEFAULT '',
      service_price INTEGER NOT NULL DEFAULT 0,
      company_name TEXT NOT NULL DEFAULT '',
      company_email TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS consultation_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_type TEXT NOT NULL CHECK (service_type IN ('sales','amazon')),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      company_name TEXT NOT NULL DEFAULT '',
      certificate_no TEXT NOT NULL DEFAULT '',
      public_code TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      tax_code TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      contact_person TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expiry_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      certificate_id INTEGER NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL DEFAULT '',
      notification_type TEXT NOT NULL CHECK (notification_type IN ('90_days','60_days','30_days','14_days','7_days','3_days','1_day','expired','renewal_reminder')),
      recipient_email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed')),
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_pipelines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      service TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pipeline_id INTEGER NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#64748b',
      sla_days INTEGER NOT NULL DEFAULT 0,
      exit_criteria TEXT NOT NULL DEFAULT '[]',
      is_won INTEGER NOT NULL DEFAULT 0,
      is_lost INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (pipeline_id, key)
    );

    CREATE TABLE IF NOT EXISTS crm_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pipeline_id INTEGER NOT NULL REFERENCES crm_pipelines(id),
      stage_id INTEGER NOT NULL REFERENCES crm_stages(id),
      title TEXT NOT NULL DEFAULT '',
      company_name TEXT NOT NULL DEFAULT '',
      contact_name TEXT NOT NULL DEFAULT '',
      contact_phone TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      estimated_value INTEGER NOT NULL DEFAULT 0,
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      next_action TEXT NOT NULL DEFAULT '',
      next_action_date TEXT,
      stage_entered_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_activity_at TEXT,
      expected_close_date TEXT,
      lost_reason TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_stage_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      from_stage_id INTEGER REFERENCES crm_stages(id) ON DELETE SET NULL,
      to_stage_id INTEGER NOT NULL REFERENCES crm_stages(id),
      duration_days REAL NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'note',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      outcome TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crm_checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      stage_key TEXT NOT NULL DEFAULT '',
      criterion_key TEXT NOT NULL DEFAULT '',
      is_checked INTEGER NOT NULL DEFAULT 0,
      checked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      checked_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (opportunity_id, stage_key, criterion_key)
    );

    CREATE INDEX IF NOT EXISTS crm_stages_pipeline_idx ON crm_stages (pipeline_id, sort_order);
    CREATE INDEX IF NOT EXISTS crm_opportunities_pipeline_stage_idx ON crm_opportunities (pipeline_id, stage_id);
    CREATE INDEX IF NOT EXISTS crm_opportunities_owner_idx ON crm_opportunities (owner_id);
    CREATE INDEX IF NOT EXISTS crm_opportunities_next_action_idx ON crm_opportunities (next_action_date);
    CREATE INDEX IF NOT EXISTS crm_history_opp_idx ON crm_stage_history (opportunity_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS crm_activities_opp_idx ON crm_activities (opportunity_id, created_at DESC);
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
    if (!has("us_agent")) {
      db.exec("ALTER TABLE certificates ADD COLUMN us_agent TEXT NOT NULL DEFAULT ''");
    }
    if (!has("company_email")) {
      db.exec("ALTER TABLE certificates ADD COLUMN company_email TEXT NOT NULL DEFAULT ''");
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
      us_agent: string;
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
        us_agent: "Vexim Global LLC",
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
        duns: "",
        us_agent: "",
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
        us_agent: "Vexim Global LLC",
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
        duns: "",
        us_agent: "",
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
        us_agent: "Vexim Global LLC",
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
        public_code, certificate_no, standard, registration_code, duns_code, us_agent,
        service_price, company_name, scope, registered_at, expires_at, validity_years, validity_confirmed,
        status, published_at, revenue_recorded, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'published', ?, 1, ?)
    `);

    for (const s of samples) {
      insertCert.run(
        randomCode(12),
        s.no,
        s.standard,
        s.code,
        s.duns.replace(/\D/g, ""),
        s.us_agent,
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
    // CRM pipelines + demo opportunities (fresh DB only)
    ensureCrmPipelines(db);
    seedCrmDemo(db, admin.id, spec.id);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

function nowSql(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function dateShiftSql(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function dateShiftIso(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

/** Upsert pipelines/stages từ PIPELINE_DEFS — chạy mỗi lần mở DB để đồng bộ SLA/tên mới. */
function ensureCrmPipelines(db: DatabaseSync) {
  const upsertPipe = db.prepare(`
    INSERT INTO crm_pipelines (key, name, service, description, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET name=excluded.name, service=excluded.service,
      description=excluded.description, sort_order=excluded.sort_order, updated_at=excluded.updated_at
  `);
  const upsertStage = db.prepare(`
    INSERT INTO crm_stages (pipeline_id, key, name, sort_order, color, sla_days, exit_criteria, is_won, is_lost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(pipeline_id, key) DO UPDATE SET name=excluded.name, sort_order=excluded.sort_order,
      color=excluded.color, sla_days=excluded.sla_days, exit_criteria=excluded.exit_criteria,
      is_won=excluded.is_won, is_lost=excluded.is_lost
  `);
  const getPipe = db.prepare("SELECT id FROM crm_pipelines WHERE key = ?");
  for (const def of PIPELINE_DEFS) {
    upsertPipe.run(def.key, def.name, def.service, def.description, def.sort_order, nowSql());
    const row = getPipe.get(def.key) as { id: number };
    def.stages.forEach((s, idx) => {
      upsertStage.run(
        row.id, s.key, s.name, idx, s.color, s.sla_days,
        JSON.stringify(s.exit_criteria), s.is_won ? 1 : 0, s.is_lost ? 1 : 0
      );
    });
  }
}

/** Dữ liệu demo CRM — ngày tháng tương đối so với "hôm nay" để demo luôn sống động. */
function seedCrmDemo(db: DatabaseSync, adminId: number, specId: number) {
  const existing = db.prepare("SELECT COUNT(*) AS c FROM crm_opportunities").get() as { c: number };
  if (existing.c > 0) return;

  const getStage = db.prepare(`
    SELECT s.id AS stage_id, s.pipeline_id FROM crm_stages s
    JOIN crm_pipelines p ON p.id = s.pipeline_id
    WHERE p.key = ? AND s.key = ?
  `);
  const insertOpp = db.prepare(`
    INSERT INTO crm_opportunities (
      pipeline_id, stage_id, title, company_name, contact_name, contact_phone, contact_email,
      industry, source, estimated_value, owner_id, next_action, next_action_date,
      stage_entered_at, last_activity_at, expected_close_date, lost_reason, notes,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertHist = db.prepare(`
    INSERT INTO crm_stage_history (opportunity_id, from_stage_id, to_stage_id, duration_days, note, changed_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAct = db.prepare(`
    INSERT INTO crm_activities (opportunity_id, type, title, content, outcome, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  type Demo = {
    pipe: string; stage: string; company: string; contact: string; phone: string;
    industry: string; source: string; value: number; owner: number;
    enteredDaysAgo: number; lastActDaysAgo: number | null;
    next: string; nextDate: number | null; closeIn: number | null;
    lost?: string; notes: string; hist: Array<{ daysAgo: number; dur: number; note: string }>;
    acts: Array<{ daysAgo: number; type: string; title: string; content: string; outcome: string }>;
  };
  const demos: Demo[] = [
    {
      pipe: "FDA", stage: "da_gui_bao_gia", company: "Công ty CP Thực phẩm Sông Hồng",
      contact: "Chị Lan — Giám đốc", phone: "0912 345 678", industry: "Thực phẩm",
      source: "Website", value: 22000000, owner: specId,
      enteredDaysAgo: 12, lastActDaysAgo: 12,
      next: "Gọi lại xác nhận quyết định", nextDate: 3, closeIn: 20,
      notes: "Khách xuất hàng đông lạnh sang Mỹ, cần FDA gấp trong Q4.",
      hist: [
        { daysAgo: 20, dur: 0, note: "Tạo cơ hội từ website" },
        { daysAgo: 17, dur: 3, note: "Đã xác nhận nhu cầu" },
        { daysAgo: 12, dur: 5, note: "Đã gửi báo giá 22tr qua Zalo" },
      ],
      acts: [
        { daysAgo: 12, type: "quote", title: "Gửi báo giá FDA 2 năm", content: "Báo giá 22.000.000đ, khách hẹn 1 tuần phản hồi.", outcome: "Chờ phản hồi" },
      ],
    },
    {
      pipe: "FDA", stage: "da_tu_van", company: "Minh Khang Seafood",
      contact: "Anh Tuấn", phone: "0987 654 321", industry: "Thủy sản",
      source: "Zalo", value: 18500000, owner: specId,
      enteredDaysAgo: 2, lastActDaysAgo: 1,
      next: "Gửi báo giá chính thức", nextDate: 1, closeIn: 25,
      notes: "Xưởng chế biến tôm đông lạnh, lần đầu làm FDA.",
      hist: [
        { daysAgo: 6, dur: 0, note: "Lead từ Zalo OA" },
        { daysAgo: 2, dur: 4, note: "Đã tư vấn phương án + lộ trình" },
      ],
      acts: [
        { daysAgo: 1, type: "call", title: "Tư vấn lần 2", content: "Giải thích DUNS + US Agent, khách đồng ý nhận báo giá.", outcome: "Tích cực" },
      ],
    },
    {
      pipe: "FDA", stage: "lead_moi", company: "Green Farm Đà Lạt",
      contact: "Chị Hương", phone: "0905 111 222", industry: "Nông sản",
      source: "Facebook", value: 0, owner: specId,
      enteredDaysAgo: 1, lastActDaysAgo: null,
      next: "", nextDate: null, closeIn: null,
      notes: "Inbox hỏi thủ tục FDA cho rau củ sấy.",
      hist: [{ daysAgo: 1, dur: 0, note: "Lead mới từ Facebook" }],
      acts: [],
    },
    {
      pipe: "GACC", stage: "dang_can_nhac", company: "Viet Phat Rice JSC",
      contact: "Anh Dũng — PGĐ", phone: "0938 777 888", industry: "Nông sản",
      source: "Giới thiệu", value: 42000000, owner: adminId,
      enteredDaysAgo: 20, lastActDaysAgo: 16,
      next: "Gọi lại hỏi tiến độ nội bộ", nextDate: -2, closeIn: 30,
      notes: "Xuất gạo sang Trung Quốc, hồ sơ lớn.",
      hist: [
        { daysAgo: 45, dur: 0, note: "Được đối tác giới thiệu" },
        { daysAgo: 30, dur: 15, note: "Đã tư vấn hồ sơ GACC" },
        { daysAgo: 20, dur: 10, note: "Gửi báo giá 42tr, khách cân nhắc" },
      ],
      acts: [
        { daysAgo: 16, type: "meeting", title: "Gặp trực tiếp tại VP khách", content: "Khách còn lăn tăn thời gian triển khai.", outcome: "Cần follow-up" },
      ],
    },
    {
      pipe: "SALE_EXPORT", stage: "khao_sat_nhu_cau", company: "An Phat Food JSC",
      contact: "Chị Mai", phone: "0971 222 333", industry: "Thực phẩm",
      source: "Lead tư vấn", value: 60000000, owner: specId,
      enteredDaysAgo: 3, lastActDaysAgo: 3,
      next: "Khảo sát năng lực sản xuất", nextDate: -1, closeIn: 45,
      notes: "Muốn đưa miến dong sang thị trường Mỹ.",
      hist: [
        { daysAgo: 8, dur: 0, note: "Lead tư vấn từ trang verify" },
        { daysAgo: 3, dur: 5, note: "Bắt đầu khảo sát nhu cầu" },
      ],
      acts: [
        { daysAgo: 3, type: "call", title: "Gọi khảo sát sơ bộ", content: "Khách có nhà máy, công suất tốt.", outcome: "Đạt, hẹn khảo sát chi tiết" },
      ],
    },
    {
      pipe: "FDA", stage: "da_ky_hop_dong", company: "Binh Minh Seafood Co., Ltd",
      contact: "Anh Hải", phone: "0919 444 555", industry: "Thủy sản",
      source: "Website", value: 18500000, owner: specId,
      enteredDaysAgo: 5, lastActDaysAgo: 5,
      next: "", nextDate: null, closeIn: null,
      notes: "Đã ký HĐ FDA 2 năm, chuyển sang triển khai hồ sơ.",
      hist: [
        { daysAgo: 28, dur: 0, note: "Tạo cơ hội" },
        { daysAgo: 18, dur: 10, note: "Đã tư vấn" },
        { daysAgo: 10, dur: 8, note: "Đã gửi báo giá" },
        { daysAgo: 5, dur: 5, note: "Khách ký hợp đồng" },
      ],
      acts: [
        { daysAgo: 5, type: "note", title: "Ký hợp đồng", content: "HĐ số VXM-HĐ-2026-031, thu cọc 50%.", outcome: "Won" },
      ],
    },
    {
      pipe: "GACC", stage: "khong_phu_hop", company: "Test Trading Co.",
      contact: "Anh Nam", phone: "0900 000 111", industry: "Khác",
      source: "Telesale", value: 0, owner: specId,
      enteredDaysAgo: 9, lastActDaysAgo: 9,
      next: "", nextDate: null, closeIn: null, lost: "Giá cao / không đủ ngân sách",
      notes: "Khách chỉ tham khảo giá.",
      hist: [
        { daysAgo: 12, dur: 0, note: "Telesale" },
        { daysAgo: 9, dur: 3, note: "Đóng: giá cao" },
      ],
      acts: [],
    },
    {
      pipe: "AMAZON_OPS", stage: "de_xuat_phuong_an", company: "Hanoi Handicraft",
      contact: "Chị Thu", phone: "0982 333 444", industry: "Đồ gỗ / Nội thất",
      source: "Hội chợ / Sự kiện", value: 85000000, owner: adminId,
      enteredDaysAgo: 2, lastActDaysAgo: 0,
      next: "Gửi proposal vận hành 6 tháng", nextDate: 2, closeIn: 40,
      notes: "Đồ mây tre đan, tiềm năng Amazon Handmade.",
      hist: [
        { daysAgo: 10, dur: 0, note: "Gặp tại hội chợ" },
        { daysAgo: 6, dur: 4, note: "Đã audit sản phẩm" },
        { daysAgo: 2, dur: 4, note: "Đang soạn proposal" },
      ],
      acts: [
        { daysAgo: 0, type: "email", title: "Gửi audit sơ bộ", content: "Khách phản hồi tích cực, chờ proposal chi tiết.", outcome: "Tích cực" },
      ],
    },
  ];

  for (const d of demos) {
    const st = getStage.get(d.pipe, d.stage) as { stage_id: number; pipeline_id: number };
    if (!st) continue;
    const info = insertOpp.run(
      st.pipeline_id, st.stage_id, `${d.company} — ${d.pipe}`, d.company, d.contact, d.phone, "",
      d.industry, d.source, d.value, d.owner, d.next,
      d.nextDate === null ? null : dateShiftIso(d.nextDate),
      dateShiftSql(-d.enteredDaysAgo),
      d.lastActDaysAgo === null ? null : dateShiftSql(-d.lastActDaysAgo),
      d.closeIn === null ? null : dateShiftIso(d.closeIn),
      d.lost || "", d.notes, d.owner,
      dateShiftSql(-(d.enteredDaysAgo + 2)), nowSql()
    );
    const oppId = Number(info.lastInsertRowid);
    const stages = db.prepare("SELECT id FROM crm_stages WHERE pipeline_id = ? ORDER BY sort_order").all(st.pipeline_id) as Array<{ id: number }>;
    d.hist.forEach((h, i) => {
      insertHist.run(oppId, i === 0 ? null : stages[Math.min(i - 1, stages.length - 1)].id, stages[Math.min(i, stages.length - 1)].id, h.dur, h.note, d.owner, dateShiftSql(-h.daysAgo));
    });
    // fix: last history target = actual current stage
    db.prepare("UPDATE crm_stage_history SET to_stage_id = ? WHERE opportunity_id = ? AND id = (SELECT MAX(id) FROM crm_stage_history WHERE opportunity_id = ?)").run(st.stage_id, oppId, oppId);
    for (const a of d.acts) {
      insertAct.run(oppId, a.type, a.title, a.content, a.outcome, d.owner, dateShiftSql(-a.daysAgo));
    }
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
  if (!next.us_agent) next.us_agent = "";
  if (!next.company_email) next.company_email = "";
  // GACC does not have DUNS or US Agent - clear if present
  if (next.standard === "GACC") {
    next.duns_code = "";
    next.us_agent = "";
  }
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
  if (standard === "GACC") return GACC_FIXED_YEARS;
  if (input && isValidValidityYears(input)) return Math.round(input);
  return DEFAULT_VALIDITY[standard] ?? 2;
}

export function createCertificate(input: {
  standard: Standard;
  registration_code: string;
  duns_code?: string;
  us_agent?: string;
  service_price: number;
  company_name: string;
  company_email?: string;
  scope: string;
  registered_at: string;
  validity_years?: number;
  created_by: number;
}) {
  const validity = normalizeValidityYears(input.validity_years, input.standard);
  const expires = expiryFromStandard(input.registered_at, input.standard, validity);
  const no = nextCertificateNo(input.standard);
  const publicCode = randomCode(12);
  // DUNS and US Agent only for FDA, GACC has none
  const isGacc = input.standard === "GACC";
  const duns = isGacc ? "" : (input.duns_code || "").replace(/\D/g, "").slice(0, 9);
  const usAgent = isGacc ? "" : (input.us_agent || "").trim().slice(0, 200);
  const info = db()
    .prepare(
      `INSERT INTO certificates (
        public_code, certificate_no, standard, registration_code, duns_code, us_agent,
        service_price, company_name, company_email, scope, registered_at, expires_at, validity_years, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      publicCode,
      no,
      input.standard,
      input.registration_code.trim(),
      duns,
      usAgent,
      Math.max(0, Math.round(input.service_price || 0)),
      input.company_name.trim(),
      (input.company_email || "").trim(),
      input.scope.trim(),
      input.registered_at,
      expires,
      validity,
      input.created_by
    );

  // Sync to companies table for official DB
  try {
    const existing = getCompanyByName(input.company_name.trim());
    if (!existing && input.company_name.trim()) {
      createCompany({
        company_name: input.company_name.trim(),
        email: (input.company_email || "").trim(),
      });
    } else if (existing && input.company_email?.trim()) {
      // Update email if provided and different
      if (!existing.email || existing.email !== input.company_email.trim()) {
        updateCompany(existing.id, {
          company_name: existing.company_name,
          email: input.company_email.trim() || existing.email,
          phone: existing.phone,
          tax_code: existing.tax_code,
          address: existing.address,
          contact_person: existing.contact_person,
          notes: existing.notes,
        });
      }
    }
  } catch {}

  return Number(info.lastInsertRowid);
}

export function updateCertificate(
  id: number,
  input: {
    standard: Standard;
    registration_code: string;
    duns_code?: string;
    us_agent?: string;
    service_price: number;
    company_name: string;
    company_email?: string;
    scope: string;
    registered_at: string;
    validity_years?: number;
  }
) {
  const current = getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  const validity = normalizeValidityYears(input.validity_years ?? current.validity_years, input.standard);
  const expires = expiryFromStandard(input.registered_at, input.standard, validity);
  const isGacc = input.standard === "GACC";
  const duns = isGacc ? "" : input.duns_code !== undefined ? input.duns_code.replace(/\D/g, "").slice(0, 9) : current.duns_code;
  const usAgent = isGacc ? "" : input.us_agent !== undefined ? input.us_agent.trim().slice(0, 200) : current.us_agent;
  const companyEmail = input.company_email !== undefined ? input.company_email.trim() : current.company_email || "";
  db()
    .prepare(
      `UPDATE certificates SET
        standard = ?, registration_code = ?, duns_code = ?, us_agent = ?,
        service_price = ?, company_name = ?, company_email = ?,
        scope = ?, registered_at = ?, expires_at = ?, validity_years = ?,
        validity_confirmed = CASE WHEN registered_at = ? AND standard = ? AND validity_years = ? THEN validity_confirmed ELSE 0 END,
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      input.standard,
      input.registration_code.trim(),
      duns,
      usAgent,
      Math.max(0, Math.round(input.service_price || 0)),
      input.company_name.trim(),
      companyEmail,
      input.scope.trim(),
      input.registered_at,
      expires,
      validity,
      input.registered_at,
      input.standard,
      validity,
      id
    );

  // Sync to companies
  try {
    const existing = getCompanyByName(input.company_name.trim());
    if (!existing && input.company_name.trim()) {
      createCompany({
        company_name: input.company_name.trim(),
        email: companyEmail,
      });
    } else if (existing && companyEmail) {
      updateCompany(existing.id, {
        company_name: existing.company_name,
        email: companyEmail || existing.email,
        phone: existing.phone,
        tax_code: existing.tax_code,
        address: existing.address,
        contact_person: existing.contact_person,
        notes: existing.notes,
      });
    }
  } catch {}
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
  if (!current.company_name || !current.registration_code) throw new Error("INCOMPLETE");
  // Recalculate expiry to ensure 1-year and other durations are correct (fix old buggy data)
  const fixedExpiry = expiryFromStandard(current.registered_at, current.standard, current.validity_years);
  db()
    .prepare(
      `UPDATE certificates SET
        status = 'published',
        validity_confirmed = 1,
        expires_at = ?,
        published_at = COALESCE(published_at, datetime('now')),
        revenue_recorded = 1,
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(fixedExpiry, id);
  return getCertificate(id)!;
}

export function renewCertificate(id: number, extraFee = 0, renewalYears?: number) {
  const current = getCertificate(id);
  if (!current) throw new Error("NOT_FOUND");
  // FDA flexible 1-10, GACC fixed 5
  let validity: number;
  if (current.standard === "GACC") {
    validity = GACC_FIXED_YEARS;
  } else if (renewalYears && isValidValidityYearsForStandard(renewalYears, current.standard)) {
    validity = Math.round(renewalYears);
  } else {
    validity = getValidityYears(current);
  }
  const baseDate =
    remainingDays(current.expires_at) >= 0
      ? current.expires_at
      : todayUtcIso();
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

export type ConsultationLead = {
  id: number;
  service_type: "sales" | "amazon";
  name: string;
  phone: string;
  email: string;
  company_name: string;
  certificate_no: string;
  public_code: string;
  message: string;
  source_url: string;
  ip: string;
  status: "new" | "contacted" | "converted" | "closed";
  created_at: string;
  updated_at: string;
};

export function createLead(input: {
  service_type: "sales" | "amazon";
  name: string;
  phone: string;
  email?: string;
  company_name?: string;
  certificate_no?: string;
  public_code?: string;
  message?: string;
  source_url?: string;
  ip?: string;
}) {
  const info = db()
    .prepare(
      `INSERT INTO consultation_leads (service_type, name, phone, email, company_name, certificate_no, public_code, message, source_url, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.service_type,
      input.name.trim(),
      input.phone.trim(),
      (input.email || "").trim(),
      (input.company_name || "").trim(),
      (input.certificate_no || "").trim(),
      (input.public_code || "").trim(),
      (input.message || "").trim(),
      (input.source_url || "").trim(),
      (input.ip || "").trim()
    );
  return Number(info.lastInsertRowid);
}

export function listLeads(): ConsultationLead[] {
  return plain(
    db()
      .prepare(`SELECT * FROM consultation_leads ORDER BY created_at DESC, id DESC`)
      .all()
  ) as ConsultationLead[];
}

export function getLead(id: number) {
  return plain(
    db().prepare(`SELECT * FROM consultation_leads WHERE id = ?`).get(id)
  ) as ConsultationLead | undefined;
}

export function updateLeadStatus(id: number, status: ConsultationLead["status"]) {
  db().prepare(`UPDATE consultation_leads SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
}

export function deleteLead(id: number) {
  db().prepare(`DELETE FROM consultation_leads WHERE id = ?`).run(id);
}

export type Company = {
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

export function listCompanies(): Company[] {
  const companies = plain(
    db()
      .prepare(`SELECT * FROM companies ORDER BY updated_at DESC, id DESC`)
      .all()
  ) as Company[];

  // Also include distinct company names from certificates that are not yet in companies table (official DB)
  const certCompanies = db()
    .prepare(`SELECT DISTINCT company_name FROM certificates WHERE company_name != ''`)
    .all() as Array<{ company_name: string }>;

  const existingNames = new Set(companies.map((c) => c.company_name.toLowerCase()));
  const missing: Company[] = certCompanies
    .filter((r) => !existingNames.has(r.company_name.toLowerCase()))
    .map((r, idx) => ({
      id: -1000 - idx, // temporary negative id for unsaved
      company_name: r.company_name,
      email: "",
      phone: "",
      tax_code: "",
      address: "",
      contact_person: "",
      notes: "Tự động từ chứng nhận",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  return [...companies, ...missing];
}

export function getCompany(id: number): Company | undefined {
  return plain(
    db().prepare(`SELECT * FROM companies WHERE id = ?`).get(id)
  ) as Company | undefined;
}

export function getCompanyByName(name: string): Company | undefined {
  return plain(
    db().prepare(`SELECT * FROM companies WHERE company_name = ?`).get(name.trim())
  ) as Company | undefined;
}

export function createCompany(input: {
  company_name: string;
  email?: string;
  phone?: string;
  tax_code?: string;
  address?: string;
  contact_person?: string;
  notes?: string;
}) {
  if (!input.company_name?.trim()) throw new Error("COMPANY_NAME_REQUIRED");
  const info = db()
    .prepare(
      `INSERT INTO companies (company_name, email, phone, tax_code, address, contact_person, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.company_name.trim(),
      (input.email || "").trim(),
      (input.phone || "").trim(),
      (input.tax_code || "").trim(),
      (input.address || "").trim(),
      (input.contact_person || "").trim(),
      (input.notes || "").trim()
    );
  return Number(info.lastInsertRowid);
}

export function updateCompany(
  id: number,
  input: {
    company_name: string;
    email?: string;
    phone?: string;
    tax_code?: string;
    address?: string;
    contact_person?: string;
    notes?: string;
  }
) {
  const current = getCompany(id);
  if (!current) throw new Error("NOT_FOUND");
  if (!input.company_name?.trim()) throw new Error("COMPANY_NAME_REQUIRED");
  db()
    .prepare(
      `UPDATE companies SET
        company_name = ?, email = ?, phone = ?, tax_code = ?, address = ?, contact_person = ?, notes = ?,
        updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(
      input.company_name.trim(),
      (input.email || "").trim(),
      (input.phone || "").trim(),
      (input.tax_code || "").trim(),
      (input.address || "").trim(),
      (input.contact_person || "").trim(),
      (input.notes || "").trim(),
      id
    );
}

export function deleteCompany(id: number) {
  const current = getCompany(id);
  if (!current) throw new Error("NOT_FOUND");
  db().prepare(`DELETE FROM companies WHERE id = ?`).run(id);
}

export function getCompanyStats(companyName: string) {
  const certs = db()
    .prepare(`SELECT * FROM certificates WHERE company_name = ? ORDER BY updated_at DESC`)
    .all(companyName) as Certificate[];
  const leads = db()
    .prepare(`SELECT * FROM consultation_leads WHERE company_name = ? ORDER BY created_at DESC`)
    .all(companyName) as ConsultationLead[];
  const services = new Set<string>();
  certs.forEach((c) => services.add(c.standard));
  leads.forEach((l) => services.add(l.service_type === "sales" ? "SALE_EXPORT" : "AMAZON_OPS"));
  return {
    certificates: certs.map(hydrate),
    leads: plain(leads) as ConsultationLead[],
    services: Array.from(services),
    totalCertificates: certs.length,
    totalLeads: leads.length,
  };
}

export type ExpiryNotification = {
  id: number;
  certificate_id: number;
  company_name: string;
  notification_type: "90_days" | "60_days" | "30_days" | "14_days" | "7_days" | "3_days" | "1_day" | "expired" | "renewal_reminder";
  recipient_email: string;
  status: "sent" | "failed";
  sent_at: string;
  created_at: string;
};

export function listExpiryNotifications(limit = 100): ExpiryNotification[] {
  return plain(
    db()
      .prepare(`SELECT * FROM expiry_notifications ORDER BY sent_at DESC, id DESC LIMIT ?`)
      .all(limit)
  ) as ExpiryNotification[];
}

export function getExpiryNotificationsForCertificate(certId: number): ExpiryNotification[] {
  return plain(
    db()
      .prepare(`SELECT * FROM expiry_notifications WHERE certificate_id = ? ORDER BY sent_at DESC`)
      .all(certId)
  ) as ExpiryNotification[];
}

export function hasNotificationBeenSent(certId: number, type: string): boolean {
  const row = db()
    .prepare(`SELECT id FROM expiry_notifications WHERE certificate_id = ? AND notification_type = ? LIMIT 1`)
    .get(certId, type) as { id: number } | undefined;
  return !!row;
}

export function createExpiryNotification(input: {
  certificate_id: number;
  company_name: string;
  notification_type: ExpiryNotification["notification_type"];
  recipient_email: string;
  status?: "sent" | "failed";
}) {
  const info = db()
    .prepare(
      `INSERT INTO expiry_notifications (certificate_id, company_name, notification_type, recipient_email, status)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.certificate_id,
      input.company_name,
      input.notification_type,
      input.recipient_email,
      input.status || "sent"
    );
  return Number(info.lastInsertRowid);
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

/* ============================ CRM VẬN HÀNH ============================ */

function mapCrmStage(row: any): CrmStage {
  let criteria: CrmStage["exit_criteria"] = [];
  try {
    criteria = JSON.parse(row.exit_criteria || "[]");
  } catch {}
  return {
    id: Number(row.id),
    pipeline_id: Number(row.pipeline_id),
    key: String(row.key),
    name: String(row.name),
    sort_order: Number(row.sort_order || 0),
    color: String(row.color || "#64748b"),
    sla_days: Number(row.sla_days || 0),
    exit_criteria: Array.isArray(criteria) ? criteria : [],
    is_won: !!row.is_won,
    is_lost: !!row.is_lost,
  };
}

function mapCrmOpp(row: any): CrmOpportunity {
  return {
    id: Number(row.id),
    pipeline_id: Number(row.pipeline_id),
    stage_id: Number(row.stage_id),
    title: String(row.title || ""),
    company_name: String(row.company_name || ""),
    contact_name: String(row.contact_name || ""),
    contact_phone: String(row.contact_phone || ""),
    contact_email: String(row.contact_email || ""),
    industry: String(row.industry || ""),
    source: String(row.source || ""),
    estimated_value: Number(row.estimated_value || 0),
    owner_id: row.owner_id === null || row.owner_id === undefined ? null : Number(row.owner_id),
    owner_name: row.owner_name ? String(row.owner_name) : undefined,
    next_action: String(row.next_action || ""),
    next_action_date: row.next_action_date ? String(row.next_action_date).slice(0, 10) : null,
    stage_entered_at: String(row.stage_entered_at || ""),
    last_activity_at: row.last_activity_at ? String(row.last_activity_at) : null,
    expected_close_date: row.expected_close_date ? String(row.expected_close_date).slice(0, 10) : null,
    lost_reason: String(row.lost_reason || ""),
    notes: String(row.notes || ""),
    created_by: row.created_by === null || row.created_by === undefined ? null : Number(row.created_by),
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || ""),
  };
}

function crmStageMaps() {
  const pipes = db().prepare("SELECT * FROM crm_pipelines WHERE is_active = 1 ORDER BY sort_order").all() as any[];
  const stages = db().prepare("SELECT * FROM crm_stages ORDER BY pipeline_id, sort_order").all() as any[];
  const pipeById = new Map<number, CrmPipeline>();
  const stageById = new Map<number, CrmStage>();
  for (const p of pipes) {
    pipeById.set(Number(p.id), {
      id: Number(p.id), key: String(p.key), name: String(p.name),
      service: String(p.service || ""), description: String(p.description || ""),
      is_active: !!p.is_active, sort_order: Number(p.sort_order || 0),
    });
  }
  for (const s of stages) stageById.set(Number(s.id), mapCrmStage(s));
  return { pipeById, stageById };
}

function enrichCrmRows(rows: any[]): CrmOpportunityEnriched[] {
  const { pipeById, stageById } = crmStageMaps();
  const out: CrmOpportunityEnriched[] = [];
  for (const r of rows) {
    const pipe = pipeById.get(Number(r.pipeline_id));
    const stage = stageById.get(Number(r.stage_id));
    if (!pipe || !stage) continue;
    out.push(enrichOpportunity(mapCrmOpp(plain(r)), pipe, stage));
  }
  return out;
}

export function listCrmPipelines(): CrmPipeline[] {
  const { pipeById, stageById } = crmStageMaps();
  const pipes = Array.from(pipeById.values()).sort((a, b) => a.sort_order - b.sort_order);
  for (const p of pipes) {
    p.stages = Array.from(stageById.values())
      .filter((s) => s.pipeline_id === p.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  return pipes;
}

export function getCrmStageById(id: number): CrmStage | undefined {
  const row = db().prepare("SELECT * FROM crm_stages WHERE id = ?").get(id) as any;
  return row ? mapCrmStage(plain(row)) : undefined;
}

export function getCrmPipelineByKey(key: string): CrmPipeline | undefined {
  const pipes = listCrmPipelines();
  return pipes.find((p) => p.key === key);
}

export type CrmOppFilter = {
  pipeline_key?: string;
  owner_id?: number | null;
  q?: string;
  stage_filter?: "open" | "won" | "lost" | "all";
};

export function listCrmOpportunities(filter: CrmOppFilter = {}): CrmOpportunityEnriched[] {
  const where: string[] = [];
  const params: any[] = [];
  if (filter.pipeline_key) {
    where.push("o.pipeline_id = (SELECT id FROM crm_pipelines WHERE key = ?)");
    params.push(filter.pipeline_key);
  }
  if (filter.owner_id !== undefined && filter.owner_id !== null) {
    where.push("o.owner_id = ?");
    params.push(filter.owner_id);
  }
  if (filter.q) {
    where.push("(o.company_name LIKE ? OR o.contact_name LIKE ? OR o.contact_phone LIKE ? OR o.title LIKE ?)");
    const q = `%${filter.q}%`;
    params.push(q, q, q, q);
  }
  const rows = db()
    .prepare(
      `SELECT o.*, u.name AS owner_name FROM crm_opportunities o
       LEFT JOIN users u ON u.id = o.owner_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY o.updated_at DESC`
    )
    .all(...params) as any[];
  let items = enrichCrmRows(rows);
  if (filter.stage_filter === "open") items = items.filter((i) => i.is_open);
  else if (filter.stage_filter === "won") items = items.filter((i) => i.is_won);
  else if (filter.stage_filter === "lost") items = items.filter((i) => i.is_lost);
  return items;
}

export function getCrmOpportunity(id: number): CrmOpportunityEnriched | undefined {
  const row = db()
    .prepare(
      `SELECT o.*, u.name AS owner_name FROM crm_opportunities o
       LEFT JOIN users u ON u.id = o.owner_id WHERE o.id = ?`
    )
    .get(id) as any;
  if (!row) return undefined;
  const items = enrichCrmRows([row]);
  return items[0];
}

export function createCrmOpportunity(
  input: {
    pipeline_key: string;
    title?: string;
    company_name: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    industry?: string;
    source?: string;
    estimated_value?: number;
    owner_id?: number | null;
    next_action?: string;
    next_action_date?: string | null;
    expected_close_date?: string | null;
    notes?: string;
  },
  createdBy: number
): number {
  if (!input.company_name?.trim()) throw new Error("COMPANY_NAME_REQUIRED");
  const pipe = getCrmPipelineByKey(input.pipeline_key);
  if (!pipe || !pipe.stages?.length) throw new Error("PIPELINE_NOT_FOUND");
  const first = pipe.stages[0];
  const now = nowSql();
  const info = db()
    .prepare(
      `INSERT INTO crm_opportunities (
        pipeline_id, stage_id, title, company_name, contact_name, contact_phone, contact_email,
        industry, source, estimated_value, owner_id, next_action, next_action_date,
        stage_entered_at, expected_close_date, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      pipe.id, first.id,
      (input.title || "").trim() || `${input.company_name.trim()} — ${pipe.key}`,
      input.company_name.trim(),
      (input.contact_name || "").trim(), (input.contact_phone || "").trim(), (input.contact_email || "").trim(),
      (input.industry || "").trim(), (input.source || "").trim(),
      Math.max(0, Math.round(input.estimated_value || 0)),
      input.owner_id ?? createdBy,
      (input.next_action || "").trim(), input.next_action_date || null,
      now, input.expected_close_date || null, (input.notes || "").trim(),
      createdBy, now, now
    );
  const id = Number(info.lastInsertRowid);
  db().prepare(
    "INSERT INTO crm_stage_history (opportunity_id, from_stage_id, to_stage_id, duration_days, note, changed_by, created_at) VALUES (?, NULL, ?, 0, ?, ?, ?)"
  ).run(id, first.id, "Tạo cơ hội", createdBy, now);
  return id;
}

export function updateCrmOpportunity(
  id: number,
  input: {
    title?: string;
    company_name?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    industry?: string;
    source?: string;
    estimated_value?: number;
    owner_id?: number | null;
    next_action?: string;
    next_action_date?: string | null;
    expected_close_date?: string | null;
    notes?: string;
  }
) {
  const cur = db().prepare("SELECT * FROM crm_opportunities WHERE id = ?").get(id) as any;
  if (!cur) throw new Error("NOT_FOUND");
  const val = (v: any, fallback: any) => (v === undefined ? fallback : v);
  db().prepare(
    `UPDATE crm_opportunities SET title=?, company_name=?, contact_name=?, contact_phone=?, contact_email=?,
     industry=?, source=?, estimated_value=?, owner_id=?, next_action=?, next_action_date=?,
     expected_close_date=?, notes=?, updated_at=? WHERE id=?`
  ).run(
    val(input.title?.trim(), cur.title),
    val(input.company_name?.trim(), cur.company_name),
    val(input.contact_name?.trim(), cur.contact_name),
    val(input.contact_phone?.trim(), cur.contact_phone),
    val(input.contact_email?.trim(), cur.contact_email),
    val(input.industry?.trim(), cur.industry),
    val(input.source?.trim(), cur.source),
    input.estimated_value === undefined ? cur.estimated_value : Math.max(0, Math.round(input.estimated_value || 0)),
    input.owner_id === undefined ? cur.owner_id : input.owner_id,
    val(input.next_action?.trim(), cur.next_action),
    input.next_action_date === undefined ? cur.next_action_date : input.next_action_date || null,
    input.expected_close_date === undefined ? cur.expected_close_date : input.expected_close_date || null,
    val(input.notes?.trim(), cur.notes),
    nowSql(), id
  );
}

export function deleteCrmOpportunity(id: number) {
  db().prepare("DELETE FROM crm_opportunities WHERE id = ?").run(id);
}

export function moveCrmOpportunity(
  id: number,
  toStageId: number,
  checklist: Record<string, boolean>,
  note: string,
  lostReason: string,
  changedBy: number
): CrmOpportunityEnriched {
  const cur = db().prepare("SELECT * FROM crm_opportunities WHERE id = ?").get(id) as any;
  if (!cur) throw new Error("NOT_FOUND");
  const fromStage = getCrmStageById(Number(cur.stage_id));
  const toStage = getCrmStageById(toStageId);
  if (!fromStage || !toStage) throw new Error("STAGE_NOT_FOUND");
  const check = validateTransition({ fromStage, toStage, checklist, lost_reason: lostReason });
  if (!check.ok) {
    const err = new Error(check.error || "TRANSITION_BLOCKED") as any;
    err.missing = check.missing;
    err.code = "TRANSITION_BLOCKED";
    throw err;
  }
  // Lưu checklist đã tick
  const upsert = db().prepare(`
    INSERT INTO crm_checklists (opportunity_id, stage_key, criterion_key, is_checked, checked_by, checked_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(opportunity_id, stage_key, criterion_key) DO UPDATE SET
      is_checked=excluded.is_checked, checked_by=excluded.checked_by,
      checked_at=excluded.checked_at, updated_at=excluded.updated_at
  `);
  const now = nowSql();
  for (const [k, v] of Object.entries(checklist)) {
    upsert.run(id, fromStage.key, k, v ? 1 : 0, v ? changedBy : null, v ? now : null, now);
  }
  // Tính thời gian ở stage cũ (ngày, chính xác đến 0.1)
  const entered = new Date(String(cur.stage_entered_at).replace(" ", "T") + "Z").getTime();
  const durDays = Number.isFinite(entered) ? Math.max(0, (Date.now() - entered) / 86400000) : 0;
  db().prepare(
    "INSERT INTO crm_stage_history (opportunity_id, from_stage_id, to_stage_id, duration_days, note, changed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, fromStage.id, toStage.id, Math.round(durDays * 10) / 10, (note || "").trim(), changedBy, now);
  db().prepare(
    "UPDATE crm_opportunities SET stage_id=?, stage_entered_at=?, lost_reason=?, updated_at=? WHERE id=?"
  ).run(toStage.id, now, toStage.is_lost ? (lostReason || "").trim() : "", now, id);
  return getCrmOpportunity(id)!;
}

export function listCrmHistory(opportunityId: number): CrmStageHistory[] {
  const rows = db().prepare(
    `SELECT h.*, f.name AS from_name, t.name AS to_name, u.name AS changed_name
     FROM crm_stage_history h
     LEFT JOIN crm_stages f ON f.id = h.from_stage_id
     LEFT JOIN crm_stages t ON t.id = h.to_stage_id
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.opportunity_id = ? ORDER BY h.created_at ASC, h.id ASC`
  ).all(opportunityId) as any[];
  return plain(rows).map((r: any) => ({
    id: Number(r.id),
    opportunity_id: Number(r.opportunity_id),
    from_stage_id: r.from_stage_id === null ? null : Number(r.from_stage_id),
    from_stage_name: r.from_name ? String(r.from_name) : undefined,
    to_stage_id: Number(r.to_stage_id),
    to_stage_name: r.to_name ? String(r.to_name) : undefined,
    duration_days: Number(r.duration_days || 0),
    note: String(r.note || ""),
    changed_by: r.changed_by === null ? null : Number(r.changed_by),
    changed_by_name: r.changed_name ? String(r.changed_name) : undefined,
    created_at: String(r.created_at),
  }));
}

export function listCrmActivities(opportunityId: number): CrmActivity[] {
  const rows = db().prepare(
    `SELECT a.*, u.name AS created_name FROM crm_activities a
     LEFT JOIN users u ON u.id = a.created_by
     WHERE a.opportunity_id = ? ORDER BY a.created_at DESC, a.id DESC`
  ).all(opportunityId) as any[];
  return plain(rows).map((r: any) => ({
    id: Number(r.id),
    opportunity_id: Number(r.opportunity_id),
    type: String(r.type || "note") as CrmActivity["type"],
    title: String(r.title || ""),
    content: String(r.content || ""),
    outcome: String(r.outcome || ""),
    created_by: r.created_by === null ? null : Number(r.created_by),
    created_by_name: r.created_name ? String(r.created_name) : undefined,
    created_at: String(r.created_at),
  }));
}

export function createCrmActivity(
  opportunityId: number,
  input: { type?: string; title?: string; content?: string; outcome?: string; next_action?: string; next_action_date?: string | null },
  createdBy: number
): number {
  const cur = db().prepare("SELECT * FROM crm_opportunities WHERE id = ?").get(opportunityId) as any;
  if (!cur) throw new Error("NOT_FOUND");
  const now = nowSql();
  const info = db().prepare(
    "INSERT INTO crm_activities (opportunity_id, type, title, content, outcome, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    opportunityId,
    (input.type || "note").trim() || "note",
    (input.title || "").trim(),
    (input.content || "").trim(),
    (input.outcome || "").trim(),
    createdBy, now
  );
  // Ghi nhận hoạt động → cập nhật last_activity_at; nếu có next action mới thì cập nhật luôn
  const nextAction = input.next_action !== undefined ? input.next_action.trim() : cur.next_action;
  const nextDate = input.next_action_date === undefined ? cur.next_action_date : input.next_action_date || null;
  db().prepare("UPDATE crm_opportunities SET last_activity_at=?, next_action=?, next_action_date=?, updated_at=? WHERE id=?")
    .run(now, nextAction, nextDate, now, opportunityId);
  return Number(info.lastInsertRowid);
}

export function listCrmChecklists(opportunityId: number): CrmChecklistState[] {
  const rows = db().prepare(
    `SELECT c.*, u.name AS checked_name FROM crm_checklists c
     LEFT JOIN users u ON u.id = c.checked_by
     WHERE c.opportunity_id = ?`
  ).all(opportunityId) as any[];
  return plain(rows).map((r: any) => ({
    stage_key: String(r.stage_key),
    criterion_key: String(r.criterion_key),
    is_checked: !!r.is_checked,
    checked_by_name: r.checked_name ? String(r.checked_name) : undefined,
    checked_at: r.checked_at ? String(r.checked_at) : null,
  }));
}

export type CrmDashboard = {
  openCount: number;
  openValue: number;
  wonMonth: number;
  wonMonthValue: number;
  lostMonth: number;
  followupToday: number;
  overdueSla: number;
  missingAction: number;
  stale: number;
  pipelineStats: Array<{
    key: string; name: string;
    stages: Array<{ key: string; name: string; color: string; count: number; value: number; is_won: boolean; is_lost: boolean }>;
    openCount: number; openValue: number;
  }>;
  alerts: CrmOpportunityEnriched[];
  myToday: CrmOpportunityEnriched[];
  avgStageDays: Array<{ pipeline_key: string; pipeline_name: string; stage_key: string; stage_name: string; avg_days: number; samples: number }>;
  ownerStats: Array<{ owner_id: number | null; owner_name: string; open: number; openValue: number; won: number; lost: number; conversion: number }>;
  dropoff: Array<{ pipeline_key: string; pipeline_name: string; from_stage: string; count: number }>;
  recentWon: CrmOpportunityEnriched[];
  recentLost: CrmOpportunityEnriched[];
};

export function crmDashboard(filter: { pipeline_key?: string; scope_user_id?: number | null } = {}): CrmDashboard {
  const items = listCrmOpportunities({ pipeline_key: filter.pipeline_key });
  const pipes = listCrmPipelines().filter((p) => !filter.pipeline_key || p.key === filter.pipeline_key);
  const monthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM

  const isOpen = (o: CrmOpportunityEnriched) => o.is_open;
  const open = items.filter(isOpen);
  const wonMonth = items.filter((o) => o.is_won && String(o.updated_at).slice(0, 7) === monthPrefix);
  const lostMonth = items.filter((o) => o.is_lost && String(o.updated_at).slice(0, 7) === monthPrefix);

  const alerts = open
    .filter((o) => o.alerts.length > 0)
    .sort((a, b) => {
      const rank = (o: CrmOpportunityEnriched) => (o.health === "danger" ? 0 : 1);
      return rank(a) - rank(b) || b.days_in_stage - a.days_in_stage;
    })
    .slice(0, 30);

  const myToday = filter.scope_user_id
    ? open
        .filter((o) => o.owner_id === filter.scope_user_id && (o.days_to_followup === null || (o.days_to_followup !== null && o.days_to_followup <= 1)))
        .sort((a, b) => (a.days_to_followup ?? 99) - (b.days_to_followup ?? 99))
        .slice(0, 20)
    : [];

  const pipelineStats = pipes.map((p) => {
    const stages = (p.stages || []).map((s) => {
      const inStage = items.filter((o) => o.stage_id === s.id);
      return {
        key: s.key, name: s.name, color: s.color,
        count: inStage.length,
        value: inStage.reduce((t, o) => t + (o.estimated_value || 0), 0),
        is_won: s.is_won, is_lost: s.is_lost,
      };
    });
    const openItems = items.filter((o) => o.pipeline_id === p.id && o.is_open);
    return {
      key: p.key, name: p.name, stages,
      openCount: openItems.length,
      openValue: openItems.reduce((t, o) => t + (o.estimated_value || 0), 0),
    };
  });

  // Thời gian TB ở mỗi giai đoạn (từ history)
  const histRows = db().prepare(
    `SELECT h.duration_days, s.key AS stage_key, s.name AS stage_name, p.key AS pipe_key, p.name AS pipe_name
     FROM crm_stage_history h
     JOIN crm_stages s ON s.id = h.from_stage_id
     JOIN crm_pipelines p ON p.id = s.pipeline_id
     WHERE h.from_stage_id IS NOT NULL AND h.duration_days > 0
     ${filter.pipeline_key ? "AND p.key = ?" : ""}`
  ).all(...(filter.pipeline_key ? [filter.pipeline_key] : [])) as any[];
  const agg = new Map<string, { pipeline_key: string; pipeline_name: string; stage_key: string; stage_name: string; total: number; n: number }>();
  for (const r of histRows) {
    const k = `${r.pipe_key}:${r.stage_key}`;
    const cur = agg.get(k) || { pipeline_key: r.pipe_key, pipeline_name: r.pipe_name, stage_key: r.stage_key, stage_name: r.stage_name, total: 0, n: 0 };
    cur.total += Number(r.duration_days || 0);
    cur.n += 1;
    agg.set(k, cur);
  }
  const avgStageDays = Array.from(agg.values()).map((a) => ({
    pipeline_key: a.pipeline_key, pipeline_name: a.pipeline_name,
    stage_key: a.stage_key, stage_name: a.stage_name,
    avg_days: Math.round((a.total / a.n) * 10) / 10, samples: a.n,
  }));

  // Thống kê theo owner
  const ownerMap = new Map<number | null, { owner_id: number | null; owner_name: string; open: number; openValue: number; won: number; lost: number }>();
  for (const o of items) {
    const k = o.owner_id ?? null;
    const cur = ownerMap.get(k) || { owner_id: k, owner_name: o.owner_name || "Chưa gán", open: 0, openValue: 0, won: 0, lost: 0 };
    if (o.is_open) { cur.open += 1; cur.openValue += o.estimated_value || 0; }
    if (o.is_won) cur.won += 1;
    if (o.is_lost) cur.lost += 1;
    ownerMap.set(k, cur);
  }
  const ownerStats = Array.from(ownerMap.values()).map((o) => ({
    ...o,
    conversion: o.won + o.lost > 0 ? Math.round((o.won / (o.won + o.lost)) * 100) : 0,
  })).sort((a, b) => b.won - a.won || b.open - a.open);

  // Giai đoạn mất khách nhiều nhất
  const dropRows = db().prepare(
    `SELECT p.key AS pipe_key, p.name AS pipe_name, f.name AS from_stage, COUNT(*) AS c
     FROM crm_stage_history h
     JOIN crm_stages t ON t.id = h.to_stage_id
     JOIN crm_stages f ON f.id = h.from_stage_id
     JOIN crm_pipelines p ON p.id = t.pipeline_id
     WHERE t.is_lost = 1
     ${filter.pipeline_key ? "AND p.key = ?" : ""}
     GROUP BY p.key, p.name, f.name ORDER BY c DESC`
  ).all(...(filter.pipeline_key ? [filter.pipeline_key] : [])) as any[];
  const dropoff = plain(dropRows).map((r: any) => ({
    pipeline_key: String(r.pipe_key), pipeline_name: String(r.pipe_name),
    from_stage: String(r.from_stage), count: Number(r.c),
  }));

  return {
    openCount: open.length,
    openValue: open.reduce((t, o) => t + (o.estimated_value || 0), 0),
    wonMonth: wonMonth.length,
    wonMonthValue: wonMonth.reduce((t, o) => t + (o.estimated_value || 0), 0),
    lostMonth: lostMonth.length,
    followupToday: open.filter((o) => o.days_to_followup !== null && o.days_to_followup <= 0).length,
    overdueSla: open.filter((o) => o.alerts.some((a) => a.type === "sla")).length,
    missingAction: open.filter((o) => o.alerts.some((a) => a.type === "no_action")).length,
    stale: open.filter((o) => o.alerts.some((a) => a.type === "stale")).length,
    pipelineStats,
    alerts,
    myToday,
    avgStageDays,
    ownerStats,
    dropoff,
    recentWon: items.filter((o) => o.is_won).slice(0, 5),
    recentLost: items.filter((o) => o.is_lost).slice(0, 5),
  };
}

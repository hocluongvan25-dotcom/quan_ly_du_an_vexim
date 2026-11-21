const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const originalCwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vexim-remove-sale-amazon-'));
const dataDir = path.join(temp, 'data');
const databasePath = path.join(dataDir, 'vexim.db');
fs.mkdirSync(dataDir, { recursive: true });
process.chdir(temp);

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
require.extensions['.ts'] = (mod, filename) => {
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};

after(() => {
  process.chdir(originalCwd);
  fs.rmSync(temp, { recursive: true, force: true });
});

function createLegacyDatabase() {
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','specialist')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO users (id, email, name, password_hash, role)
      VALUES (1, 'admin@example.test', 'Admin', 'unused', 'admin');

    CREATE TABLE crm_pipelines (
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
    INSERT INTO crm_pipelines (id, key, name) VALUES
      (1, 'FDA', 'FDA'), (2, 'GACC', 'GACC'),
      (3, 'SALE_EXPORT', 'Sale export'), (4, 'AMAZON_OPS', 'Amazon operations');

    CREATE TABLE crm_stages (
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
    INSERT INTO crm_stages (id, pipeline_id, key, name) VALUES
      (11, 1, 'lead_moi', 'New'), (12, 2, 'lead_moi', 'New'),
      (13, 3, 'lead_moi', 'New'), (14, 4, 'lead_moi', 'New');

    CREATE TABLE crm_opportunities (
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
    INSERT INTO crm_opportunities (id, pipeline_id, stage_id, title, company_name) VALUES
      (21, 1, 11, 'FDA opportunity', 'FDA Co'),
      (22, 3, 13, 'Sale opportunity', 'Sale Co'),
      (23, 4, 14, 'Amazon opportunity', 'Amazon Co');

    CREATE TABLE crm_stage_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      from_stage_id INTEGER REFERENCES crm_stages(id) ON DELETE SET NULL,
      to_stage_id INTEGER NOT NULL REFERENCES crm_stages(id),
      duration_days REAL NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO crm_stage_history (id, opportunity_id, to_stage_id) VALUES
      (31, 21, 11), (32, 22, 13), (33, 23, 14);

    CREATE TABLE crm_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'note',
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      outcome TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO crm_activities (id, opportunity_id) VALUES (41, 21), (42, 22), (43, 23);

    CREATE TABLE crm_checklists (
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
    INSERT INTO crm_checklists (id, opportunity_id, stage_key, criterion_key) VALUES
      (51, 21, 'lead_moi', 'contacted'),
      (52, 22, 'lead_moi', 'contacted'),
      (53, 23, 'lead_moi', 'contacted');

    CREATE TABLE quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_no TEXT NOT NULL UNIQUE,
      template_key TEXT NOT NULL CHECK (template_key IN ('FDA','GACC','SALE_EXPORT','AMAZON_OPS')),
      service_name TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      company_name TEXT NOT NULL DEFAULT '',
      company_address TEXT NOT NULL DEFAULT '',
      company_tax_code TEXT NOT NULL DEFAULT '',
      contact_name TEXT NOT NULL DEFAULT '',
      contact_title TEXT NOT NULL DEFAULT '',
      contact_phone TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      items TEXT NOT NULL DEFAULT '[]',
      scope TEXT NOT NULL DEFAULT '[]',
      terms TEXT NOT NULL DEFAULT '[]',
      timeline TEXT NOT NULL DEFAULT '',
      payment_terms TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      vat_rate REAL NOT NULL DEFAULT 8,
      vat_amount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      optional_total INTEGER NOT NULL DEFAULT 0,
      issue_date TEXT NOT NULL,
      valid_until TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected')),
      opportunity_id INTEGER REFERENCES crm_opportunities(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO quotes (id, quote_no, template_key, company_name, issue_date, subtotal, total, opportunity_id) VALUES
      (101, 'Q-FDA', 'FDA', 'FDA Co', '2026-10-01', 100, 108, 21),
      (102, 'Q-SALE', 'SALE_EXPORT', 'Sale Co', '2026-10-01', 200, 216, 22),
      (103, 'Q-AMAZON', 'AMAZON_OPS', 'Amazon Co', '2026-10-01', 300, 324, 23),
      (104, 'Q-FDA-LEGACY-LINK', 'FDA', 'Legacy Co', '2026-10-01', 400, 432, 22);

    CREATE TABLE quote_templates (
      template_key TEXT PRIMARY KEY CHECK (template_key IN ('FDA','GACC','SALE_EXPORT','AMAZON_OPS')),
      payload TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO quote_templates (template_key, payload) VALUES
      ('FDA', '{}'), ('GACC', '{}'), ('SALE_EXPORT', '{}'), ('AMAZON_OPS', '{}');

    CREATE TABLE service_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_no TEXT NOT NULL UNIQUE,
      service_type TEXT NOT NULL,
      company_name TEXT NOT NULL DEFAULT ''
    );
    INSERT INTO service_contracts (id, contract_no, service_type, company_name)
      VALUES (71, 'OLD-SERVICE-001', 'SALE_EXPORT', 'Sale Co');

    CREATE TABLE consultation_leads (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    INSERT INTO consultation_leads VALUES (81, 'Old inquiry');

    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      contract_no TEXT NOT NULL DEFAULT '',
      payment_request TEXT,
      ref_type TEXT NOT NULL CHECK (ref_type IN ('certificate','service_contract')),
      ref_id INTEGER NOT NULL,
      installment_no INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL DEFAULT '',
      subtotal INTEGER NOT NULL DEFAULT 0,
      vat_rate REAL NOT NULL DEFAULT 8,
      vat_amount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      issue_date TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','cancelled')),
      notes TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO invoices (id, invoice_no, ref_type, ref_id, subtotal, vat_amount, total, issue_date)
      VALUES (301, 'INV-CERT', 'certificate', 501, 100000, 8000, 108000, '2026-10-01'),
             (302, 'INV-SERVICE', 'service_contract', 71, 200000, 16000, 216000, '2026-10-02');

    CREATE TABLE invoice_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL DEFAULT 0,
      paid_at TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT '',
      reference TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO invoice_payments (id, invoice_id, amount, paid_at) VALUES
      (401, 301, 20000, '2026-10-02'), (402, 302, 30000, '2026-10-03');
  `);
  db.close();
}

test('SQLite cleanup deletes retired-service rows, preserves FDA/GACC data and leaves no orphaned references', () => {
  createLegacyDatabase();

  const sqlite = require('../lib/db-sqlite.ts');
  // Opening any DB-backed query runs migrate() and then seeds only the current FDA/GACC pipelines.
  sqlite.listCrmPipelines();

  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys = ON');
  const rows = (sql) => db.prepare(sql).all();

  assert.deepEqual(rows('SELECT key FROM crm_pipelines ORDER BY key').map((row) => row.key), ['FDA', 'GACC']);
  assert.deepEqual(rows('SELECT id FROM crm_opportunities ORDER BY id').map((row) => row.id), [21]);
  assert.equal(rows('SELECT id FROM crm_stages WHERE pipeline_id IN (3,4)').length, 0);
  assert.deepEqual(rows('SELECT id FROM crm_stage_history ORDER BY id').map((row) => row.id), [31]);
  assert.deepEqual(rows('SELECT id FROM crm_activities ORDER BY id').map((row) => row.id), [41]);
  assert.deepEqual(rows('SELECT id FROM crm_checklists ORDER BY id').map((row) => row.id), [51]);

  assert.deepEqual(rows('SELECT template_key FROM quote_templates ORDER BY template_key').map((row) => row.template_key), ['FDA', 'GACC']);
  const quotes = rows('SELECT id, template_key, subtotal, total, opportunity_id FROM quotes ORDER BY id');
  assert.deepEqual(quotes.map((row) => row.id), [101, 104]);
  assert.equal(quotes[0].template_key, 'FDA');
  assert.equal(quotes[0].subtotal, 100);
  assert.equal(quotes[0].total, 108);
  assert.equal(quotes[0].opportunity_id, 21);
  assert.equal(quotes[1].opportunity_id, null, 'retained quotes lose references to deleted-service CRM opportunities');

  assert.equal(rows("SELECT name FROM sqlite_master WHERE type='table' AND name='service_contracts'").length, 0);
  assert.equal(rows("SELECT name FROM sqlite_master WHERE type='table' AND name='consultation_leads'").length, 0);
  assert.deepEqual(rows('SELECT id, ref_type, total FROM invoices').map((row) => [row.id, row.ref_type, row.total]), [[301, 'certificate', 108000]]);
  assert.deepEqual(rows('SELECT id, invoice_id, amount FROM invoice_payments').map((row) => [row.id, row.invoice_id, row.amount]), [[401, 301, 20000]]);
  assert.throws(() => db.prepare(`INSERT INTO invoices (invoice_no, ref_type, ref_id, issue_date)
    VALUES ('INV-RETIRED', 'service_contract', 71, '2026-10-04')`).run(), /CHECK constraint failed/);
  assert.deepEqual(rows('PRAGMA foreign_key_check'), [], 'migration must not leave orphaned foreign-key rows');
  db.close();
});

import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { supabase } from "./src/services/supabaseClient.js";
import { generateDocumentHash, signDocument, getPreviousHash } from "./src/services/fiscalService.js";

console.log("Initializing database...");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("invoices.db");

// Ensure invoices table has all necessary columns (migration-like check)
const columnsToAdd = [
  { name: 'vat_withholding', type: 'REAL DEFAULT 0' },
  { name: 'exchange_rate', type: 'REAL DEFAULT 1' },
  { name: 'currency', type: 'TEXT DEFAULT \'Kwanza\'' },
  { name: 'counter_value', type: 'REAL DEFAULT 0' },
  { name: 'global_discount', type: 'REAL DEFAULT 0' },
  { name: 'cash_box', type: 'TEXT' },
  { name: 'payment_method', type: 'TEXT' },
  { name: 'series_id', type: 'INTEGER' },
  { name: 'hash', type: 'TEXT' },
  { name: 'signature', type: 'TEXT' },
  { name: 'is_certified', type: 'BOOLEAN DEFAULT 0' }
];

const employeeColumnsToAdd = [
  { name: 'bi', type: 'TEXT' },
  { name: 'contract_type', type: 'TEXT' },
  { name: 'dependents', type: 'INTEGER DEFAULT 0' },
  { name: 'subject_to_irt', type: 'BOOLEAN DEFAULT 1' },
  { name: 'subject_to_inss', type: 'BOOLEAN DEFAULT 1' },
  { name: 'bank_account', type: 'TEXT' },
  { name: 'inss_number', type: 'TEXT' }
];

const userColumnsToAdd = [
  { name: 'password_hash', type: 'TEXT' }
];

for (const col of columnsToAdd) {
  try {
    db.prepare(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type}`).run();
    console.log(`Added column ${col.name} to invoices table.`);
  } catch (e) {}
}

for (const col of employeeColumnsToAdd) {
  try {
    db.prepare(`ALTER TABLE employees ADD COLUMN ${col.name} ${col.type}`).run();
    console.log(`Added column ${col.name} to employees table.`);
  } catch (e) {}
}

for (const col of userColumnsToAdd) {
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`).run();
    console.log(`Added column ${col.name} to users table.`);
  } catch (e) {}
}

const tablesToMigrateEmpresaId = [
  'clients', 'products', 'invoices', 'stock_movements', 'employees', 
  'professions', 'employee_contracts', 'generated_contracts', 
  'employee_absences', 'fiscal_series', 'warehouses', 'work_sites',
  'cost_centers', 'pos_points', 'employee_attendance', 'work_site_movements',
  'pos_sales', 'app_settings', 'payroll', 'cash_sessions', 'suppliers',
  'transactions', 'purchases', 'caixas', 'employee_dismissals', 
  'labor_terminations', 'caixa_movements'
];

for (const table of tablesToMigrateEmpresaId) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN empresa_id TEXT`).run();
    console.log(`Added column empresa_id to ${table} table.`);
  } catch (e) {}
}

db.pragma('journal_mode = WAL');
console.log("Server starting...");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    empresa_id TEXT NOT NULL,
    role TEXT DEFAULT 'operador',
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    nif TEXT,
    address TEXT,
    localidade TEXT,
    codigo_postal TEXT,
    provincia TEXT,
    municipio TEXT,
    pais TEXT,
    telefone TEXT,
    webpage TEXT,
    tipo_cliente TEXT,
    initial_balance REAL DEFAULT 0,
    estado_nif TEXT DEFAULT 'não encontrado',
    empresa_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations
try { db.prepare("ALTER TABLE clients ADD COLUMN initial_balance REAL DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE clients ADD COLUMN estado_nif TEXT DEFAULT 'não encontrado'").run(); } catch (e) {}
try { db.prepare("ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'pending'").run(); } catch (e) {}
try { db.prepare("ALTER TABLE invoices ADD COLUMN is_anulado BOOLEAN DEFAULT 0").run(); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    referente TEXT,
    empresa_id TEXT,
    data_registo DATE,
    warehouse_id INTEGER,
    tipo_documento TEXT,
    cost_price REAL DEFAULT 0,
    price REAL NOT NULL,
    finalidade TEXT,
    tipologia TEXT,
    unit TEXT DEFAULT 'un',
    stock_quantity REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    category TEXT,
    barcode TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    empresa_id TEXT,
    type TEXT NOT NULL, -- 'entry', 'exit', 'transfer', 'adjustment'
    quantity REAL NOT NULL,
    unit_price REAL DEFAULT 0, -- Cost price at the time of movement
    previous_stock REAL NOT NULL,
    current_stock REAL NOT NULL,
    warehouse_id INTEGER,
    to_warehouse_id INTEGER, -- for transfers
    description TEXT,
    reference_id TEXT, -- e.g. invoice_id or adjustment_id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    empresa_id TEXT,
    invoice_number TEXT UNIQUE NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'ativo',
    total REAL DEFAULT 0,
    document_type TEXT,
    country_code TEXT,
    service_date DATE,
    service_location TEXT,
    work_site_id INTEGER,
    vat_withholding REAL DEFAULT 0,
    exchange_rate REAL DEFAULT 1,
    currency TEXT DEFAULT 'Kwanza',
    counter_value REAL DEFAULT 0,
    global_discount REAL DEFAULT 0,
    cash_box TEXT,
    payment_method TEXT,
    series_id INTEGER,
    hash TEXT,
    signature TEXT,
    is_certified BOOLEAN DEFAULT 0,
    payment_status TEXT DEFAULT 'pending', -- pending, partial, paid
    is_anulado BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (work_site_id) REFERENCES work_sites(id),
    FOREIGN KEY (series_id) REFERENCES fiscal_series(id)
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    empresa_id TEXT,
    receipt_number TEXT UNIQUE NOT NULL,
    date DATE NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT,
    cash_box TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  );

  CREATE TABLE IF NOT EXISTS hash_chain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    previous_hash TEXT NOT NULL,
    current_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES invoices(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  );

  -- New Tables for HR, Cashier, Accounting, Financial Management

  CREATE TABLE IF NOT EXISTS professions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    empresa_id TEXT,
    inss_profession TEXT,
    base_salary REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    empresa_id TEXT,
    role TEXT NOT NULL,
    profession_id INTEGER,
    salary REAL NOT NULL,
    email TEXT,
    phone TEXT,
    nif TEXT,
    address TEXT,
    iban TEXT,
    bank_name TEXT,
    image_url TEXT,
    birth_date DATE,
    gender TEXT,
    marital_status TEXT,
    academic_level TEXT,
    department TEXT,
    status TEXT DEFAULT 'active',
    hired_at DATE,
    dismissed_at DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profession_id) REFERENCES professions(id)
  );

  CREATE TABLE IF NOT EXISTS employee_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    empresa_id TEXT,
    contract_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS generated_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    empresa_id TEXT,
    content TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS employee_absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    empresa_id TEXT,
    type TEXT NOT NULL, -- 'vacation', 'sick', 'subsidy', etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount REAL DEFAULT 0, -- for subsidies
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS fiscal_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    empresa_id TEXT,
    user_id INTEGER,
    type TEXT DEFAULT 'normal', -- 'normal', 'manual_recovery'
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cost_centers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    empresa_id TEXT,
    code TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pos_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    empresa_id TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS system_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    profession TEXT,
    date DATE,
    permission_area TEXT,
    contact TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS employee_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    empresa_id TEXT,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'present', 'absent', 'late'
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS work_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    empresa_id TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    staff_per_day INTEGER NOT NULL,
    total_staff INTEGER NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    contact TEXT,
    observations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS work_site_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_site_id INTEGER NOT NULL,
    empresa_id TEXT,
    date DATE NOT NULL,
    doc_no TEXT,
    company TEXT,
    description TEXT,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_site_id) REFERENCES work_sites(id)
  );

  CREATE TABLE IF NOT EXISTS obras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_site_id INTEGER NOT NULL,
    empresa_id TEXT,
    status TEXT DEFAULT 'active',
    budget REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_site_id) REFERENCES work_sites(id)
  );

  CREATE TABLE IF NOT EXISTS pos_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id TEXT,
    total REAL NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    items_json TEXT NOT NULL,
    series_id INTEGER,
    cost_center_id INTEGER,
    pos_point_id INTEGER,
    session_id INTEGER,
    discount REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash'
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Initialize default settings
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('fiscal_year', '2026');
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('company_name', 'FaturaPronta Lda');
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('currency', 'AOA');

  -- Ensure at least one fiscal series exists
  INSERT OR IGNORE INTO fiscal_series (id, description, type, is_active) VALUES (1, 'Série 2026', 'normal', 1);

  CREATE TABLE IF NOT EXISTS payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    empresa_id TEXT,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    paid_at DATETIME,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id TEXT,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    initial_balance REAL NOT NULL,
    final_balance REAL,
    status TEXT DEFAULT 'open',
    pos_point_id INTEGER,
    total_sales REAL DEFAULT 0,
    total_discounts REAL DEFAULT 0
  );
  `);

  const productColumnsToAdd = [
    { name: 'image', type: 'TEXT' }
  ];

  for (const col of productColumnsToAdd) {
    try {
      db.prepare(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`Added column ${col.name} to products table.`);
    } catch (e) {}
  }

  db.prepare(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      empresa_id TEXT,
      localidade TEXT,
      provincia TEXT,
      responsavel TEXT,
      contacto TEXT,
      observacao TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      empresa_id TEXT,
      nif TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id TEXT,
    type TEXT NOT NULL, -- 'income' or 'expense'
    category TEXT NOT NULL, -- 'sale', 'salary', 'purchase', etc.
    amount REAL NOT NULL,
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    reference_id INTEGER -- ID of related invoice, payroll, etc.
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    empresa_id TEXT,
    purchase_number TEXT UNIQUE NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    total REAL DEFAULT 0,
    work_site_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    product_id INTEGER,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id)
  );

  CREATE TABLE IF NOT EXISTS caixas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    empresa_id TEXT,
    bankName TEXT,
    account TEXT,
    responsible TEXT,
    user TEXT,
    users INTEGER DEFAULT 1,
    initialBalance REAL DEFAULT 0,
    currentBalance REAL DEFAULT 0,
    obs TEXT,
    status TEXT DEFAULT 'aberto'
  );

  CREATE TABLE IF NOT EXISTS employee_dismissals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    empresa_id TEXT,
    dismissal_date DATE NOT NULL,
    reason TEXT,
    observations TEXT,
    ordered_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS labor_terminations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    empresa_id TEXT,
    dismissal_date DATE NOT NULL,
    reason TEXT,
    observations TEXT,
    ordered_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS caixa_movements (
    id TEXT PRIMARY KEY,
    caixaId TEXT NOT NULL,
    empresa_id TEXT,
    type TEXT NOT NULL, -- 'entrada', 'saida', 'transferencia'
    amount REAL NOT NULL,
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    targetCaixaId TEXT,
    FOREIGN KEY (caixaId) REFERENCES caixas(id)
  );
`);
console.log("Database initialized");

// Migration: Add missing columns to employees table if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(employees)").all();
console.log("Employees table info:", tableInfo);
const columns = tableInfo.map((c: any) => c.name);

if (!columns.includes('profession_id')) {
  db.exec("ALTER TABLE employees ADD COLUMN profession_id INTEGER REFERENCES professions(id)");
}
if (!columns.includes('email')) {
  db.exec("ALTER TABLE employees ADD COLUMN email TEXT");
}
if (!columns.includes('phone')) {
  db.exec("ALTER TABLE employees ADD COLUMN phone TEXT");
}
if (!columns.includes('nif')) {
  db.exec("ALTER TABLE employees ADD COLUMN nif TEXT");
}
if (!columns.includes('address')) {
  db.exec("ALTER TABLE employees ADD COLUMN address TEXT");
}
if (!columns.includes('iban')) {
  db.exec("ALTER TABLE employees ADD COLUMN iban TEXT");
}
if (!columns.includes('bank_name')) {
  db.exec("ALTER TABLE employees ADD COLUMN bank_name TEXT");
}
if (!columns.includes('image_url')) {
  db.exec("ALTER TABLE employees ADD COLUMN image_url TEXT");
}
if (!columns.includes('birth_date')) {
  db.exec("ALTER TABLE employees ADD COLUMN birth_date DATE");
}
if (!columns.includes('gender')) {
  db.exec("ALTER TABLE employees ADD COLUMN gender TEXT");
}
if (!columns.includes('marital_status')) {
  db.exec("ALTER TABLE employees ADD COLUMN marital_status TEXT");
}
if (!columns.includes('academic_level')) {
  db.exec("ALTER TABLE employees ADD COLUMN academic_level TEXT");
}
if (!columns.includes('department')) {
  db.exec("ALTER TABLE employees ADD COLUMN department TEXT");
}
if (!columns.includes('status')) {
  db.exec("ALTER TABLE employees ADD COLUMN status TEXT DEFAULT 'active'");
}
if (!columns.includes('hired_at')) {
  db.exec("ALTER TABLE employees ADD COLUMN hired_at DATE");
}
if (!columns.includes('dismissed_at')) {
  db.exec("ALTER TABLE employees ADD COLUMN dismissed_at DATE");
}

// POS Sales Migrations
const posSalesInfo = db.prepare("PRAGMA table_info(pos_sales)").all();
const posSalesCols = posSalesInfo.map((c: any) => c.name);
if (!posSalesCols.includes('series_id')) db.exec("ALTER TABLE pos_sales ADD COLUMN series_id INTEGER");
if (!posSalesCols.includes('cost_center_id')) db.exec("ALTER TABLE pos_sales ADD COLUMN cost_center_id INTEGER");
if (!posSalesCols.includes('pos_point_id')) db.exec("ALTER TABLE pos_sales ADD COLUMN pos_point_id INTEGER");
if (!posSalesCols.includes('session_id')) db.exec("ALTER TABLE pos_sales ADD COLUMN session_id INTEGER");
if (!posSalesCols.includes('discount')) db.exec("ALTER TABLE pos_sales ADD COLUMN discount REAL DEFAULT 0");
if (!posSalesCols.includes('payment_method')) db.exec("ALTER TABLE pos_sales ADD COLUMN payment_method TEXT DEFAULT 'cash'");

// Cash Sessions Migrations
const cashSessionsInfo = db.prepare("PRAGMA table_info(cash_sessions)").all();
const cashSessionsCols = cashSessionsInfo.map((c: any) => c.name);
if (!cashSessionsCols.includes('pos_point_id')) db.exec("ALTER TABLE cash_sessions ADD COLUMN pos_point_id INTEGER");
if (!cashSessionsCols.includes('total_sales')) db.exec("ALTER TABLE cash_sessions ADD COLUMN total_sales REAL DEFAULT 0");
if (!cashSessionsCols.includes('total_discounts')) db.exec("ALTER TABLE cash_sessions ADD COLUMN total_discounts REAL DEFAULT 0");

// Migration: Add missing columns to clients table if they don't exist
const clientTableInfo = db.prepare("PRAGMA table_info(clients)").all();
const clientColumns = clientTableInfo.map((c: any) => c.name);

if (!clientColumns.includes('nif')) {
  db.exec("ALTER TABLE clients ADD COLUMN nif TEXT");
}
if (!clientColumns.includes('address')) {
  db.exec("ALTER TABLE clients ADD COLUMN address TEXT");
}
if (!clientColumns.includes('localidade')) {
  db.exec("ALTER TABLE clients ADD COLUMN localidade TEXT");
}
if (!clientColumns.includes('codigo_postal')) {
  db.exec("ALTER TABLE clients ADD COLUMN codigo_postal TEXT");
}
if (!clientColumns.includes('provincia')) {
  db.exec("ALTER TABLE clients ADD COLUMN provincia TEXT");
}
if (!clientColumns.includes('municipio')) {
  db.exec("ALTER TABLE clients ADD COLUMN municipio TEXT");
}
if (!clientColumns.includes('pais')) {
  db.exec("ALTER TABLE clients ADD COLUMN pais TEXT");
}
if (!clientColumns.includes('telefone')) {
  db.exec("ALTER TABLE clients ADD COLUMN telefone TEXT");
}
if (!clientColumns.includes('webpage')) {
  db.exec("ALTER TABLE clients ADD COLUMN webpage TEXT");
}
if (!clientColumns.includes('tipo_cliente')) {
  db.exec("ALTER TABLE clients ADD COLUMN tipo_cliente TEXT");
}

// Migration: Add missing columns to products table if they don't exist
const productTableInfo = db.prepare("PRAGMA table_info(products)").all();
const productColumns = productTableInfo.map((c: any) => c.name);

if (!productColumns.includes('referente')) {
  db.exec("ALTER TABLE products ADD COLUMN referente TEXT");
}
if (!productColumns.includes('data_registo')) {
  db.exec("ALTER TABLE products ADD COLUMN data_registo DATE");
}
if (!productColumns.includes('armazem')) {
  db.exec("ALTER TABLE products ADD COLUMN armazem TEXT");
}
if (!productColumns.includes('tipo_documento')) {
  db.exec("ALTER TABLE products ADD COLUMN tipo_documento TEXT");
}
if (!productColumns.includes('preco_compra')) {
  db.exec("ALTER TABLE products ADD COLUMN preco_compra REAL");
}
if (!productColumns.includes('finalidade')) {
  db.exec("ALTER TABLE products ADD COLUMN finalidade TEXT");
}
if (!productColumns.includes('tipologia')) {
  db.exec("ALTER TABLE products ADD COLUMN tipologia TEXT");
}

const purchasesTableInfo = db.prepare("PRAGMA table_info(purchases)").all();
const purchasesColumns = purchasesTableInfo.map((c: any) => c.name);
if (!purchasesColumns.includes('work_site_id')) {
  db.exec("ALTER TABLE purchases ADD COLUMN work_site_id INTEGER");
}

// Migration: Add missing columns to invoices table if they don't exist
const invoiceTableInfo = db.prepare("PRAGMA table_info(invoices)").all();
const invoiceColumns = invoiceTableInfo.map((c: any) => c.name);

const missingInvoiceColumns = [
  { name: 'hash', type: 'TEXT' },
  { name: 'signature', type: 'TEXT' },
  { name: 'work_site_id', type: 'TEXT' },
  { name: 'vat_withholding', type: 'REAL DEFAULT 0' },
  { name: 'exchange_rate', type: 'REAL DEFAULT 1' },
  { name: 'currency', type: 'TEXT DEFAULT "Kwanza"' },
  { name: 'counter_value', type: 'REAL DEFAULT 0' },
  { name: 'global_discount', type: 'REAL DEFAULT 0' },
  { name: 'cash_box', type: 'TEXT' },
  { name: 'payment_method', type: 'TEXT' },
  { name: 'service_date', type: 'DATE' },
  { name: 'service_location', type: 'TEXT' },
  { name: 'is_certified', type: 'BOOLEAN DEFAULT 0' },
  { name: 'series_id', type: 'INTEGER' }
];

for (const col of missingInvoiceColumns) {
  if (!invoiceColumns.includes(col.name)) {
    db.exec(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type}`);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Supabase Availability Check
  let supabaseEnabled = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
  if (supabaseEnabled) {
    console.log("Supabase credentials found, verifying tables...");
    try {
      // Check for a core table to verify schema readiness
      const { error } = await supabase.from('products').select('id').limit(1);
      
      if (error) {
        console.warn("Supabase tables missing or schema not initialized. Falling back to local SQLite.");
        console.warn("Error detail:", error.message);
        supabaseEnabled = false;
      } else {
        console.log("Supabase connection and schema verified.");
      }
    } catch (err) {
      console.error("Supabase connection failed unexpectedly:", err);
      supabaseEnabled = false;
    }
  } else {
    console.log("Supabase not configured, using local SQLite.");
  }

  // API Routes
  
  // Users
  app.post("/api/login-local", (req, res) => {
    const { identifier, password } = req.body;
    try {
      const user = db.prepare(`
        SELECT * FROM users 
        WHERE (username = ? OR email = ?) AND password_hash = ?
      `).get(identifier, identifier, password) as any;

      if (!user) {
        return res.status(401).json({ error: "Credenciais inválidas ou utilizador não encontrado no modo de teste." });
      }

      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/register-company", async (req, res) => {
    const { companyName, username, email, password } = req.body;
    
    const localRegister = () => {
      console.warn("⚠️ Realizando registo apenas na base de dados local.");
      try {
        const userId = crypto.randomUUID();
        const empresaId = crypto.randomUUID();
        
        // Inserir na tabela local 'users' (senha em plain text apenas para teste local sem Supabase)
        db.prepare(`
          INSERT INTO users (id, username, email, empresa_id, role, password_hash)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, username, email, empresaId, 'admin', password);

        return res.json({ success: true, empresaId, message: "Registo local concluído (Modo de Teste)" });
      } catch (err: any) {
        return res.status(500).json({ error: "Erro no registo local: " + err.message });
      }
    };

    // Se o Supabase não estiver configurado ou habilitado, fazemos apenas o registo local
    if (!supabase || !supabaseEnabled) {
      return localRegister();
    }

    try {
      // 1. Criar utilizador no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            company_name: companyName
          }
        }
      });

      if (authError) {
        // Se o erro for de conexão, tenta local
        if (authError.message === 'fetch failed' || (authError as any).code === 'ENOTFOUND') {
          return localRegister();
        }
        return res.status(400).json({ error: authError.message });
      }

      if (!authData.user) {
        return res.status(400).json({ error: "Erro ao criar utilizador." });
      }

      const empresaId = crypto.randomUUID();
      
      // 2. Inserir na tabela local 'users'
      db.prepare(`
        INSERT INTO users (id, username, email, empresa_id, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(authData.user.id, username, email, empresaId, 'admin');

      res.json({ success: true, empresaId });
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.message === 'fetch failed' || err.code === 'ENOTFOUND' || err.message.includes('ENOTFOUND')) {
        return localRegister();
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users/by-username/:username", async (req, res) => {
    const { username } = req.params;
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("users").select("email, username").eq("username", username).single();
        if (!error && data) return res.json(data);
      }
      const user = db.prepare("SELECT email, username FROM users WHERE username = ?").get(username);
      if (!user) return res.status(404).json({ error: "Utilizador não encontrado" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/users/profile/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
        if (!error && data) return res.json(data);
      }
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      if (!user) return res.status(404).json({ error: "Perfil não encontrado" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    const { empresa_id } = req.query;
    try {
      if (supabaseEnabled) {
        let query = supabase.from("clients").select("*").order("name", { ascending: true });
        if (empresa_id) query = query.eq("empresa_id", empresa_id);
        const { data, error } = await query;
        if (!error) return res.json(data);
      }
      let sql = "SELECT * FROM clients";
      const params = [];
      if (empresa_id) {
        sql += " WHERE empresa_id = ?";
        params.push(empresa_id);
      }
      sql += " ORDER BY name ASC";
      const clients = db.prepare(sql).all(...params);
      res.json(clients);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.post("/api/clients", async (req, res) => {
    const { name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, initial_balance, empresa_id, estado_nif } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("clients").insert([{ name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, initial_balance, empresa_id, estado_nif: estado_nif || 'não encontrado' }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO clients (name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, initial_balance, empresa_id, estado_nif) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, initial_balance || 0, empresa_id, estado_nif || 'não encontrado');
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, initial_balance, estado_nif } = req.body;
    try {
      if (supabaseEnabled) {
        const { error } = await supabase.from("clients").update({ name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, initial_balance, estado_nif }).eq("id", id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        db.prepare(`
          UPDATE clients 
          SET name = ?, email = ?, nif = ?, address = ?, localidade = ?, codigo_postal = ?, provincia = ?, municipio = ?, pais = ?, telefone = ?, webpage = ?, tipo_cliente = ?, initial_balance = ?, estado_nif = ?
          WHERE id = ?
        `).run(name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, initial_balance, estado_nif, id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    const { empresa_id } = req.query;
    try {
      if (supabaseEnabled) {
        let query = supabase.from("products").select("*").order("name", { ascending: true });
        if (empresa_id) query = query.eq("empresa_id", empresa_id);
        const { data, error } = await query;
        if (!error) return res.json(data);
      }
      let sql = "SELECT * FROM products";
      const params = [];
      if (empresa_id) {
        sql += " WHERE empresa_id = ?";
        params.push(empresa_id);
      }
      sql += " ORDER BY name ASC";
      const products = db.prepare(sql).all(...params);
      res.json(products);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.post("/api/products", async (req, res) => {
    const { name, referente, data_registo, warehouse_id, tipo_documento, cost_price, price, finalidade, tipologia, unit, stock_quantity, min_stock, category, barcode, empresa_id } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("products").insert([{ name, referente, data_registo, warehouse_id, tipo_documento, cost_price, price, finalidade, tipologia, unit, stock_quantity, min_stock, category, barcode, empresa_id }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare(`
        INSERT INTO products (
          name, referente, data_registo, warehouse_id, tipo_documento, 
          cost_price, price, finalidade, tipologia, unit, 
          stock_quantity, min_stock, category, barcode, empresa_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, referente, data_registo, warehouse_id, tipo_documento, 
        cost_price, price, finalidade, tipologia, unit, 
        stock_quantity, min_stock, category, barcode, empresa_id
      );
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.get("/api/stock-movements", async (req, res) => {
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("stock_movements").select("*, products(name), warehouses(name)").order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    const movements = db.prepare(`
      SELECT sm.*, p.name as product_name, w.name as warehouse_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN warehouses w ON sm.warehouse_id = w.id
      ORDER BY sm.created_at DESC
    `).all();
    res.json(movements);
  });

  app.post("/api/stock-movements", async (req, res) => {
    const { product_id, type, quantity, warehouse_id, to_warehouse_id, description, reference_id, unit_price } = req.body;
    
    const transaction = db.transaction(() => {
      const product = db.prepare("SELECT stock_quantity FROM products WHERE id = ?").get(product_id) as { stock_quantity: number };
      if (!product) throw new Error("Produto não encontrado");
      
      const previous_stock = product.stock_quantity;
      let current_stock = previous_stock;
      
      if (type === 'entry' || type === 'adjustment_plus') {
        current_stock += quantity;
      } else if (type === 'exit' || type === 'adjustment_minus') {
        current_stock -= quantity;
      }
      
      db.prepare("UPDATE products SET stock_quantity = ? WHERE id = ?").run(current_stock, product_id);
      
      const info = db.prepare(`
        INSERT INTO stock_movements (
          product_id, type, quantity, previous_stock, current_stock, 
          warehouse_id, to_warehouse_id, description, reference_id, unit_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(product_id, type, quantity, previous_stock, current_stock, warehouse_id, to_warehouse_id, description, reference_id, unit_price || 0);
      
      return info.lastInsertRowid;
    });
    
    try {
      const id = transaction();
      res.json({ id });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("invoices")
          .select("*, clients(name), work_sites(title)")
          .order("created_at", { ascending: false });
        
        if (!error) {
          const formatted = data.map(i => ({ 
            ...i, 
            client_name: i.clients?.name,
            work_site_title: i.work_sites?.title
          }));
          return res.json(formatted);
        }
        console.warn("Supabase error in /api/invoices, falling back to SQLite:", error.message);
      }
      
      const invoices = db.prepare(`
        SELECT i.*, c.name as client_name, ws.title as work_site_title
        FROM invoices i 
        LEFT JOIN clients c ON i.client_id = c.id 
        LEFT JOIN work_sites ws ON i.work_site_id = ws.id
        ORDER BY i.created_at DESC
      `).all();
      res.json(invoices);
    } catch (error) {
      console.error("Error in /api/invoices:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/payroll", async (req, res) => {
    const { employee_id, month, year, base_salary, inss_worker, inss_company, irt, net_salary } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("payroll")
        .insert([{ employee_id, month, year, base_salary, inss_worker, inss_company, irt, net_salary }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json(data[0]);
    } else {
      const info = db.prepare(`
        INSERT INTO payroll (employee_id, month, year, base_salary, inss_worker, inss_company, irt, net_salary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(employee_id, month, year, base_salary, inss_worker, inss_company, irt, net_salary);
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.get("/api/payroll", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("payroll")
          .select("*, employees(name)")
          .order("created_at", { ascending: false });
        if (!error) {
          const formatted = data.map(p => ({ ...p, employee_name: p.employees?.name }));
          return res.json(formatted);
        }
      }
      const payroll = db.prepare(`
        SELECT p.*, e.name as employee_name 
        FROM payroll p 
        JOIN employees e ON p.employee_id = e.id 
        ORDER BY p.created_at DESC
      `).all();
      res.json(payroll);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.get("/api/issued-documents", async (req, res) => {
    console.log("GET /api/issued-documents called");
    const { empresa_id } = req.query;
    try {
      if (supabaseEnabled) {
        let query = supabase
          .from("invoices")
          .select("*, clients(name), fiscal_series(description), work_sites(title)");
        
        if (empresa_id) {
          query = query.eq("empresa_id", empresa_id);
        }
        
        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error) {
          const formatted = data.map(i => ({ 
            ...i, 
            client_name: i.clients?.name || 'Cliente não encontrado',
            series_name: i.fiscal_series?.description,
            work_site_title: i.work_sites?.title
          }));
          console.log(`Fetched ${formatted.length} documents from Supabase`);
          return res.json(formatted);
        }
        console.warn("Supabase error in /api/issued-documents, falling back to SQLite:", error.message);
      }
      
      let queryStr = `
          SELECT i.*, c.name as client_name, s.description as series_name, ws.title as work_site_title
          FROM invoices i 
          LEFT JOIN clients c ON i.client_id = c.id 
          LEFT JOIN fiscal_series s ON i.series_id = s.id
          LEFT JOIN work_sites ws ON i.work_site_id = ws.id
      `;
      const params: any[] = [];
      if (empresa_id) {
        queryStr += " WHERE i.empresa_id = ?";
        params.push(empresa_id);
      }
      queryStr += " ORDER BY i.created_at DESC";
      
      const invoices = db.prepare(queryStr).all(...params);
      console.log(`Fetched ${invoices.length} documents from SQLite`);
      res.json(invoices);
    } catch (error) {
      console.error("Error in /api/issued-documents:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch issued documents" });
    }
  });

  app.post("/api/invoices/:id/certify", async (req, res) => {
    const { id } = req.params;
    if (supabaseEnabled) {
      const { error } = await supabase.from("invoices").update({ is_certified: true }).eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      db.prepare("UPDATE invoices SET is_certified = 1 WHERE id = ?").run(id);
      res.json({ success: true });
    }
  });

  app.post("/api/invoices/:id/cancel", async (req, res) => {
    const { id } = req.params;
    try {
      let invoice: any;
      if (supabaseEnabled) {
        const { data } = await supabase.from("invoices").select("*, invoice_items(*)").eq("id", id).single();
        invoice = data;
      } else {
        invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
        if (invoice) {
          invoice.items = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(id);
        }
      }

      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      if (!invoice.is_certified) return res.status(400).json({ error: "Only certified documents can be canceled" });

      if (supabaseEnabled) {
        await supabase.from("invoices").update({ status: 'anulado', is_anulado: 1 }).eq("id", id);
      } else {
        db.prepare("UPDATE invoices SET status = 'anulado', is_anulado = 1 WHERE id = ?").run(id);
      }

      for (const item of (invoice.items || invoice.invoice_items || [])) {
        if (item.product_id) {
          if (supabaseEnabled) {
            const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", item.product_id).single();
            if (product) {
              await supabase.from("products").update({ stock_quantity: product.stock_quantity + item.quantity }).eq("id", item.product_id);
            }
          } else {
            db.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?").run(item.quantity, item.product_id);
          }
        }
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel document" });
    }
  });

  app.post("/api/invoices/:id/clone", async (req, res) => {
    const { id } = req.params;
    try {
      let original: any;
      if (supabaseEnabled) {
        const { data } = await supabase.from("invoices").select("*, invoice_items(*)").eq("id", id).single();
        original = data;
      } else {
        original = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
        if (original) {
          original.items = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(id);
        }
      }
      if (!original) return res.status(404).json({ error: "Original invoice not found" });
      res.json(original);
    } catch (error) {
      res.status(500).json({ error: "Failed to clone document" });
    }
  });

  app.post("/api/receipts", async (req, res) => {
    const { invoice_id, empresa_id, amount, payment_method, cash_box, date } = req.body;
    try {
      const lastReceipt = db.prepare("SELECT receipt_number FROM receipts WHERE empresa_id = ? ORDER BY id DESC LIMIT 1").get(empresa_id);
      let nextNum = 1;
      if (lastReceipt && lastReceipt.receipt_number) {
        const numMatch = lastReceipt.receipt_number.match(/\d+$/);
        if (numMatch) nextNum = parseInt(numMatch[0]) + 1;
      }
      const receipt_number = `RC${String(nextNum).padStart(3, '0')}`;

      if (supabaseEnabled) {
        await supabase.from("receipts").insert([{ invoice_id, empresa_id, receipt_number, amount, payment_method, cash_box, date }]);
      } else {
        db.prepare(`
          INSERT INTO receipts (invoice_id, empresa_id, receipt_number, amount, payment_method, cash_box, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(invoice_id, empresa_id, receipt_number, amount, payment_method, cash_box, date);
      }

      let invoice: any;
      if (supabaseEnabled) {
        const { data } = await supabase.from("invoices").select("total").eq("id", invoice_id).single();
        const { data: receipts } = await supabase.from("receipts").select("amount").eq("invoice_id", invoice_id);
        invoice = data;
        const totalPaid = receipts?.reduce((sum, r) => sum + r.amount, 0) || 0;
        const newStatus = totalPaid >= invoice.total ? 'paid' : 'partial';
        await supabase.from("invoices").update({ payment_status: newStatus }).eq("id", invoice_id);
      } else {
        invoice = db.prepare("SELECT total FROM invoices WHERE id = ?").get(invoice_id);
        const totalPaid = db.prepare("SELECT SUM(amount) as total FROM receipts WHERE invoice_id = ?").get(invoice_id).total || 0;
        const newStatus = totalPaid >= invoice.total ? 'paid' : 'partial';
        db.prepare("UPDATE invoices SET payment_status = ? WHERE id = ?").run(newStatus, invoice_id);
      }
      res.json({ success: true, receipt_number });
    } catch (error) {
      res.status(500).json({ error: "Failed to create receipt" });
    }
  });

  app.get("/api/invoices/:id/receipts", async (req, res) => {
    const { id } = req.params;
    try {
      if (supabaseEnabled) {
        const { data } = await supabase.from("receipts").select("*").eq("invoice_id", id);
        res.json(data);
      } else {
        const receipts = db.prepare("SELECT * FROM receipts WHERE invoice_id = ?").all(id);
        res.json(receipts);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  app.put("/api/invoices/:id/partial", async (req, res) => {
    const { id } = req.params;
    const { due_date, payment_method, cash_box, work_site_id } = req.body;
    try {
      if (supabaseEnabled) {
        await supabase.from("invoices").update({ due_date, payment_method, cash_box, work_site_id }).eq("id", id);
      } else {
        db.prepare(`
          UPDATE invoices 
          SET due_date = ?, payment_method = ?, cash_box = ?, work_site_id = ?
          WHERE id = ?
        `).run(due_date, payment_method, cash_box, work_site_id, id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (supabaseEnabled) {
        // AGT Rule: Do not delete, only void (anular)
        const { error } = await supabase.from("invoices").update({ status: 'anulado' }).eq("id", id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, message: 'Documento anulado com sucesso' });
      } else {
        db.prepare("UPDATE invoices SET status = 'anulado' WHERE id = ?").run(id);
        res.json({ success: true, message: 'Documento anulado com sucesso' });
      }
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.post("/api/invoices/:id/clone", async (req, res) => {
    const { id } = req.params;
    try {
      if (supabaseEnabled) {
        const { data: original, error: fetchError } = await supabase.from("invoices").select("*").eq("id", id).single();
        if (fetchError) return res.status(500).json({ error: fetchError.message });
        
        const { id: _, created_at: __, numero_documento: ___, ...clonedData } = original;
        clonedData.numero_documento = `CLONE-${original.numero_documento}-${Date.now()}`;
        clonedData.is_certified = false;
        
        const { data, error } = await supabase.from("invoices").insert([clonedData]).select();
        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);
      } else {
        const original = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
        if (!original) return res.status(404).send("Invoice not found");
        
        const { id: _, created_at: __, numero_documento: ___, ...clonedData } = original;
        const keys = Object.keys(clonedData);
        const values = Object.values(clonedData);
        const placeholders = keys.map(() => '?').join(', ');
        
        const newNumero = `CLONE-${original.numero_documento}-${Date.now()}`;
        const newKeys = [...keys, 'numero_documento', 'is_certified'];
        const newValues = [...values, newNumero, 0];
        const newPlaceholders = newKeys.map(() => '?').join(', ');
        
        const info = db.prepare(`INSERT INTO invoices (${newKeys.join(', ')}) VALUES (${newPlaceholders})`).run(...newValues);
        res.json({ id: info.lastInsertRowid });
      }
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.get("/api/work-sites", async (req, res) => {
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("work_sites")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (!error) {
        const formatted = data.map(w => ({ ...w, client_name: w.clients.name }));
        return res.json(formatted);
      }
      console.warn("Supabase error in /api/work-sites, falling back to SQLite:", error.message);
    }
    const rows = db.prepare(`
        SELECT work_sites.*, clients.name as client_name 
        FROM work_sites 
        JOIN clients ON work_sites.client_id = clients.id
        ORDER BY work_sites.created_at DESC
      `).all();
    res.json(rows);
  });

  app.post("/api/work-sites", async (req, res) => {
    const { client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("work_sites")
        .insert([{ client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare(`
        INSERT INTO work_sites (client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations);
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.put("/api/work-sites/:id", async (req, res) => {
    const { client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations } = req.body;
    if (supabaseEnabled) {
      const { error } = await supabase
        .from("work_sites")
        .update({ client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations })
        .eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      db.prepare(`
        UPDATE work_sites 
        SET client_id = ?, start_date = ?, end_date = ?, title = ?, code = ?, staff_per_day = ?, total_staff = ?, location = ?, description = ?, contact = ?, observations = ?
        WHERE id = ?
      `).run(client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations, req.params.id);
      res.json({ success: true });
    }
  });

  app.get("/api/work-sites/:id/movements", async (req, res) => {
    const { id } = req.params;
    const empresa_id = req.query.empresa_id;

    if (supabaseEnabled) {
      let query = supabase.from("work_site_movements").select("*").eq("work_site_id", id);
      if (empresa_id) {
        query = query.eq("empresa_id", empresa_id);
      }
      const { data, error } = await query.order("date", { ascending: true }).order("created_at", { ascending: true });
      if (!error) return res.json(data);
      console.warn("Supabase error in /api/work-sites/:id/movements, falling back to SQLite:", error.message);
    }

    let queryStr = "SELECT * FROM work_site_movements WHERE work_site_id = ?";
    const params: any[] = [id];
    if (empresa_id) {
      queryStr += " AND empresa_id = ?";
      params.push(empresa_id);
    }
    queryStr += " ORDER BY date ASC, created_at ASC";

    const rows = db.prepare(queryStr).all(...params);
    res.json(rows);
  });

  app.post("/api/work-sites/:id/movements", async (req, res) => {
    const { date, doc_no, company, description, debit, credit, empresa_id } = req.body;
    const work_site_id = req.params.id;

    // Calculate new balance
    let currentBalance = 0;
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("work_site_movements")
        .select("balance")
        .eq("work_site_id", work_site_id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
      if (!error && data && data.length > 0) {
        currentBalance = data[0].balance;
      }
    } else {
      const lastMovement = db.prepare("SELECT balance FROM work_site_movements WHERE work_site_id = ? ORDER BY date DESC, created_at DESC LIMIT 1").get(work_site_id);
      if (lastMovement) {
        currentBalance = lastMovement.balance;
      }
    }

    const newBalance = currentBalance + (Number(credit) || 0) - (Number(debit) || 0);

    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("work_site_movements")
        .insert([{ work_site_id, date, doc_no, company, description, debit: debit || 0, credit: credit || 0, balance: newBalance, empresa_id }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id, balance: newBalance });
    } else {
      const info = db.prepare(`
        INSERT INTO work_site_movements (work_site_id, date, doc_no, company, description, debit, credit, balance, empresa_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(work_site_id, date, doc_no, company, description, debit || 0, credit || 0, newBalance, empresa_id);
      
      res.json({ id: info.lastInsertRowid, balance: newBalance });
    }
  });

  app.get("/api/invoices/:id", (req, res) => {
    const invoice = db.prepare(`
      SELECT i.*, c.name as client_name, c.email as client_email, c.nif as client_nif, c.address as client_address
      FROM invoices i 
      JOIN clients c ON i.client_id = c.id 
      WHERE i.id = ?
    `).get(req.params.id);

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const items = db.prepare("SELECT * FROM invoice_items WHERE invoice_id = ?").all(req.params.id);
    res.json({ ...invoice, items });
  });

  app.post("/api/invoices", async (req, res) => {
    console.log("POST /api/invoices called with body:", JSON.stringify(req.body, null, 2));
    try {
      const { 
        client_id, date, due_date, items, document_type, work_site_id, 
        vat_withholding, exchange_rate, currency, counter_value, global_discount,
        service_date, service_location, cash_box, payment_method, series_id, empresa_id
      } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: "A fatura deve conter pelo menos um item." });
      }

    // Normalize IDs
    const normalizedSeriesId = series_id === '' ? null : series_id;
    const normalizedWorkSiteId = work_site_id === '' ? null : work_site_id;
    
    // Check client NIF status
    let client;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("clients").select("estado_nif").eq("id", client_id).single();
      if (!error) client = data;
    } else {
      client = db.prepare("SELECT estado_nif FROM clients WHERE id = ?").get(client_id);
    }
    
    if (client && client.estado_nif === 'suspenso') {
      return res.status(400).json({ error: "Não é possível emitir fatura: O NIF do cliente está suspenso." });
    }

    // Get Series info
    let seriesDesc = 'A';
    if (normalizedSeriesId) {
      const series = db.prepare("SELECT description FROM fiscal_series WHERE id = ?").get(normalizedSeriesId);
      if (series) seriesDesc = series.description;
    }

    // Get Prefix
    let prefix = 'FT';
    const docTypeLower = (document_type || '').toLowerCase();
    if (docTypeLower.includes('fatura recibo')) prefix = 'FR';
    else if (docTypeLower.includes('recibo')) prefix = 'RC';
    else if (docTypeLower.includes('nota de crédito')) prefix = 'NC';
    else if (docTypeLower.includes('guia de entrega')) prefix = 'GE';
    else if (docTypeLower.includes('fatura')) prefix = 'FT';

    // Get next number for this series and type
    const lastInvoice = db.prepare(`
      SELECT invoice_number 
      FROM invoices 
      WHERE series_id = ? AND document_type = ? 
      ORDER BY id DESC LIMIT 1
    `).get(normalizedSeriesId, document_type);

    let nextNum = 1;
    if (lastInvoice && lastInvoice.invoice_number) {
      // Extract number from format "PREFIX SERIES/NUMBER" or "PREFIXNUMBER"
      const parts = lastInvoice.invoice_number.split('/');
      if (parts.length > 1) {
        nextNum = parseInt(parts[1]) + 1;
      } else {
        // Try to extract number from end of string (e.g. FT001 -> 1)
        const numMatch = lastInvoice.invoice_number.match(/\d+$/);
        if (numMatch) {
          nextNum = parseInt(numMatch[0]) + 1;
        }
      }
    }
    
    // Format: FT001, FT002, etc. (using 3 digits padding as per example)
    const invoice_number = `${prefix}${String(nextNum).padStart(3, '0')}`;
    const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

    // Fiscal Logic
    let prevHash = '0';
    try {
      if (supabaseEnabled) {
        prevHash = await getPreviousHash(supabase);
      } else {
        const lastInv = db.prepare("SELECT hash FROM invoices ORDER BY id DESC LIMIT 1").get();
        if (lastInv && lastInv.hash) prevHash = lastInv.hash;
      }
    } catch (e) {
      console.warn("Error getting previous hash:", e);
    }

    const docContent = `${invoice_number}${date}${total}${prevHash}`;
    const hash = generateDocumentHash(docContent);
    const signature = signDocument(docContent);

    if (supabaseEnabled) {
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert([{ 
          client_id, invoice_number, date, due_date, total, hash, 
          document_type, work_site_id, vat_withholding, exchange_rate, 
          currency, counter_value, global_discount, signature,
          service_date, service_location, cash_box, payment_method,
          series_id, empresa_id, status: 'ativo'
        }])
        .select();
      if (invError) return res.status(500).json({ error: invError.message });
      
      const invoiceId = invoice[0].id;
      await supabase.from("hash_chain").insert([{ document_id: invoiceId, previous_hash: prevHash, current_hash: hash }]);
      
      const itemsToInsert = items.map((item: any) => ({
        invoice_id: invoiceId,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      }));
      await supabase.from("invoice_items").insert(itemsToInsert);

      // Update stock and record movements for products
      for (const item of items) {
        if (item.product_id) {
          const { data: product } = await supabase.from("products").select("stock_quantity, warehouse_id, cost_price").eq("id", item.product_id).single();
          if (product) {
            const prevStock = product.stock_quantity;
            const currStock = prevStock - item.quantity;
            await supabase.from("products").update({ stock_quantity: currStock }).eq("id", item.product_id);
            await supabase.from("stock_movements").insert([{
              product_id: item.product_id,
              type: 'exit',
              quantity: item.quantity,
              previous_stock: prevStock,
              current_stock: currStock,
              warehouse_id: product.warehouse_id,
              description: `Venda: ${invoice_number}`,
              reference_id: invoiceId,
              unit_price: product.cost_price || 0
            }]);
          }
        }
      }

      await supabase.from("transactions").insert([{ type: 'income', category: 'sale', amount: total, description: `${document_type} ${invoice_number}`, reference_id: invoiceId }]);
      
      if (normalizedWorkSiteId) {
        const { data: movements } = await supabase
          .from("work_site_movements")
          .select("balance")
          .eq("work_site_id", normalizedWorkSiteId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1);
          
        const currentBalance = movements && movements.length > 0 ? movements[0].balance : 0;
        const newBalance = currentBalance + total;

        await supabase.from("work_site_movements").insert([{
          work_site_id: normalizedWorkSiteId,
          date,
          doc_no: invoice_number,
          company: 'Cliente',
          description: `${document_type} ${invoice_number}`,
          debit: 0,
          credit: total,
          balance: newBalance
        }]);
      }
      
      res.json({ id: invoiceId, invoice_number });
    } else {
      // SQLite fallback
      const transaction = db.transaction(() => {
        const info = db.prepare(`
          INSERT INTO invoices (
            client_id, invoice_number, date, due_date, total, hash, 
            document_type, work_site_id, vat_withholding, exchange_rate, 
            currency, counter_value, global_discount, signature,
            service_date, service_location, cash_box, payment_method,
            series_id, status, empresa_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          client_id, invoice_number, date, due_date, total, hash, 
          document_type, normalizedWorkSiteId, vat_withholding, exchange_rate, 
          currency, counter_value, global_discount, signature,
          service_date, service_location, cash_box, payment_method,
          normalizedSeriesId, 'ativo', empresa_id
        );
        const invoiceId = info.lastInsertRowid;
        
        const insertItem = db.prepare("INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)");
        const updateStock = db.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
        const insertMovement = db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, current_stock, warehouse_id, description, reference_id, unit_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          insertItem.run(invoiceId, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price);
          
          if (item.product_id) {
            const product = db.prepare("SELECT stock_quantity, warehouse_id, cost_price FROM products WHERE id = ?").get(item.product_id);
            if (product) {
              const prevStock = product.stock_quantity;
              const currStock = prevStock - item.quantity;
              updateStock.run(item.quantity, item.product_id);
              insertMovement.run(
                item.product_id, 
                'exit', 
                item.quantity, 
                prevStock, 
                currStock, 
                product.warehouse_id, 
                `Venda: ${invoice_number}`, 
                invoiceId,
                product.cost_price || 0
              );
            }
          }
        }

        db.prepare("INSERT INTO hash_chain (document_id, previous_hash, current_hash) VALUES (?, ?, ?)").run(invoiceId, prevHash, hash);
        db.prepare("INSERT INTO transactions (type, category, amount, description, reference_id) VALUES (?, ?, ?, ?, ?)").run('income', 'sale', total, `${document_type} ${invoice_number}`, invoiceId);
        
        if (normalizedWorkSiteId) {
          const lastMovement = db.prepare("SELECT balance FROM work_site_movements WHERE work_site_id = ? ORDER BY date DESC, created_at DESC LIMIT 1").get(normalizedWorkSiteId) as { balance: number } | undefined;
          const currentBalance = lastMovement ? lastMovement.balance : 0;
          const newBalance = currentBalance + total;

          db.prepare(`
            INSERT INTO work_site_movements (work_site_id, date, doc_no, company, description, debit, credit, balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(normalizedWorkSiteId, date, invoice_number, 'Cliente', `${document_type} ${invoice_number}`, 0, total, newBalance);
        }
        
        return invoiceId;
      });
      const id = transaction();
      res.json({ id, invoice_number });
    }
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create invoice" });
  }
});

  // HR Endpoints
  app.get("/api/professions", async (req, res) => {
    console.log("GET /api/professions called");
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("professions").select("*").order("name", { ascending: true });
        if (!error) {
          return res.json(data);
        }
        console.warn("Supabase error in /api/professions, falling back to SQLite:", error.message);
      }
      const professions = db.prepare("SELECT * FROM professions ORDER BY name ASC").all();
      res.json(professions);
    } catch (error) {
      console.error("Error in /api/professions:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/professions", async (req, res) => {
    const { name, inss_profession, base_salary } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("professions").insert([{ name, inss_profession, base_salary }]).select();
      if (!error) {
        return res.json({ id: data[0].id });
      }
      console.warn("Supabase error in POST /api/professions, falling back to SQLite:", error.message);
    }
    const info = db.prepare("INSERT INTO professions (name, inss_profession, base_salary) VALUES (?, ?, ?)").run(name, inss_profession, base_salary);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/professions/:id", async (req, res) => {
    if (supabaseEnabled) {
      const { error } = await supabase.from("professions").delete().eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      db.prepare("DELETE FROM professions WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    }
  });

  app.get("/api/employees", async (req, res) => {
    console.log("GET /api/employees called");
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("employees")
          .select("*, professions(name)")
          .order("name", { ascending: true });
        
        if (!error) {
          const formatted = data.map(e => ({ ...e, profession_name: e.professions?.name }));
          return res.json(formatted);
        }
        console.warn("Supabase error in /api/employees, falling back to SQLite:", error.message);
      }
      
      const employees = db.prepare(`
        SELECT e.*, p.name as profession_name 
        FROM employees e 
        LEFT JOIN professions p ON e.profession_id = p.id 
        ORDER BY e.name ASC
      `).all();
      res.json(employees);
    } catch (error) {
      console.error("Error in /api/employees:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/employees", async (req, res) => {
    console.log("POST /api/employees called with body:", JSON.stringify(req.body, null, 2));
    const { 
      name, role, profession_id, salary, email, phone, hired_at,
      nif, address, iban, bank_name, image_url, birth_date,
      gender, marital_status, academic_level, department,
      bi, contract_type, dependents, subject_to_irt, subject_to_inss,
      bank_account, inss_number
    } = req.body;
    
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("employees")
        .insert([{ 
          name, role, profession_id, salary, email, phone, hired_at,
          nif, address, iban, bank_name, image_url, birth_date,
          gender, marital_status, academic_level, department,
          bi, contract_type, dependents, subject_to_irt, subject_to_inss,
          bank_account, inss_number
        }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare(`
        INSERT INTO employees (
          name, role, profession_id, salary, email, phone, hired_at,
          nif, address, iban, bank_name, image_url, birth_date,
          gender, marital_status, academic_level, department,
          bi, contract_type, dependents, subject_to_irt, subject_to_inss,
          bank_account, inss_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, role, profession_id, salary, email, phone, hired_at,
        nif, address, iban, bank_name, image_url, birth_date,
        gender, marital_status, academic_level, department,
        bi, contract_type, dependents, subject_to_irt, subject_to_inss,
        bank_account, inss_number
      );
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    if (supabaseEnabled) {
      const { error } = await supabase.from("employees").delete().eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      db.prepare("DELETE FROM employees WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    const { 
      name, role, profession_id, salary, email, phone, hired_at,
      nif, address, iban, bank_name, image_url, birth_date,
      gender, marital_status, academic_level, department, status,
      bi, contract_type, dependents, subject_to_irt, subject_to_inss,
      bank_account, inss_number
    } = req.body;
    
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("employees")
        .update({ 
          name, role, profession_id, salary, email, phone, hired_at,
          nif, address, iban, bank_name, image_url, birth_date,
          gender, marital_status, academic_level, department, status,
          bi, contract_type, dependents, subject_to_irt, subject_to_inss,
          bank_account, inss_number
        })
        .eq("id", req.params.id)
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json(data[0]);
    } else {
      db.prepare(`
        UPDATE employees SET 
          name = ?, role = ?, profession_id = ?, salary = ?, email = ?, phone = ?, hired_at = ?,
          nif = ?, address = ?, iban = ?, bank_name = ?, image_url = ?, birth_date = ?,
          gender = ?, marital_status = ?, academic_level = ?, department = ?, status = ?,
          bi = ?, contract_type = ?, dependents = ?, subject_to_irt = ?, subject_to_inss = ?,
          bank_account = ?, inss_number = ?
        WHERE id = ?
      `).run(
        name, role, profession_id, salary, email, phone, hired_at,
        nif, address, iban, bank_name, image_url, birth_date,
        gender, marital_status, academic_level, department, status,
        bi, contract_type, dependents, subject_to_irt, subject_to_inss,
        bank_account, inss_number,
        req.params.id
      );
      res.json({ success: true });
    }
  });

  app.post("/api/employees/dismiss/:id", async (req, res) => {
    const { date, reason, observations, orderedBy } = req.body;
    const employeeId = req.params.id;

    if (supabaseEnabled) {
      const { error: empError } = await supabase
        .from("employees")
        .update({ 
          status: 'dismissed', 
          dismissed_at: date,
          dismissal_reason: reason,
          dismissal_observations: observations,
          dismissal_ordered_by: orderedBy
        })
        .eq("id", employeeId);
      
      if (empError) return res.status(500).json({ error: empError.message });

      await supabase.from("employee_dismissals").insert([{
        employee_id: employeeId,
        dismissal_date: date,
        reason,
        observations,
        ordered_by: orderedBy
      }]);

      await supabase.from("labor_terminations").insert([{
        employee_id: employeeId,
        dismissal_date: date,
        reason,
        observations,
        ordered_by: orderedBy
      }]);

      res.json({ success: true });
    } else {
      db.prepare(`
        UPDATE employees SET 
          status = 'dismissed', 
          dismissed_at = ?,
          dismissal_reason = ?,
          dismissal_observations = ?,
          dismissal_ordered_by = ?
        WHERE id = ?
      `).run(date, reason, observations, orderedBy, employeeId);

      db.prepare(`
        INSERT INTO employee_dismissals (employee_id, dismissal_date, reason, observations, ordered_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(employeeId, date, reason, observations, orderedBy);

      db.prepare(`
        INSERT INTO labor_terminations (employee_id, dismissal_date, reason, observations, ordered_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(employeeId, date, reason, observations, orderedBy);

      res.json({ success: true });
    }
  });

  app.get("/api/labor-terminations", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("labor_terminations")
          .select("*, employees(name, role)");
        if (!error) return res.json(data);
      }
      const data = db.prepare(`
        SELECT lt.*, e.name as employee_name, e.role as employee_role
        FROM labor_terminations lt
        JOIN employees e ON lt.employee_id = e.id
        ORDER BY lt.dismissal_date DESC
      `).all();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/employees/absences", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("employee_absences")
          .select("*, employees(name)")
          .order("start_date", { ascending: false });
        
        if (!error) {
          const formatted = data.map(a => ({ ...a, employee_name: a.employees?.name }));
          return res.json(formatted);
        }
        console.error("Supabase error in /api/employees/absences, falling back to SQLite:", error);
      }
      
      const absences = db.prepare(`
        SELECT a.*, e.name as employee_name 
        FROM employee_absences a 
        JOIN employees e ON a.employee_id = e.id 
        ORDER BY a.start_date DESC
      `).all();
      res.json(absences);
    } catch (error) {
      console.error("Error in /api/employees/absences:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/employees/absences", async (req, res) => {
    const { employee_id, type, start_date, end_date, amount } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("employee_absences")
        .insert([{ employee_id, type, start_date, end_date, amount }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO employee_absences (employee_id, type, start_date, end_date, amount) VALUES (?, ?, ?, ?, ?)").run(employee_id, type, start_date, end_date, amount);
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.get("/api/employees/attendance", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("employee_attendance")
          .select("*, employees(name)")
          .order("date", { ascending: false });
        
        if (!error) {
          const formatted = data.map(a => ({ ...a, employee_name: a.employees?.name }));
          return res.json(formatted);
        }
        console.error("Supabase error in /api/employees/attendance, falling back to SQLite:", error);
      }
      
      const attendance = db.prepare(`
        SELECT a.*, e.name as employee_name 
        FROM employee_attendance a 
        JOIN employees e ON a.employee_id = e.id 
        ORDER BY a.date DESC
      `).all();
      res.json(attendance);
    } catch (error) {
      console.error("Error in /api/employees/attendance:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/employees/attendance", async (req, res) => {
    const { employee_id, date, status } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("employee_attendance")
        .insert([{ employee_id, date, status }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO employee_attendance (employee_id, date, status) VALUES (?, ?, ?)").run(employee_id, date, status);
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.post("/api/employees/attendance/bulk", async (req, res) => {
    const { attendanceMap, month, year } = req.body;
    // attendanceMap: { employeeId: { day: status } }
    try {
      if (supabaseEnabled) {
        const records = [];
        for (const [empId, days] of Object.entries(attendanceMap)) {
          for (const [day, status] of Object.entries(days as any)) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            records.push({ employee_id: Number(empId), date, status });
          }
        }
        
        // Delete existing records for this month/year first to avoid duplicates if we want to overwrite
        // Or we could use upsert if we had a unique constraint on (employee_id, date)
        // For simplicity, let's just insert. A better way would be upsert.
        const { error } = await supabase.from("employee_attendance").upsert(records, { onConflict: 'employee_id,date' });
        if (error) throw error;
        return res.json({ success: true });
      }

      const transaction = db.transaction(() => {
        const stmtDelete = db.prepare("DELETE FROM employee_attendance WHERE employee_id = ? AND date = ?");
        const stmtInsert = db.prepare("INSERT INTO employee_attendance (employee_id, date, status) VALUES (?, ?, ?)");
        
        for (const [empId, days] of Object.entries(attendanceMap)) {
          for (const [day, status] of Object.entries(days as any)) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            stmtDelete.run(Number(empId), date);
            stmtInsert.run(Number(empId), date, status);
          }
        }
      });
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error("Error in bulk attendance:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/employees/attendance/monthly", async (req, res) => {
    const { month, year } = req.query;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`; // Simplified
    
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("employee_attendance")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate);
        if (error) throw error;
        return res.json(data);
      }
      
      const records = db.prepare("SELECT * FROM employee_attendance WHERE date >= ? AND date <= ?").all(startDate, endDate);
      res.json(records);
    } catch (error) {
      console.error("Error in monthly attendance:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/employees/contracts", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("employee_contracts")
          .select("*, employees(name)");
        
        if (!error) {
          const formatted = data.map(c => ({ ...c, employee_name: c.employees?.name }));
          return res.json(formatted);
        }
        console.error("Supabase error in /api/employees/contracts, falling back to SQLite:", error);
      }
      
      const contracts = db.prepare(`
        SELECT c.*, e.name as employee_name 
        FROM employee_contracts c 
        JOIN employees e ON c.employee_id = e.id 
      `).all();
      res.json(contracts);
    } catch (error) {
      console.error("Error in /api/employees/contracts:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/generated-contracts", (req, res) => {
    const contracts = db.prepare("SELECT c.*, e.name as employee_name FROM generated_contracts c JOIN employees e ON c.employee_id = e.id").all();
    res.json(contracts);
  });

  app.post("/api/generated-contracts", (req, res) => {
    const { employee_id, content } = req.body;
    const info = db.prepare("INSERT INTO generated_contracts (employee_id, content) VALUES (?, ?)").run(employee_id, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/employees/contracts", async (req, res) => {
    const { employee_id, contract_type, start_date, end_date } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("employee_contracts")
        .insert([{ employee_id, contract_type, start_date, end_date }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO employee_contracts (employee_id, contract_type, start_date, end_date) VALUES (?, ?, ?, ?)").run(employee_id, contract_type, start_date, end_date);
      res.json({ id: info.lastInsertRowid });
    }
  });

  // POS Endpoints
  app.get("/api/pos/sales", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("pos_sales").select("*").order("date", { ascending: false });
        if (!error) {
          return res.json(data);
        }
        console.error("Supabase error in /api/pos/sales, falling back to SQLite:", error);
      }
      const sales = db.prepare("SELECT * FROM pos_sales ORDER BY date DESC").all();
      res.json(sales);
    } catch (error) {
      console.error("Error in /api/pos/sales:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/stock/movements", async (req, res) => {
    const { empresa_id, product_id, warehouse_id } = req.query;
    try {
      if (supabaseEnabled) {
        let query = supabase.from("stock_movements").select("*, products(name, referente), warehouses(name)");
        if (empresa_id) query = query.eq("empresa_id", empresa_id);
        if (product_id) query = query.eq("product_id", product_id);
        if (warehouse_id) query = query.eq("warehouse_id", warehouse_id);
        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error) return res.json(data);
      }
      let sql = `
        SELECT sm.*, p.name as product_name, p.referente as product_ref, w.name as warehouse_name 
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        LEFT JOIN warehouses w ON sm.warehouse_id = w.id
      `;
      const params = [];
      const conditions = [];
      if (empresa_id) {
        conditions.push("sm.empresa_id = ?");
        params.push(empresa_id);
      }
      if (product_id) {
        conditions.push("sm.product_id = ?");
        params.push(product_id);
      }
      if (warehouse_id) {
        conditions.push("sm.warehouse_id = ?");
        params.push(warehouse_id);
      }
      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }
      sql += " ORDER BY sm.created_at DESC";
      const rows = db.prepare(sql).all(...params);
      res.json(rows);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.post("/api/stock/movements", async (req, res) => {
    const { product_id, type, quantity, warehouse_id, to_warehouse_id, description, empresa_id, unit_price } = req.body;
    try {
      // 1. Get current stock
      let currentStock = 0;
      if (supabaseEnabled) {
        const { data } = await supabase.from("products").select("stock_quantity").eq("id", product_id).single();
        currentStock = data?.stock_quantity || 0;
      } else {
        const row = db.prepare("SELECT stock_quantity FROM products WHERE id = ?").get(product_id) as { stock_quantity: number };
        currentStock = row?.stock_quantity || 0;
      }

      const previousStock = currentStock;
      let newStock = currentStock;

      if (type === 'entry') newStock += Number(quantity);
      else if (type === 'exit') newStock -= Number(quantity);
      else if (type === 'adjustment') newStock = Number(quantity);
      else if (type === 'adjustment_plus') newStock += Number(quantity);
      else if (type === 'adjustment_minus') newStock -= Number(quantity);
      else if (type === 'transfer') {
        newStock -= Number(quantity);
        // Handle destination stock
        if (to_warehouse_id) {
          if (supabaseEnabled) {
            const { data: product } = await supabase.from("products").select("*").eq("id", product_id).single();
            if (product) {
              const { data: destProduct } = await supabase.from("products")
                .select("*")
                .eq("name", product.name)
                .eq("warehouse_id", to_warehouse_id)
                .single();
              
              if (destProduct) {
                await supabase.from("products").update({ stock_quantity: destProduct.stock_quantity + Number(quantity) }).eq("id", destProduct.id);
              } else {
                await supabase.from("products").insert([{
                  ...product,
                  id: undefined,
                  warehouse_id: to_warehouse_id,
                  stock_quantity: Number(quantity),
                  created_at: undefined
                }]);
              }
            }
          } else {
            const product = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as any;
            if (product) {
              const destProduct = db.prepare("SELECT * FROM products WHERE name = ? AND warehouse_id = ?").get(product.name, to_warehouse_id) as any;
              if (destProduct) {
                db.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?").run(Number(quantity), destProduct.id);
              } else {
                db.prepare(`
                  INSERT INTO products (name, referente, price, cost_price, stock_quantity, min_stock, warehouse_id, unit, category, barcode, image, empresa_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(product.name, product.referente, product.price, product.cost_price, Number(quantity), product.min_stock, to_warehouse_id, product.unit, product.category, product.barcode, product.image, empresa_id);
              }
            }
          }
        }
      }

      // 2. Update product stock (source)
      if (supabaseEnabled) {
        await supabase.from("products").update({ stock_quantity: newStock }).eq("id", product_id);
        const { data, error } = await supabase.from("stock_movements").insert([{
          product_id, type, quantity, previous_stock: previousStock, current_stock: newStock,
          warehouse_id, to_warehouse_id, description, empresa_id, unit_price
        }]).select();
        if (error) throw error;
        res.json(data[0]);
      } else {
        db.prepare("UPDATE products SET stock_quantity = ? WHERE id = ?").run(newStock, product_id);
        const info = db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, current_stock, warehouse_id, to_warehouse_id, description, empresa_id, unit_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(product_id, type, quantity, previousStock, newStock, warehouse_id, to_warehouse_id, description, empresa_id, unit_price || 0);
        res.json({ id: info.lastInsertRowid });
      }
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.put("/api/products/:id/price", async (req, res) => {
    const { id } = req.params;
    const { price, cost_price } = req.body;
    try {
      if (supabaseEnabled) {
        const { error } = await supabase.from("products").update({ price, cost_price }).eq("id", id);
        if (error) throw error;
      } else {
        db.prepare("UPDATE products SET price = ?, cost_price = ? WHERE id = ?").run(price, cost_price, id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.get("/api/warehouses", (req, res) => {
    const warehouses = db.prepare("SELECT * FROM warehouses ORDER BY name ASC").all();
    res.json(warehouses);
  });

  app.post("/api/warehouses", (req, res) => {
    const { name, localidade, provincia, responsavel, contacto, observacao } = req.body;
    const info = db.prepare("INSERT INTO warehouses (name, localidade, provincia, responsavel, contacto, observacao) VALUES (?, ?, ?, ?, ?, ?)").run(name, localidade, provincia, responsavel, contacto, observacao);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/suppliers", (req, res) => {
    const suppliers = db.prepare("SELECT * FROM suppliers ORDER BY name ASC").all();
    res.json(suppliers);
  });

  // Caixa Endpoints
  app.get("/api/caixas", (req, res) => {
    const { empresa_id } = req.query;
    try {
      let query = "SELECT * FROM caixas";
      const params: any[] = [];
      if (empresa_id) {
        query += " WHERE empresa_id = ?";
        params.push(empresa_id);
      }
      query += " ORDER BY name ASC";
      const caixas = db.prepare(query).all(...params);
      res.json(caixas);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/caixas", (req, res) => {
    const { id, name, account, responsible, user, users, initialBalance, currentBalance, obs, bankName, status, empresa_id } = req.body;
    try {
      db.prepare("INSERT INTO caixas (id, name, account, responsible, user, users, initialBalance, currentBalance, obs, bankName, status, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, name, account, responsible, user, users || 1, initialBalance, currentBalance, obs, bankName, status || 'aberto', empresa_id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/caixas/:id/close", (req, res) => {
    try {
      db.prepare("UPDATE caixas SET status = 'fechado' WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/caixa-movements", (req, res) => {
    const { empresa_id } = req.query;
    try {
      let query = "SELECT * FROM caixa_movements";
      const params: any[] = [];
      if (empresa_id) {
        query += " WHERE empresa_id = ?";
        params.push(empresa_id);
      }
      query += " ORDER BY date DESC";
      const movements = db.prepare(query).all(...params);
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/caixa-movements", (req, res) => {
    const { id, caixaId, type, amount, description, date, targetCaixaId, empresa_id } = req.body;
    try {
      const transaction = db.transaction(() => {
        db.prepare("INSERT INTO caixa_movements (id, caixaId, type, amount, description, date, targetCaixaId, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, caixaId, type, amount, description, date, targetCaixaId, empresa_id);
        
        if (type === 'entrada') {
          db.prepare("UPDATE caixas SET currentBalance = currentBalance + ? WHERE id = ?").run(amount, caixaId);
        } else if (type === 'saida') {
          db.prepare("UPDATE caixas SET currentBalance = currentBalance - ? WHERE id = ?").run(amount, caixaId);
        } else if (type === 'transferencia' && targetCaixaId) {
          db.prepare("UPDATE caixas SET currentBalance = currentBalance - ? WHERE id = ?").run(amount, caixaId);
          db.prepare("UPDATE caixas SET currentBalance = currentBalance + ? WHERE id = ?").run(amount, targetCaixaId);
        }
      });
      transaction();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/suppliers", (req, res) => {
    const { name, nif, email, phone, address } = req.body;
    const info = db.prepare("INSERT INTO suppliers (name, nif, email, phone, address) VALUES (?, ?, ?, ?, ?)").run(name, nif, email, phone, address);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/pos/sales", async (req, res) => {
    const { total, items, series_id, cost_center_id, pos_point_id, session_id, discount, payment_method } = req.body;
    const items_json = JSON.stringify(items);
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("pos_sales").insert([{ 
        total, items_json, series_id, cost_center_id, pos_point_id, session_id, discount, payment_method 
      }]).select();
      if (error) return res.status(500).json({ error: error.message });
      const saleId = data[0].id;
      
      // Update session totals
      if (session_id) {
        const { data: sess } = await supabase.from("cash_sessions").select("total_sales, total_discounts").eq("id", session_id).single();
        if (sess) {
          await supabase.from("cash_sessions").update({ 
            total_sales: (sess.total_sales || 0) + total,
            total_discounts: (sess.total_discounts || 0) + (discount || 0)
          }).eq("id", session_id);
        }
      }

      await supabase.from("transactions").insert([{ type: 'income', category: 'pos_sale', amount: total, description: `Venda POS #${saleId}`, reference_id: saleId }]);
      res.json({ id: saleId });
    } else {
      const info = db.prepare("INSERT INTO pos_sales (total, items_json, series_id, cost_center_id, pos_point_id, session_id, discount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        total, items_json, series_id, cost_center_id, pos_point_id, session_id, discount, payment_method
      );
      
      if (session_id) {
        db.prepare("UPDATE cash_sessions SET total_sales = total_sales + ?, total_discounts = total_discounts + ? WHERE id = ?").run(total, discount || 0, session_id);
      }

      db.prepare("INSERT INTO transactions (type, category, amount, description, reference_id) VALUES (?, ?, ?, ?, ?)").run('income', 'pos_sale', total, `Venda POS #${info.lastInsertRowid}`, info.lastInsertRowid);
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Settings Endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("app_settings").select("*");
        if (!error) {
          const settingsObj = data.reduce((acc: any, s: any) => {
            acc[s.key] = s.value;
            return acc;
          }, {});
          return res.json(settingsObj);
        }
        console.error("Supabase error in /api/settings, falling back to SQLite:", error);
      }
      const settings = db.prepare("SELECT * FROM app_settings").all();
      const settingsObj = settings.reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      res.json(settingsObj);
    } catch (error) {
      console.error("Error in /api/settings:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/settings", async (req, res) => {
    const { key, value } = req.body;
    if (supabaseEnabled) {
      const { error } = await supabase.from("app_settings").upsert([{ key, value }]);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, value);
      res.json({ success: true });
    }
  });

  // Client Current Account (Conta Corrente)
  app.get("/api/clients/:id/account", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data: invoices, error: invError } = await supabase.from("invoices").select("*").eq("client_id", req.params.id).order("date", { ascending: false });
        const { data: transactions, error: transError } = await supabase
          .from("transactions")
          .select("*, invoices!inner(client_id)")
          .eq("invoices.client_id", req.params.id)
          .eq("category", "sale")
          .order("date", { ascending: false });
        
        if (!invError && !transError) {
          return res.json({ invoices, transactions });
        }
        console.error("Supabase error in /api/clients/:id/account, falling back to SQLite:", invError || transError);
      }
      
      const invoices = db.prepare("SELECT * FROM invoices WHERE client_id = ? ORDER BY date DESC").all(req.params.id);
      const transactions = db.prepare(`
        SELECT t.* 
        FROM transactions t 
        JOIN invoices i ON t.reference_id = i.id 
        WHERE i.client_id = ? AND t.category = 'sale'
        ORDER BY t.date DESC
      `).all(req.params.id);
      
      res.json({ invoices, transactions });
    } catch (error) {
      console.error("Error in /api/clients/:id/account:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/payroll", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("payroll")
          .select("*, employees(name)")
          .order("year", { ascending: false })
          .order("month", { ascending: false });
        
        if (!error) {
          const formatted = data.map(p => ({ ...p, employee_name: p.employees?.name }));
          return res.json(formatted);
        }
        console.error("Supabase error in /api/payroll, falling back to SQLite:", error);
      }
      
      const payroll = db.prepare(`
        SELECT p.*, e.name as employee_name 
        FROM payroll p 
        JOIN employees e ON p.employee_id = e.id 
        ORDER BY p.year DESC, p.month DESC
      `).all();
      res.json(payroll);
    } catch (error) {
      console.error("Error in /api/payroll:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/payroll", async (req, res) => {
    const { employee_id, month, year, amount } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("payroll").insert([{ employee_id, month, year, amount }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO payroll (employee_id, month, year, amount) VALUES (?, ?, ?, ?)").run(employee_id, month, year, amount);
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Financial Endpoints
  app.get("/api/transactions", async (req, res) => {
    console.log("GET /api/transactions called");
    const { empresa_id } = req.query;
    try {
      if (supabaseEnabled) {
        let query = supabase.from("transactions").select("*");
        if (empresa_id) {
          query = query.eq("empresa_id", empresa_id);
        }
        const { data, error } = await query.order("date", { ascending: false });
        if (!error) {
          return res.json(data);
        }
        console.error("Supabase error in /api/transactions, falling back to SQLite:", error);
      }
      
      let queryStr = "SELECT * FROM transactions";
      const params: any[] = [];
      if (empresa_id) {
        queryStr += " WHERE empresa_id = ?";
        params.push(empresa_id);
      }
      queryStr += " ORDER BY date DESC";
      
      const transactions = db.prepare(queryStr).all(...params);
      res.json(transactions);
    } catch (error) {
      console.error("Error in /api/transactions:", error);
      res.status(500).send(String(error));
    }
  });

// Ensure transactions table has all necessary columns
const transactionColumnsToAdd = [
  { name: 'payment_method', type: 'TEXT' },
  { name: 'reference', type: 'TEXT' },
  { name: 'observation', type: 'TEXT' }
];

for (const col of transactionColumnsToAdd) {
  try {
    db.prepare(`ALTER TABLE transactions ADD COLUMN ${col.name} ${col.type}`).run();
    console.log(`Added column ${col.name} to transactions table.`);
  } catch (e) {
    // Column likely already exists
  }
}

  app.post("/api/transactions", async (req, res) => {
    const { type, category, amount, description, payment_method, reference, observation, date, empresa_id } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("transactions").insert([{ 
        type, category, amount, description, payment_method, reference, observation, date, empresa_id 
      }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO transactions (type, category, amount, description, payment_method, reference, observation, date, empresa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        type, category, amount, description, payment_method, reference, observation, date || new Date().toISOString(), empresa_id
      );
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Cashier Endpoints
  app.get("/api/cash/sessions", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("cash_sessions").select("*").order("opened_at", { ascending: false });
        if (!error) {
          return res.json(data);
        }
        console.error("Supabase error in /api/cash/sessions, falling back to SQLite:", error);
      }
      const sessions = db.prepare("SELECT * FROM cash_sessions ORDER BY opened_at DESC").all();
      res.json(sessions);
    } catch (error) {
      console.error("Error in /api/cash/sessions:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/cash/open", async (req, res) => {
    const { initial_balance, pos_point_id } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("cash_sessions").insert([{ initial_balance, pos_point_id, status: 'open' }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO cash_sessions (initial_balance, pos_point_id, status) VALUES (?, ?, 'open')").run(initial_balance, pos_point_id);
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.post("/api/cash/close/:id", async (req, res) => {
    const { final_balance } = req.body;
    if (supabaseEnabled) {
      const { error } = await supabase
        .from("cash_sessions")
        .update({ final_balance, status: 'closed', closed_at: new Date().toISOString() })
        .eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      db.prepare("UPDATE cash_sessions SET final_balance = ?, status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?").run(final_balance, req.params.id);
      res.json({ success: true });
    }
  });

  // Fiscal Series
  app.get("/api/fiscal-series", (req, res) => {
    const series = db.prepare(`
      SELECT fs.*, su.name as user_name 
      FROM fiscal_series fs
      LEFT JOIN system_users su ON fs.user_id = su.id
      ORDER BY fs.created_at DESC
    `).all();
    res.json(series);
  });

  app.post("/api/fiscal-series", (req, res) => {
    const { description, user_id, type } = req.body;
    const info = db.prepare("INSERT INTO fiscal_series (description, user_id, type) VALUES (?, ?, ?)").run(description, user_id, type);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/fiscal-series/:id", (req, res) => {
    const { description, user_id, type, is_active } = req.body;
    db.prepare("UPDATE fiscal_series SET description = ?, user_id = ?, type = ?, is_active = ? WHERE id = ?").run(description, user_id, type, is_active ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  // Cost Centers
  app.get("/api/cost-centers", (req, res) => {
    const centers = db.prepare("SELECT * FROM cost_centers ORDER BY name").all();
    res.json(centers);
  });

  app.post("/api/cost-centers", (req, res) => {
    const { name, code } = req.body;
    const info = db.prepare("INSERT INTO cost_centers (name, code) VALUES (?, ?)").run(name, code);
    res.json({ id: info.lastInsertRowid });
  });

  // POS Points
  app.get("/api/pos-points", (req, res) => {
    const points = db.prepare("SELECT * FROM pos_points ORDER BY name").all();
    res.json(points);
  });

  app.post("/api/pos-points", (req, res) => {
    const { name, location } = req.body;
    const info = db.prepare("INSERT INTO pos_points (name, location) VALUES (?, ?)").run(name, location);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/system-users", (req, res) => {
    const users = db.prepare("SELECT * FROM system_users ORDER BY created_at DESC").all();
    res.json(users);
  });

  // Purchases Endpoints
  app.get("/api/purchases", (req, res) => {
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name 
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.date DESC
    `).all();
    res.json(purchases);
  });

  app.get("/api/purchases/:id", (req, res) => {
    const purchase = db.prepare(`
      SELECT p.*, s.name as supplier_name 
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `).get(req.params.id);
    
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });
    
    const items = db.prepare("SELECT * FROM purchase_items WHERE purchase_id = ?").all(req.params.id);
    res.json({ ...purchase, items });
  });

  app.post("/api/purchases", (req, res) => {
    const { supplier_id, date, items, work_site_id } = req.body;
    const purchase_number = `PUR-${Date.now()}`;
    
    const total = items.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price), 0);
    
    const info = db.prepare("INSERT INTO purchases (supplier_id, purchase_number, date, total, work_site_id) VALUES (?, ?, ?, ?, ?)")
      .run(supplier_id, purchase_number, date, total, work_site_id || null);
    
    const purchaseId = info.lastInsertRowid;
    
    const insertItem = db.prepare("INSERT INTO purchase_items (purchase_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)");
    const getProduct = db.prepare("SELECT stock_quantity FROM products WHERE id = ?");
    const updateProductStock = db.prepare("UPDATE products SET stock_quantity = ? WHERE id = ?");
    const insertStockMovement = db.prepare(`
      INSERT INTO stock_movements 
      (product_id, type, quantity, unit_price, previous_stock, current_stock, warehouse_id, description, reference_id) 
      VALUES (?, 'entry', ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insertItem.run(purchaseId, item.product_id, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price);
      
      // If product_id and warehouse_id are provided, update stock
      if (item.product_id && item.warehouse_id) {
        const product = getProduct.get(item.product_id) as { stock_quantity: number } | undefined;
        if (product) {
          const prevStock = product.stock_quantity || 0;
          const newStock = prevStock + Number(item.quantity);
          
          updateProductStock.run(newStock, item.product_id);
          
          insertStockMovement.run(
            item.product_id,
            item.quantity,
            item.unit_price,
            prevStock,
            newStock,
            item.warehouse_id,
            `Entrada via Compra ${purchase_number}`,
            purchaseId
          );
        }
      }
    }
    
    // Also record as expense in transactions
    db.prepare("INSERT INTO transactions (type, category, amount, description, date, reference_id) VALUES ('expense', 'purchase', ?, ?, ?, ?)")
      .run(total, `Compra ${purchase_number}`, date, purchaseId);
      
    if (work_site_id) {
      const lastMovement = db.prepare("SELECT balance FROM work_site_movements WHERE work_site_id = ? ORDER BY date DESC, created_at DESC LIMIT 1").get(work_site_id) as { balance: number } | undefined;
      const currentBalance = lastMovement ? lastMovement.balance : 0;
      const newBalance = currentBalance - total;

      db.prepare(`
        INSERT INTO work_site_movements (work_site_id, date, doc_no, company, description, debit, credit, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(work_site_id, date, purchase_number, 'Fornecedor', `Compra ${purchase_number}`, total, 0, newBalance);
    }
    
    res.json({ id: purchaseId, purchase_number });
  });

  app.post("/api/system-users", (req, res) => {
    const { name, profession, date, permission_area, contact, address } = req.body;
    const result = db.prepare(`
      INSERT INTO system_users (name, profession, date, permission_area, contact, address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, profession, date, permission_area, contact, address);
    res.json({ id: result.lastInsertRowid });
  });

  // Dashboard Stats
  // Reports
  app.delete("/api/professions/:id", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { error } = await supabase.from("professions").delete().eq("id", req.params.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        db.prepare("DELETE FROM professions WHERE id = ?").run(req.params.id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.get("/api/reports/profit-loss", async (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    const { empresa_id } = req.query;
    try {
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const reportData = await Promise.all(months.map(async (month) => {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        // Income from Invoices
        let incomeQuery = "SELECT SUM(total) as total FROM invoices WHERE date >= ? AND date <= ? AND status != 'cancelled'";
        const incomeParams = [startDate, endDate];
        if (empresa_id) {
          incomeQuery += " AND empresa_id = ?";
          incomeParams.push(empresa_id as string);
        }
        const income = db.prepare(incomeQuery).get(...incomeParams) as { total: number | null };

        // Expenses from Purchases
        let purchasesQuery = "SELECT SUM(total) as total FROM purchases WHERE date >= ? AND date <= ? AND status = 'completed'";
        const purchasesParams = [startDate, endDate];
        if (empresa_id) {
          purchasesQuery += " AND empresa_id = ?";
          purchasesParams.push(empresa_id as string);
        }
        const purchases = db.prepare(purchasesQuery).get(...purchasesParams) as { total: number | null };

        // Salaries from Payroll
        let payrollQuery = "SELECT SUM(amount) as total FROM payroll WHERE year = ? AND month = ? AND status = 'paid'";
        const payrollParams = [year, String(month)];
        if (empresa_id) {
          payrollQuery += " AND empresa_id = ?";
          payrollParams.push(empresa_id as string);
        }
        const salaries = db.prepare(payrollQuery).get(...payrollParams) as { total: number | null };

        // Other Expenses from Transactions
        let transQuery = "SELECT SUM(amount) as total FROM transactions WHERE date >= ? AND date <= ? AND type = 'expense' AND category NOT IN ('salary', 'purchase')";
        const transParams = [startDate, endDate];
        if (empresa_id) {
          transQuery += " AND empresa_id = ?";
          transParams.push(empresa_id as string);
        }
        const otherExpenses = db.prepare(transQuery).get(...transParams) as { total: number | null };

        const facturacaoSImposto = income.total || 0;
        const impostoRecebido = facturacaoSImposto * 0.14;
        const facturacaoCImposto = facturacaoSImposto + impostoRecebido;

        const fornecedoresSImposto = purchases.total || 0;
        const ivaSuportado = fornecedoresSImposto * 0.14;
        const salarios = salaries.total || 0;
        const inss = salarios * 0.08;
        const custosAceites = otherExpenses.total || 0;
        const totaisCustos = fornecedoresSImposto + ivaSuportado + salarios + inss + custosAceites;

        return {
          month,
          facturacaoSImposto,
          impostoRecebido,
          facturacaoCImposto,
          custosAceites,
          fornecedoresSImposto,
          ivaSuportado,
          salarios,
          inss,
          totaisCustos,
          margem: facturacaoCImposto - totaisCustos
        };
      }));

      res.json(reportData);
    } catch (error) {
      console.error("Error in /api/reports/profit-loss:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { count: pendingCount, error: err2 } = await supabase.from("invoices").select("*", { count: 'exact', head: true }).neq("status", "anulado");
        const { count: clientCount, error: err3 } = await supabase.from("clients").select("*", { count: 'exact', head: true });
        
        if (!err2 && !err3) {
          return res.json({
            totalInvoiced: 0,
            pendingCount: pendingCount || 0,
            clientCount: clientCount || 0,
            totalExpenses: 0,
            cashBalance: 0,
            recentInvoices: []
          });
        }
        console.error("Supabase error in /api/stats, falling back to SQLite:", err2 || err3);
      }
      
      const totalInvoiced = db.prepare("SELECT SUM(total) as total FROM invoices").get() as { total: number | null } || { total: 0 };
      const pendingInvoices = db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status != 'anulado'").get() as { count: number } || { count: 0 };
      const totalClients = db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number } || { count: 0 };
      const totalExpenses = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'expense'").get() as { total: number | null } || { total: 0 };
      const cashBalance = db.prepare("SELECT (SUM(CASE WHEN type='income' THEN amount ELSE 0 END) - SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)) as balance FROM transactions").get() as { balance: number | null } || { balance: 0 };

      const recentInvoices = db.prepare(`
        SELECT i.*, c.name as client_name 
        FROM invoices i 
        JOIN clients c ON i.client_id = c.id 
        ORDER BY i.created_at DESC LIMIT 5
      `).all();

      res.json({
        totalInvoiced: totalInvoiced.total || 0,
        pendingCount: pendingInvoices.count,
        clientCount: totalClients.count,
        totalExpenses: totalExpenses.total || 0,
        cashBalance: cashBalance.balance || 0,
        recentInvoices
      });
    } catch (error) {
      console.error("Error in /api/stats:", error);
      res.status(500).send(String(error));
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("invoices.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    nif TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    unit TEXT DEFAULT 'un',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    date DATE NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    total REAL DEFAULT 0,
    document_type TEXT,
    country_code TEXT,
    service_date DATE,
    service_location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
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
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    profession_id INTEGER,
    salary REAL NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    hired_at DATE,
    dismissed_at DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profession_id) REFERENCES professions(id)
  );

  CREATE TABLE IF NOT EXISTS employee_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    contract_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS employee_absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'vacation', 'sick', 'subsidy', etc.
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount REAL DEFAULT 0, -- for subsidies
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS employee_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'present', 'absent', 'late'
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS work_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
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

  CREATE TABLE IF NOT EXISTS pos_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    items_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Initialize default settings
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('fiscal_year', '2026');
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('company_name', 'FaturaPronta Lda');
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('currency', 'AOA');

  CREATE TABLE IF NOT EXISTS payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    paid_at DATETIME,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    initial_balance REAL NOT NULL,
    final_balance REAL,
    status TEXT DEFAULT 'open'
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'income' or 'expense'
    category TEXT NOT NULL, -- 'sale', 'salary', 'purchase', etc.
    amount REAL NOT NULL,
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    reference_id INTEGER -- ID of related invoice, payroll, etc.
  );
`);

// Migration: Add missing columns to employees table if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(employees)").all();
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
if (!columns.includes('status')) {
  db.exec("ALTER TABLE employees ADD COLUMN status TEXT DEFAULT 'active'");
}
if (!columns.includes('hired_at')) {
  db.exec("ALTER TABLE employees ADD COLUMN hired_at DATE");
}
if (!columns.includes('dismissed_at')) {
  db.exec("ALTER TABLE employees ADD COLUMN dismissed_at DATE");
}

// Migration: Add missing columns to clients table if they don't exist
const clientTableInfo = db.prepare("PRAGMA table_info(clients)").all();
const clientColumns = clientTableInfo.map((c: any) => c.name);

if (!clientColumns.includes('nif')) {
  db.exec("ALTER TABLE clients ADD COLUMN nif TEXT");
}
if (!clientColumns.includes('address')) {
  db.exec("ALTER TABLE clients ADD COLUMN address TEXT");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  
  // Clients
  app.get("/api/clients", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
    res.json(clients);
  });

  app.post("/api/clients", (req, res) => {
    const { name, email, nif, address } = req.body;
    const info = db.prepare("INSERT INTO clients (name, email, nif, address) VALUES (?, ?, ?, ?)").run(name, email, nif, address);
    res.json({ id: info.lastInsertRowid });
  });

  // Products
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products ORDER BY name ASC").all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, price, unit } = req.body;
    const info = db.prepare("INSERT INTO products (name, price, unit) VALUES (?, ?, ?)").run(name, price, unit);
    res.json({ id: info.lastInsertRowid });
  });

  // Invoices
  app.get("/api/invoices", (req, res) => {
    const invoices = db.prepare(`
      SELECT i.*, c.name as client_name 
      FROM invoices i 
      JOIN clients c ON i.client_id = c.id 
      ORDER BY i.created_at DESC
    `).all();
    res.json(invoices);
  });

  app.get("/api/work-sites", (req, res) => {
    const rows = db.prepare(`
      SELECT work_sites.*, clients.name as client_name 
      FROM work_sites 
      JOIN clients ON work_sites.client_id = clients.id
      ORDER BY work_sites.created_at DESC
    `).all();
    res.json(rows);
  });

  app.post("/api/work-sites", (req, res) => {
    const { client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations } = req.body;
    const info = db.prepare(`
      INSERT INTO work_sites (client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/work-sites/:id", (req, res) => {
    const { client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations } = req.body;
    db.prepare(`
      UPDATE work_sites 
      SET client_id = ?, start_date = ?, end_date = ?, title = ?, code = ?, staff_per_day = ?, total_staff = ?, location = ?, description = ?, contact = ?, observations = ?
      WHERE id = ?
    `).run(client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/work-sites/:id/movements", (req, res) => {
    const rows = db.prepare(`
      SELECT * FROM work_site_movements 
      WHERE work_site_id = ? 
      ORDER BY date ASC, created_at ASC
    `).all(req.params.id);
    res.json(rows);
  });

  app.post("/api/work-sites/:id/movements", (req, res) => {
    const { date, doc_no, company, description, debit, credit } = req.body;
    const work_site_id = req.params.id;

    // Calculate new balance
    const lastMovement = db.prepare("SELECT balance FROM work_site_movements WHERE work_site_id = ? ORDER BY date DESC, created_at DESC LIMIT 1").get(work_site_id);
    const currentBalance = lastMovement ? lastMovement.balance : 0;
    const newBalance = currentBalance + (credit || 0) - (debit || 0);

    const info = db.prepare(`
      INSERT INTO work_site_movements (work_site_id, date, doc_no, company, description, debit, credit, balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(work_site_id, date, doc_no, company, description, debit || 0, credit || 0, newBalance);
    
    res.json({ id: info.lastInsertRowid, balance: newBalance });
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

  app.post("/api/invoices", (req, res) => {
    const { client_id, date, due_date, items } = req.body;
    
    const lastInvoice = db.prepare("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1").get();
    let nextNum = 1;
    if (lastInvoice) {
      const match = lastInvoice.invoice_number.match(/FT-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const invoice_number = `FT-${String(nextNum).padStart(4, '0')}`;

    const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

    const transaction = db.transaction(() => {
      const info = db.prepare("INSERT INTO invoices (client_id, invoice_number, date, due_date, total) VALUES (?, ?, ?, ?, ?)").run(client_id, invoice_number, date, due_date, total);
      const invoiceId = info.lastInsertRowid;

      const insertItem = db.prepare("INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)");
      for (const item of items) {
        insertItem.run(invoiceId, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price);
      }

      // Record in transactions
      db.prepare("INSERT INTO transactions (type, category, amount, description, reference_id) VALUES (?, ?, ?, ?, ?)").run('income', 'sale', total, `Fatura ${invoice_number}`, invoiceId);

      return invoiceId;
    });

    const id = transaction();
    res.json({ id, invoice_number });
  });

  // HR Endpoints
  app.get("/api/professions", (req, res) => {
    const professions = db.prepare("SELECT * FROM professions ORDER BY name ASC").all();
    res.json(professions);
  });

  app.post("/api/professions", (req, res) => {
    const { name } = req.body;
    const info = db.prepare("INSERT INTO professions (name) VALUES (?)").run(name);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/employees", (req, res) => {
    const employees = db.prepare(`
      SELECT e.*, p.name as profession_name 
      FROM employees e 
      LEFT JOIN professions p ON e.profession_id = p.id 
      ORDER BY e.name ASC
    `).all();
    res.json(employees);
  });

  app.post("/api/employees", (req, res) => {
    const { name, role, profession_id, salary, email, phone, hired_at } = req.body;
    const info = db.prepare("INSERT INTO employees (name, role, profession_id, salary, email, phone, hired_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(name, role, profession_id, salary, email, phone, hired_at);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/employees/dismiss/:id", (req, res) => {
    const { date } = req.body;
    db.prepare("UPDATE employees SET status = 'inactive', dismissed_at = ? WHERE id = ?").run(date, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/employees/absences", (req, res) => {
    const absences = db.prepare(`
      SELECT a.*, e.name as employee_name 
      FROM employee_absences a 
      JOIN employees e ON a.employee_id = e.id 
      ORDER BY a.start_date DESC
    `).all();
    res.json(absences);
  });

  app.post("/api/employees/absences", (req, res) => {
    const { employee_id, type, start_date, end_date, amount } = req.body;
    const info = db.prepare("INSERT INTO employee_absences (employee_id, type, start_date, end_date, amount) VALUES (?, ?, ?, ?, ?)").run(employee_id, type, start_date, end_date, amount);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/employees/attendance", (req, res) => {
    const attendance = db.prepare(`
      SELECT a.*, e.name as employee_name 
      FROM employee_attendance a 
      JOIN employees e ON a.employee_id = e.id 
      ORDER BY a.date DESC
    `).all();
    res.json(attendance);
  });

  app.post("/api/employees/attendance", (req, res) => {
    const { employee_id, date, status } = req.body;
    const info = db.prepare("INSERT INTO employee_attendance (employee_id, date, status) VALUES (?, ?, ?)").run(employee_id, date, status);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/employees/contracts", (req, res) => {
    const contracts = db.prepare(`
      SELECT c.*, e.name as employee_name 
      FROM employee_contracts c 
      JOIN employees e ON c.employee_id = e.id 
    `).all();
    res.json(contracts);
  });

  app.post("/api/employees/contracts", (req, res) => {
    const { employee_id, contract_type, start_date, end_date } = req.body;
    const info = db.prepare("INSERT INTO employee_contracts (employee_id, contract_type, start_date, end_date) VALUES (?, ?, ?, ?)").run(employee_id, contract_type, start_date, end_date);
    res.json({ id: info.lastInsertRowid });
  });

  // POS Endpoints
  app.get("/api/pos/sales", (req, res) => {
    const sales = db.prepare("SELECT * FROM pos_sales ORDER BY date DESC").all();
    res.json(sales);
  });

  app.post("/api/pos/sales", (req, res) => {
    const { total, items } = req.body;
    const items_json = JSON.stringify(items);
    const info = db.prepare("INSERT INTO pos_sales (total, items_json) VALUES (?, ?)").run(total, items_json);
    
    // Record in transactions
    db.prepare("INSERT INTO transactions (type, category, amount, description, reference_id) VALUES (?, ?, ?, ?, ?)").run('income', 'pos_sale', total, `Venda POS #${info.lastInsertRowid}`, info.lastInsertRowid);
    
    res.json({ id: info.lastInsertRowid });
  });

  // Settings Endpoints
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM app_settings").all();
    const settingsObj = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // Client Current Account (Conta Corrente)
  app.get("/api/clients/:id/account", (req, res) => {
    const invoices = db.prepare("SELECT * FROM invoices WHERE client_id = ? ORDER BY date DESC").all(req.params.id);
    const transactions = db.prepare(`
      SELECT t.* 
      FROM transactions t 
      JOIN invoices i ON t.reference_id = i.id 
      WHERE i.client_id = ? AND t.category = 'sale'
      ORDER BY t.date DESC
    `).all(req.params.id);
    
    res.json({ invoices, transactions });
  });

  app.get("/api/payroll", (req, res) => {
    const payroll = db.prepare(`
      SELECT p.*, e.name as employee_name 
      FROM payroll p 
      JOIN employees e ON p.employee_id = e.id 
      ORDER BY p.year DESC, p.month DESC
    `).all();
    res.json(payroll);
  });

  app.post("/api/payroll", (req, res) => {
    const { employee_id, month, year, amount } = req.body;
    const info = db.prepare("INSERT INTO payroll (employee_id, month, year, amount) VALUES (?, ?, ?, ?)").run(employee_id, month, year, amount);
    res.json({ id: info.lastInsertRowid });
  });

  // Financial Endpoints
  app.get("/api/transactions", (req, res) => {
    const transactions = db.prepare("SELECT * FROM transactions ORDER BY date DESC").all();
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const { type, category, amount, description } = req.body;
    const info = db.prepare("INSERT INTO transactions (type, category, amount, description) VALUES (?, ?, ?, ?)").run(type, category, amount, description);
    res.json({ id: info.lastInsertRowid });
  });

  // Cashier Endpoints
  app.get("/api/cash/sessions", (req, res) => {
    const sessions = db.prepare("SELECT * FROM cash_sessions ORDER BY opened_at DESC").all();
    res.json(sessions);
  });

  app.post("/api/cash/open", (req, res) => {
    const { initial_balance } = req.body;
    const info = db.prepare("INSERT INTO cash_sessions (initial_balance) VALUES (?)").run(initial_balance);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/cash/close/:id", (req, res) => {
    const { final_balance } = req.body;
    db.prepare("UPDATE cash_sessions SET final_balance = ?, status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?").run(final_balance, req.params.id);
    res.json({ success: true });
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    const totalInvoiced = db.prepare("SELECT SUM(total) as total FROM invoices").get();
    const pendingInvoices = db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status = 'pending'").get();
    const totalClients = db.prepare("SELECT COUNT(*) as count FROM clients").get();
    const totalExpenses = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE type = 'expense'").get();
    const cashBalance = db.prepare("SELECT (SUM(CASE WHEN type='income' THEN amount ELSE 0 END) - SUM(CASE WHEN type='expense' THEN amount ELSE 0 END)) as balance FROM transactions").get();

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

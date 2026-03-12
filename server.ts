import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { supabase } from "./src/services/supabaseClient.js";
import { generateDocumentHash, signDocument, getPreviousHash } from "./src/services/fiscalService.js";

const db = new Database("invoices.db");
db.pragma('journal_mode = WAL');
console.log("Server starting...");

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

  CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    localidade TEXT,
    provincia TEXT,
    responsavel TEXT,
    contacto TEXT,
    observacao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    nif TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Supabase Availability Check
  let supabaseEnabled = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
  if (supabaseEnabled) {
    try {
      const { error } = await supabase.from('products').select('id').limit(1);
      if (error) {
        console.warn("Supabase is configured but 'products' table was not found. Falling back to SQLite for this session.");
        console.warn("Please run the SQL script in /supabase_schema.sql in your Supabase SQL Editor.");
        supabaseEnabled = false;
      } else {
        console.log("Supabase connection verified and tables found.");
      }
    } catch (e) {
      console.warn("Supabase connection failed. Falling back to SQLite.");
      supabaseEnabled = false;
    }
  }

  // API Routes
  
  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("clients").select("*").order("name", { ascending: true });
        if (!error) {
          return res.json(data);
        }
        console.warn("Supabase error in /api/clients, falling back to SQLite:", error.message);
      }
      const clients = db.prepare("SELECT * FROM clients ORDER BY name ASC").all();
      res.json(clients);
    } catch (error) {
      console.error("Error in /api/clients:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/clients", async (req, res) => {
    const { name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("clients").insert([{ name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO clients (name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente);
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
        if (!error) {
          return res.json(data);
        }
        console.warn("Supabase error in /api/products, falling back to SQLite:", error.message);
      }
      const products = db.prepare("SELECT * FROM products ORDER BY name ASC").all();
      res.json(products);
    } catch (error) {
      console.error("Error in /api/products:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/products", async (req, res) => {
    const { name, referente, data_registo, armazem, tipo_documento, preco_compra, preco_venda, finalidade, tipologia, unit } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("products").insert([{ name, referente, data_registo, armazem, tipo_documento, preco_compra, price: preco_venda, finalidade, tipologia, unit }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO products (name, referente, data_registo, armazem, tipo_documento, preco_compra, price, finalidade, tipologia, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(name, referente, data_registo, armazem, tipo_documento, preco_compra, preco_venda, finalidade, tipologia, unit);
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("invoices")
          .select("*, clients(name)")
          .order("created_at", { ascending: false });
        
        if (!error) {
          const formatted = data.map(i => ({ ...i, client_name: i.clients?.name }));
          return res.json(formatted);
        }
        console.warn("Supabase error in /api/invoices, falling back to SQLite:", error.message);
      }
      
      const invoices = db.prepare(`
        SELECT i.*, c.name as client_name 
        FROM invoices i 
        JOIN clients c ON i.client_id = c.id 
        ORDER BY i.created_at DESC
      `).all();
      res.json(invoices);
    } catch (error) {
      console.error("Error in /api/invoices:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/issued-documents", async (req, res) => {
    if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (!error) {
        const formatted = data.map(i => ({ ...i, client_name: i.clients.name }));
        return res.json(formatted);
      }
      console.warn("Supabase error in /api/issued-documents, falling back to SQLite:", error.message);
    }
    const invoices = db.prepare(`
        SELECT i.*, c.name as client_name 
        FROM invoices i 
        JOIN clients c ON i.client_id = c.id 
        ORDER BY i.created_at DESC
      `).all();
    res.json(invoices);
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
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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

  app.post("/api/invoices", async (req, res) => {
    const { 
      client_id, date, due_date, items, document_type, work_site_id, 
      vat_withholding, exchange_rate, currency, counter_value, global_discount 
    } = req.body;
    
    // ... (invoice number logic)
    const lastInvoice = db.prepare("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1").get();
    let nextNum = 1;
    if (lastInvoice) {
      const match = lastInvoice.invoice_number.match(/FT-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const invoice_number = `FT-${String(nextNum).padStart(4, '0')}`;
    const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

    // Fiscal Logic
    const prevHash = await getPreviousHash(supabase);
    const docContent = `${invoice_number}${date}${total}${prevHash}`;
    const hash = generateDocumentHash(docContent);
    const signature = signDocument(docContent);

    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert([{ 
          client_id, invoice_number, date, due_date, total, hash, 
          document_type, work_site_id, vat_withholding, exchange_rate, 
          currency, counter_value, global_discount, signature
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
      await supabase.from("transactions").insert([{ type: 'income', category: 'sale', amount: total, description: `Fatura ${invoice_number}`, reference_id: invoiceId }]);
      
      res.json({ id: invoiceId, invoice_number });
    } else {
      // SQLite fallback
      const transaction = db.transaction(() => {
        const info = db.prepare(`
          INSERT INTO invoices (
            client_id, invoice_number, date, due_date, total, hash, 
            document_type, work_site_id, vat_withholding, exchange_rate, 
            currency, counter_value, global_discount, signature
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          client_id, invoice_number, date, due_date, total, hash, 
          document_type, work_site_id, vat_withholding, exchange_rate, 
          currency, counter_value, global_discount, signature
        );
        const invoiceId = info.lastInsertRowid;
        
        const insertItem = db.prepare("INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)");
        for (const item of items) {
          insertItem.run(invoiceId, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price);
        }

        db.prepare("INSERT INTO transactions (type, category, amount, description, reference_id) VALUES (?, ?, ?, ?, ?)").run('income', 'sale', total, `Fatura ${invoice_number}`, invoiceId);
        
        return invoiceId;
      });
      const id = transaction();
      res.json({ id, invoice_number });
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
    const { name } = req.body;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("professions").insert([{ name }]).select();
      if (!error) {
        return res.json({ id: data[0].id });
      }
      console.warn("Supabase error in POST /api/professions, falling back to SQLite:", error.message);
    }
    const info = db.prepare("INSERT INTO professions (name) VALUES (?)").run(name);
    res.json({ id: info.lastInsertRowid });
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
    const { name, role, profession_id, salary, email, phone, hired_at } = req.body;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const { data, error } = await supabase
        .from("employees")
        .insert([{ name, role, profession_id, salary, email, phone, hired_at }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO employees (name, role, profession_id, salary, email, phone, hired_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(name, role, profession_id, salary, email, phone, hired_at);
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.post("/api/employees/dismiss/:id", async (req, res) => {
    const { date } = req.body;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const { error } = await supabase
        .from("employees")
        .update({ status: 'inactive', dismissed_at: date })
        .eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      db.prepare("UPDATE employees SET status = 'inactive', dismissed_at = ? WHERE id = ?").run(date, req.params.id);
      res.json({ success: true });
    }
  });

  app.get("/api/employees/absences", async (req, res) => {
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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

  app.get("/api/employees/contracts", async (req, res) => {
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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

  app.post("/api/employees/contracts", async (req, res) => {
    const { employee_id, contract_type, start_date, end_date } = req.body;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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

  app.post("/api/suppliers", (req, res) => {
    const { name, nif, email, phone, address } = req.body;
    const info = db.prepare("INSERT INTO suppliers (name, nif, email, phone, address) VALUES (?, ?, ?, ?, ?)").run(name, nif, email, phone, address);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/pos/sales", async (req, res) => {
    const { total, items } = req.body;
    const items_json = JSON.stringify(items);
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const { data, error } = await supabase.from("pos_sales").insert([{ total, items_json }]).select();
      if (error) return res.status(500).json({ error: error.message });
      const saleId = data[0].id;
      // Record in transactions
      await supabase.from("transactions").insert([{ type: 'income', category: 'pos_sale', amount: total, description: `Venda POS #${saleId}`, reference_id: saleId }]);
      res.json({ id: saleId });
    } else {
      const info = db.prepare("INSERT INTO pos_sales (total, items_json) VALUES (?, ?)").run(total, items_json);
      db.prepare("INSERT INTO transactions (type, category, amount, description, reference_id) VALUES (?, ?, ?, ?, ?)").run('income', 'pos_sale', total, `Venda POS #${info.lastInsertRowid}`, info.lastInsertRowid);
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Settings Endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
        if (!error) {
          return res.json(data);
        }
        console.error("Supabase error in /api/transactions, falling back to SQLite:", error);
      }
      const transactions = db.prepare("SELECT * FROM transactions ORDER BY date DESC").all();
      res.json(transactions);
    } catch (error) {
      console.error("Error in /api/transactions:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/transactions", async (req, res) => {
    const { type, category, amount, description } = req.body;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const { data, error } = await supabase.from("transactions").insert([{ type, category, amount, description }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO transactions (type, category, amount, description) VALUES (?, ?, ?, ?)").run(type, category, amount, description);
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Cashier Endpoints
  app.get("/api/cash/sessions", async (req, res) => {
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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
    const { initial_balance } = req.body;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const { data, error } = await supabase.from("cash_sessions").insert([{ initial_balance }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      const info = db.prepare("INSERT INTO cash_sessions (initial_balance) VALUES (?)").run(initial_balance);
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.post("/api/cash/close/:id", async (req, res) => {
    const { final_balance } = req.body;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
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

  // Dashboard Stats
  app.get("/api/stats", async (req, res) => {
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
        const { count: pendingCount, error: err2 } = await supabase.from("invoices").select("*", { count: 'exact', head: true }).eq("status", "pending");
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

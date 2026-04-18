// @ts-nocheck
import "dotenv/config";
import express from "express";
import fs from "fs";

process.on('uncaughtException', (err) => {
  fs.writeFileSync('crash.log', 'Uncaught Exception: ' + err.stack + '\n', { flag: 'a' });
  console.error("Uncaught exception!", err);
});

process.on('unhandledRejection', (err: any) => {
  fs.writeFileSync('crash.log', 'Unhandled Rejection: ' + (err?.stack || err) + '\n', { flag: 'a' });
  console.error("Unhandled rejection!", err);
});

import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { supabase as globalSupabase } from "./src/services/supabaseClient.js";
import { createClient } from "@supabase/supabase-js";
import { generateDocumentHash, signDocument, getPreviousHash } from "./src/services/fiscalService.js";

console.log("Initializing database...");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// const db = new Database("invoices.db");
const db = new Database("invoices.db");

// Global stubs to prevent ReferenceErrors when falling back from Supabase to disabled SQLite
let invoices = [], employees = [], rows = [], warehouses = [], series = [], clients = [], products = [], professions = [], absences = [], attendance = [], records = [], contracts = [], sales = [], suppliers = [], caixas = [], sessions = [], centers = [], points = [], purchases = [], transactions = [], company = {}, workplaces = [], user = {}, payroll = [], movements = [], receipts = [], settings = [], row = {};
let info = { lastInsertRowid: 0 };


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

const companyColumnsToAdd = [
  { name: 'nif', type: 'TEXT' },
  { name: 'address_street', type: 'TEXT' },
  { name: 'address_neighborhood', type: 'TEXT' },
  { name: 'address_municipality', type: 'TEXT' },
  { name: 'address_province', type: 'TEXT' },
  { name: 'address_postal_code', type: 'TEXT' },
  { name: 'address_country', type: 'TEXT' },
  { name: 'phone', type: 'TEXT' },
  { name: 'email', type: 'TEXT' },
  { name: 'admin_name', type: 'TEXT' },
  { name: 'billing_name', type: 'TEXT' },
  { name: 'billing_nif', type: 'TEXT' },
  { name: 'billing_street', type: 'TEXT' },
  { name: 'billing_neighborhood', type: 'TEXT' },
  { name: 'billing_municipality', type: 'TEXT' },
  { name: 'billing_province', type: 'TEXT' },
  { name: 'billing_postal_code', type: 'TEXT' },
  { name: 'billing_country', type: 'TEXT' },
  { name: 'billing_phone', type: 'TEXT' },
  { name: 'billing_email', type: 'TEXT' },
  { name: 'promo_code', type: 'TEXT' },
  { name: 'pre_registration_date', type: 'DATETIME' }
];

for (const col of columnsToAdd) {
  try {
    if (db) {
      db.prepare(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`Added column ${col.name} to invoices`);
    }
  } catch (e) {}
}

for (const col of employeeColumnsToAdd) {
  try {
    if (db) {
      db.prepare(`ALTER TABLE employees ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`Added column ${col.name} to employees`);
    }
  } catch (e) {}
}

for (const col of userColumnsToAdd) {
  try {
    if (db) {
      db.prepare(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`Added column ${col.name} to users`);
    }
  } catch (e) {}
}

for (const col of companyColumnsToAdd) {
  try {
    if (db) {
      db.prepare(`ALTER TABLE companies ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`Added column ${col.name} to companies`);
    }
  } catch (e) {}
}

if (db) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sigla TEXT NOT NULL,
    descricao TEXT NOT NULL,
    observacoes TEXT,
    company_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    nif TEXT,
    address_street TEXT,
    address_neighborhood TEXT,
    address_municipality TEXT,
    address_province TEXT,
    address_postal_code TEXT,
    address_country TEXT,
    phone TEXT,
    email TEXT,
    admin_name TEXT,
    billing_name TEXT,
    billing_nif TEXT,
    billing_street TEXT,
    billing_neighborhood TEXT,
    billing_municipality TEXT,
    billing_province TEXT,
    billing_postal_code TEXT,
    billing_country TEXT,
    billing_phone TEXT,
    billing_email TEXT,
    promo_code TEXT,
    pre_registration_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT,
    password_hash TEXT,
    company_id TEXT,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
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
    estado_nif TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    profession_id INTEGER,
    salary REAL DEFAULT 0,
    email TEXT,
    phone TEXT,
    hired_at DATE,
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
    bi TEXT,
    contract_type TEXT,
    dependents INTEGER DEFAULT 0,
    subject_to_irt BOOLEAN DEFAULT 1,
    subject_to_inss BOOLEAN DEFAULT 1,
    bank_account TEXT,
    inss_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    reference TEXT,
    price REAL DEFAULT 0,
    stock_quantity REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS work_sites (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    title TEXT NOT NULL,
    code TEXT,
    location TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    invoice_number TEXT,
    date DATE,
    due_date DATE,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'ativo',
    hash TEXT,
    signature TEXT,
    document_type TEXT,
    vat_withholding REAL DEFAULT 0,
    exchange_rate REAL DEFAULT 1,
    currency TEXT DEFAULT 'Kwanza',
    counter_value REAL DEFAULT 0,
    global_discount REAL DEFAULT 0,
    cash_box TEXT,
    payment_method TEXT,
    series_id INTEGER,
    is_certified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS pos_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT,
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

  CREATE TABLE IF NOT EXISTS fiscal_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    type TEXT DEFAULT 'normal',
    is_active BOOLEAN DEFAULT 1
  );

  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('fiscal_year', '2026');
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('company_name', 'FaturaPronta Lda');
  INSERT OR IGNORE INTO app_settings (key, value) VALUES ('currency', 'AOA');
  INSERT OR IGNORE INTO fiscal_series (id, description, type, is_active) VALUES (1, 'Série 2026', 'normal', 1);

  CREATE TABLE IF NOT EXISTS payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    company_id TEXT,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    base_salary REAL,
    inss_worker REAL,
    inss_company REAL,
    irt REAL,
    net_salary REAL,
    status TEXT DEFAULT 'pending',
    paid_at DATETIME,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id TEXT,
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
}
console.log("Database initialized");

async function startServer() {
  const app = express();

app.use((req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  
  if (supabaseUrl && supabaseKey) {
    if (token) {
      req.supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });
    } else {
      req.supabase = globalSupabase;
    }
  }
  next();
});

  app.use(express.json());
  const PORT = 3000;

  // Supabase Availability Check
  let supabaseEnabled = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
  if (supabaseEnabled) {
    console.log("Supabase credentials found.");
    // We'll keep it enabled and handle errors per request to allow partial schema availability
    // or just inform the user if a specific table is missing.
  } else {
    console.log("Supabase not configured, using local SQLite.");
  }

  // Initialize default user if none exists
  try {
    console.log("Skipping default user initialization for now.");
  } catch (e) {
    console.error("Error creating default user:", e);
  }

  // API Routes
  
  // Users
  app.post("/api/login-local", (req, res) => {
    const { identifier, password } = req.body;
    try {
      if (!db) {
        throw new Error("Base de dados local indisponível.");
      }

      const user = db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(identifier, identifier);

      if (!user) {
        return res.status(401).json({ error: "Utilizador não encontrado no modo de teste." });
      }

      // No hash check for simplicity in demo fallback mode, or add simple string comparison
      if (user.password_hash && user.password_hash !== password) {
        return res.status(401).json({ error: "Palavra-passe incorreta." });
      }

      res.json(user);
    } catch (err: any) {
      console.error("Local login error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/register-company", async (req, res) => {
    const { 
      companyName, 
      companyType, 
      email, 
      password,
      nif,
      address_street,
      address_neighborhood,
      address_municipality,
      address_province,
      address_postal_code,
      address_country,
      phone,
      company_email,
      admin_name,
      billing_name,
      billing_nif,
      billing_street,
      billing_neighborhood,
      billing_municipality,
      billing_province,
      billing_postal_code,
      billing_country,
      billing_phone,
      billing_email,
      promo_code,
      pre_registration_date
    } = req.body;
    
    const localRegister = () => {
      console.warn("⚠️ Realizando registo apenas na base de dados local.");
      try {
        const userId = crypto.randomUUID();
        const companyId = crypto.randomUUID();
        
        // 1. Criar empresa localmente
        db.prepare(`
          INSERT INTO companies (
            id, name, type, nif, address_street, address_neighborhood, 
            address_municipality, address_province, address_postal_code, 
            address_country, phone, email, admin_name, billing_name, 
            billing_nif, billing_street, billing_neighborhood, 
            billing_municipality, billing_province, billing_postal_code, 
            billing_country, billing_phone, billing_email, promo_code, 
            pre_registration_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          companyId, companyName, companyType, nif, address_street, address_neighborhood,
          address_municipality, address_province, address_postal_code,
          address_country, phone, company_email, admin_name, billing_name,
          billing_nif, billing_street, billing_neighborhood,
          billing_municipality, billing_province, billing_postal_code,
          billing_country, billing_phone, billing_email, promo_code,
          pre_registration_date
        );

        const username = email.split('@')[0];
        // 2. Inserir na tabela local 'users'
        db.prepare(`
          INSERT INTO users (id, email, username, password_hash, company_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, email, username, password, companyId);

        return res.json({ success: true, companyId, message: "Registo local concluído (Modo de Teste)" });
      } catch (err: any) {
        return res.status(500).json({ error: "Erro no registo local: " + err.message });
      }
    };

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
            company_name: companyName
          }
        }
      });

      if (authError) {
        console.error("Supabase signUp error:", authError);
        if (authError.message === 'fetch failed' || (authError as any).code === 'ENOTFOUND') {
          return localRegister();
        }
        return res.status(400).json({ error: authError.message });
      }

      if (!authData.user) {
        return res.status(400).json({ error: "Erro ao criar utilizador." });
      }

      const companyId = crypto.randomUUID();
      
      // 2. Criar empresa no Supabase
      const { error: companyError } = await supabase.from('companies').insert([{
        id: companyId,
        name: companyName,
        type: companyType,
        nif,
        address_street,
        address_neighborhood,
        address_municipality,
        address_province,
        address_postal_code,
        address_country,
        phone,
        email: company_email,
        admin_name,
        billing_name,
        billing_nif,
        billing_street,
        billing_neighborhood,
        billing_municipality,
        billing_province,
        billing_postal_code,
        billing_country,
        billing_phone,
        billing_email,
        promo_code,
        pre_registration_date
      }]);

      if (companyError) {
        console.error("Supabase company error:", JSON.stringify(companyError, null, 2));
      }

      // 3. Criar perfil de utilizador no Supabase
      const { error: profileError } = await supabase.from('users').insert([{
        id: authData.user.id,
        email,
        company_id: companyId
      }]);

      if (profileError) {
        console.error("Supabase profile error:", JSON.stringify(profileError, null, 2));
      }

      // 4. Inserir na tabela local para redundância/fallback
      try {
        db.prepare(`
          INSERT INTO companies (
            id, name, type, nif, address_street, address_neighborhood, 
            address_municipality, address_province, address_postal_code, 
            address_country, phone, email, admin_name, billing_name, 
            billing_nif, billing_street, billing_neighborhood, 
            billing_municipality, billing_province, billing_postal_code, 
            billing_country, billing_phone, billing_email, promo_code, 
            pre_registration_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          companyId, companyName, companyType, nif, address_street, address_neighborhood,
          address_municipality, address_province, address_postal_code,
          address_country, phone, company_email, admin_name, billing_name,
          billing_nif, billing_street, billing_neighborhood,
          billing_municipality, billing_province, billing_postal_code,
          billing_country, billing_phone, billing_email, promo_code,
          pre_registration_date
        );

        const username = email.split('@')[0];
        db.prepare(`
          INSERT INTO users (id, email, username, password_hash, company_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(authData.user.id, email, username, password, companyId);
      } catch (e) {
        console.warn("Local DB sync error during registration:", e);
      }

      res.json({ success: true, companyId, message: "Registo concluído com sucesso! Verifique o seu email para confirmar a conta." });
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
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("users").select("email, username").eq("username", username).single();
        if (!error && data) return res.json(data);
      }
      /* SQLite disabled */
      if (!user) return res.status(404).json({ error: "Utilizador não encontrado" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/users/profile/:id", async (req, res) => {
    const { id } = req.params;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
        if (!error && data) return res.json(data);
      }
      /* SQLite disabled */
      if (!user) return res.status(404).json({ error: "Perfil não encontrado" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    const { company_id } = req.query;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("clientes").select("*").eq("company_id", company_id);
        if (!error) return res.json(data);
      }
      /* SQLite disabled */
      const clients: any[] = [];
      res.json(clients);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.post("/api/clients", async (req, res) => {
    const { name, email, contribuinte, morada, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, saldo_inicial, estado_nif, company_id } = req.body;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("clientes").insert([{ 
          name, email, contribuinte, morada, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, saldo_inicial, estado_nif, company_id 
        }]).select();
        if (!error) return res.json(data[0]);
        console.error("Supabase insert client error:", error);
        return res.status(500).json({ error: error.message });
      }
      throw new Error("Local DB disabled");
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, contribuinte, morada, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, saldo_inicial, estado_nif } = req.body;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { error } = await supabase.from("clientes").update({ name, email, contribuinte, morada, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, saldo_inicial, estado_nif }).eq("id", id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        db.prepare(`
          UPDATE clients 
          SET name = ?, email = ?, contribuinte = ?, morada = ?, localidade = ?, codigo_postal = ?, provincia = ?, municipio = ?, pais = ?, telefone = ?, webpage = ?, tipo_cliente = ?, saldo_inicial = ?, estado_nif = ?
          WHERE id = ?
        `).run(name, email, contribuinte, morada, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente, saldo_inicial, estado_nif, id);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    const { company_id } = req.query;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        let query = supabase.from("produtos").select("*").order("name", { ascending: true });
        if (company_id) query = query.eq("company_id", company_id);
        const { data, error } = await query;
        if (!error) return res.json(data);
      }
      let sql = "SELECT * FROM products";
      const params = [];
      if (company_id) {
        sql += " WHERE company_id = ?";
        params.push(company_id);
      }
      sql += " ORDER BY name ASC";
      /* SQLite disabled */
      const products: any[] = [];
      res.json(products);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.post("/api/products", async (req, res) => {
    const { name, referente, data_registo, warehouse_id, tipo_documento, cost_price, price, finalidade, tipologia, unit, stock_quantity, min_stock, category, barcode, company_id } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase.from("produtos").insert([{ name, referente, data_registo, warehouse_id, tipo_documento, cost_price, price, finalidade, tipologia, unit, stock_quantity, min_stock, category, barcode, company_id }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      /* SQLite disabled */
      /* SQLite disabled */ const INVALID = db.prepare(`
        INSERT INTO products (
          name, referente, data_registo, warehouse_id, tipo_documento, 
          cost_price, price, finalidade, tipologia, unit, 
          stock_quantity, min_stock, category, barcode, company_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, referente, data_registo, warehouse_id, tipo_documento, 
        cost_price, price, finalidade, tipologia, unit, 
        stock_quantity, min_stock, category, barcode, company_id
      );
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.get("/api/stock-movements", async (req, res) => {
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase.from("movimentos_stock").select("*, produtos(name), armazens(name)").order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    /* SQLite Fallback Removed */ res.json([]);
  });

  app.post("/api/stock-movements", async (req, res) => {
    const { product_id, type, quantity, warehouse_id, to_warehouse_id, description, reference_id, unit_price } = req.body;
    try {
      /* SQLite disabled */
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("faturas")
          .select("*, clientes(name), locais_trabalho(title)")
          .order("created_at", { ascending: false });
        
        if (!error) {
          const formatted = data.map(i => ({ 
            ...i, 
            client_name: i.clientes?.name,
            work_site_title: i.locais_trabalho?.title
          }));
          return res.json(formatted);
        }
        console.warn("Supabase Query/Schema Error (/api/invoices):", error.message);
      }
      
      /* SQLite disabled */
      const invoices: any[] = [];
      res.json(invoices);
    } catch (error) {
      console.error("Error in /api/invoices:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/payroll", async (req, res) => {
    const { employee_id, month, year, base_salary, inss_worker, inss_company, irt, net_salary } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("payroll")
        .insert([{ employee_id, month, year, base_salary, inss_worker, inss_company, irt, net_salary }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json(data[0]);
    } else {
      /* SQLite disabled */
      /* SQLite disabled */ const INVALID = db.prepare(`
        INSERT INTO payroll (employee_id, month, year, base_salary, inss_worker, inss_company, irt, net_salary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(employee_id, month, year, base_salary, inss_worker, inss_company, irt, net_salary);
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.get("/api/payroll", async (req, res) => {
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("payroll")
          .select("*, funcionarios(name)")
          .order("created_at", { ascending: false });
        if (!error) {
          const formatted = data.map(p => ({ ...p, employee_name: p.funcionarios?.name }));
          return res.json(formatted);
        }
      }
      /* SQLite Fallback Removed */ res.json([]);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.get("/api/issued-documents", async (req, res) => {
    console.log("GET /api/issued-documents called");
    const { company_id } = req.query;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        // Use a more robust select to handle potential schema inconsistencies
        let query = supabase
          .from("faturas")
          .select("*, clientes(name), series_fiscais(*), locais_trabalho(title)");
        
        if (company_id) {
          query = query.eq("company_id", company_id);
        }
        
        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error) {
          const formatted = data.map(i => {
            // Defensive access to series name
            let seriesName = '';
            if (i.series_fiscais) {
              seriesName = i.series_fiscais.description || i.series_fiscais.name || i.series_fiscais.code || '';
            }
            
            return { 
              ...i, 
              client_name: i.clientes?.name || 'Cliente não encontrado',
              series_name: seriesName,
              work_site_title: i.locais_trabalho?.title
            };
          });
          console.log(`Fetched ${formatted.length} documents from Supabase`);
          return res.json(formatted);
        }
        console.warn("Supabase Query/Schema Error (/api/issued-documents):", error.message);
        
        // Fallback for series_fiscais join issues - try without join
        if (error.message.includes('column') || error.message.includes('relation')) {
          console.log("Attempting fallback query without series_fiscais join...");
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("faturas")
            .select("*, clientes(name), locais_trabalho(title)")
            .eq("company_id", company_id || '');
            
          if (!fallbackError) {
            return res.json(fallbackData.map(i => ({
              ...i,
              client_name: i.clientes?.name || 'Cliente não encontrado',
              series_name: 'Série não encontrada',
              work_site_title: i.locais_trabalho?.title
            })));
          }
        }
      }
      
      let queryStr = `
          SELECT i.*, c.name as client_name, s.description as series_name, ws.title as work_site_title
          FROM invoices i 
          LEFT JOIN clients c ON i.client_id = c.id 
          LEFT JOIN fiscal_series s ON i.series_id = s.id
          LEFT JOIN work_sites ws ON i.work_site_id = ws.id
      `;
      const params: any[] = [];
      if (company_id) {
        queryStr += " WHERE i.company_id = ?";
        params.push(company_id);
      }
      queryStr += " ORDER BY i.created_at DESC";
      
      /* SQLite disabled */
      const invoices: any[] = [];
      console.log(`Fetched ${invoices.length} documents from SQLite`);
      res.json(invoices);
    } catch (error) {
      console.error("Error in /api/issued-documents:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch issued documents" });
    }
  });

  app.post("/api/invoices/:id/certify", async (req, res) => {
    const { id } = req.params;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { error } = await supabase.from("faturas").update({ is_certified: true }).eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      /* SQLite disabled */
      res.json({ success: true });
    }
  });

  app.post("/api/invoices/:id/cancel", async (req, res) => {
    const { id } = req.params;
    try {
      let invoice: any;
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data } = await supabase.from("faturas").select("*, itens_fatura(*)").eq("id", id).single();
        invoice = data;
      } else {
        invoice = (() => { /* SQLite disabled */ })();;
        if (invoice) {
          invoice.items = (() => { /* SQLite disabled */ })();;
        }
      }

      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      if (!invoice.is_certified) return res.status(400).json({ error: "Only certified documents can be canceled" });

      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        await supabase.from("faturas").update({ status: 'anulado', is_anulado: 1 }).eq("id", id);
      } else {
        /* SQLite disabled */
      }

      for (const item of (invoice.items || invoice.invoice_items || [])) {
        if (item.product_id) {
          var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
            const { data: product } = await supabase.from("produtos").select("stock_quantity").eq("id", item.product_id).single();
            if (product) {
              await supabase.from("produtos").update({ stock_quantity: product.stock_quantity + item.quantity }).eq("id", item.product_id);
            }
          } else {
            /* SQLite disabled */
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
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data } = await supabase.from("faturas").select("*, itens_fatura(*)").eq("id", id).single();
        original = data;
      } else {
        original = (() => { /* SQLite disabled */ })();;
        if (original) {
          original.items = (() => { /* SQLite disabled */ })();;
        }
      }
      if (!original) return res.status(404).json({ error: "Original invoice not found" });
      res.json(original);
    } catch (error) {
      res.status(500).json({ error: "Failed to clone document" });
    }
  });

  app.post("/api/receipts", async (req, res) => {
    const { invoice_id, company_id, amount, payment_method, cash_box, date } = req.body;
    try {
      /* SQLite disabled */
      let nextNum = 1;
      if (lastReceipt && lastReceipt.receipt_number) {
        const numMatch = lastReceipt.receipt_number.match(/\d+$/);
        if (numMatch) nextNum = parseInt(numMatch[0]) + 1;
      }
      const receipt_number = `RC${String(nextNum).padStart(3, '0')}`;

      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        await supabase.from("receipts").insert([{ invoice_id, company_id, receipt_number, amount, payment_method, cash_box, date }]);
      } else {
        db.prepare(`
          INSERT INTO receipts (invoice_id, company_id, receipt_number, amount, payment_method, cash_box, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(invoice_id, company_id, receipt_number, amount, payment_method, cash_box, date);
      }

      let invoice: any;
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data } = await supabase.from("faturas").select("total").eq("id", invoice_id).single();
        const { data: receipts } = await supabase.from("receipts").select("amount").eq("invoice_id", invoice_id);
        invoice = data;
        const totalPaid = receipts?.reduce((sum, r) => sum + r.amount, 0) || 0;
        const newStatus = totalPaid >= invoice.total ? 'paid' : 'partial';
        await supabase.from("faturas").update({ payment_status: newStatus }).eq("id", invoice_id);
      } else {
        invoice = (() => { /* SQLite disabled */ })();
        const totalPaid = 0;
        const newStatus = totalPaid >= invoice.total ? 'paid' : 'partial';
        /* SQLite disabled */
      }
      res.json({ success: true, receipt_number });
    } catch (error) {
      res.status(500).json({ error: "Failed to create receipt" });
    }
  });

  app.get("/api/invoices/:id/receipts", async (req, res) => {
    const { id } = req.params;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data } = await supabase.from("receipts").select("*").eq("invoice_id", id);
        res.json(data);
      } else {
        /* SQLite Fallback Removed */ res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  app.put("/api/invoices/:id/partial", async (req, res) => {
    const { id } = req.params;
    const { due_date, payment_method, cash_box, work_site_id } = req.body;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        await supabase.from("faturas").update({ due_date, payment_method, cash_box, work_site_id }).eq("id", id);
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
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        // AGT Rule: Do not delete, only void (anular)
        const { error } = await supabase.from("faturas").update({ status: 'anulado' }).eq("id", id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, message: 'Documento anulado com sucesso' });
      } else {
        /* SQLite disabled */
        res.json({ success: true, message: 'Documento anulado com sucesso' });
      }
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.post("/api/invoices/:id/clone", async (req, res) => {
    const { id } = req.params;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data: original, error: fetchError } = await supabase.from("faturas").select("*").eq("id", id).single();
        if (fetchError) return res.status(500).json({ error: fetchError.message });
        
        const { id: _, created_at: __, numero_documento: ___, ...clonedData } = original;
        clonedData.numero_documento = `CLONE-${original.numero_documento}-${Date.now()}`;
        clonedData.is_certified = false;
        
        const { data, error } = await supabase.from("faturas").insert([clonedData]).select();
        if (error) return res.status(500).json({ error: error.message });
        res.json(data[0]);
      } else {
        /* SQLite disabled */
        if (!original) return res.status(404).send("Invoice not found");
        
        const { id: _, created_at: __, numero_documento: ___, ...clonedData } = original;
        const keys = Object.keys(clonedData);
        const values = Object.values(clonedData);
        const placeholders = keys.map(() => '?').join(', ');
        
        const newNumero = `CLONE-${original.numero_documento}-${Date.now()}`;
        const newKeys = [...keys, 'numero_documento', 'is_certified'];
        const newValues = [...values, newNumero, 0];
        const newPlaceholders = newKeys.map(() => '?').join(', ');
        
        /* SQLite disabled */
      /* SQLite disabled */
        res.json({ id: info.lastInsertRowid });
      }
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.get("/api/work-sites", async (req, res) => {
    const { company_id } = req.query;
    var supabase = req.supabase || globalSupabase;
    if (supabaseEnabled) {
      let query = supabase
        .from("locais_trabalho")
        .select("*, clientes(name)");
      
      if (company_id) {
        query = query.eq("company_id", company_id);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error) {
        const formatted = data.map(w => ({ ...w, client_name: w.clientes?.name }));
        return res.json(formatted);
      }
      console.warn("Supabase Query/Schema Error (/api/work-sites):", error.message);
    }
    /* SQLite disabled */
    const rows: any[] = [];
    res.json(rows);
  });

  app.post("/api/work-sites", async (req, res) => {
    const { client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations, company_id } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("locais_trabalho")
        .insert([{ client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations, company_id }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      /* SQLite disabled */
      /* SQLite disabled */ const INVALID = db.prepare(`
        INSERT INTO work_sites (client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations, company_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations, company_id);
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.put("/api/work-sites/:id", async (req, res) => {
    const { client_id, start_date, end_date, title, code, staff_per_day, total_staff, location, description, contact, observations } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { error } = await supabase
        .from("locais_trabalho")
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
    const company_id = req.query.company_id;

    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      let query = supabase.from("work_site_movements").select("*").eq("work_site_id", id);
      if (company_id) {
        query = query.eq("company_id", company_id);
      }
      const { data, error } = await query.order("date", { ascending: true }).order("created_at", { ascending: true });
      if (!error) return res.json(data);
      console.warn("Supabase Query/Schema Error (/api/work-sites/:id/movements):", error.message);
    }

    let queryStr = "SELECT * FROM work_site_movements WHERE work_site_id = ?";
    const params: any[] = [id];
    if (company_id) {
      queryStr += " AND company_id = ?";
      params.push(company_id);
    }
    queryStr += " ORDER BY date ASC, created_at ASC";

    /* SQLite disabled */
    const rows: any[] = [];
    res.json(rows);
  });

  app.post("/api/work-sites/:id/movements", async (req, res) => {
    const { date, doc_no, company, description, debit, credit, company_id } = req.body;
    const work_site_id = req.params.id;

    // Calculate new balance
    let currentBalance = 0;
    var supabase = req.supabase || globalSupabase;
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
      /* SQLite disabled */
      if (lastMovement) {
        currentBalance = lastMovement.balance;
      }
    }

    const newBalance = currentBalance + (Number(credit) || 0) - (Number(debit) || 0);

    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("work_site_movements")
        .insert([{ work_site_id, date, doc_no, company, description, debit: debit || 0, credit: credit || 0, balance: newBalance, company_id }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id, balance: newBalance });
    } else {
      /* SQLite disabled */
      /* SQLite disabled */ const INVALID = db.prepare(`
        INSERT INTO work_site_movements (work_site_id, date, doc_no, company, description, debit, credit, balance, company_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(work_site_id, date, doc_no, company, description, debit || 0, credit || 0, newBalance, company_id);
      
      res.json({ id: info.lastInsertRowid, balance: newBalance });
    }
  });

  app.get("/api/invoices/:id", (req, res) => {
    /* SQLite disabled */

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    /* SQLite disabled */
    res.json({ ...invoice, items });
  });

  app.post("/api/invoices", async (req, res) => {
    console.log("POST /api/invoices called with body:", JSON.stringify(req.body, null, 2));
    try {
      const { 
        client_id, date, due_date, items, document_type, work_site_id, 
        vat_withholding, exchange_rate, currency, counter_value, global_discount,
        service_date, service_location, cash_box, payment_method, series_id, company_id
      } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: "A fatura deve conter pelo menos um item." });
      }

    // Normalize IDs
    const normalizedSeriesId = series_id === '' ? null : series_id;
    const normalizedWorkSiteId = work_site_id === '' ? null : work_site_id;
    
    // Check client NIF status
    let client;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase.from("clientes").select("estado_nif").eq("id", client_id).single();
      if (!error) client = data;
    } else {
      client = (() => { /* SQLite disabled */ })();;
    }
    
    if (client && client.estado_nif === 'suspenso') {
      return res.status(400).json({ error: "Não é possível emitir fatura: O NIF do cliente está suspenso." });
    }

    // Get Series info
    let seriesDesc = 'A';
    if (normalizedSeriesId) {
      if (supabaseEnabled) {
        const { data } = await supabase.from("series_fiscais").select("description").eq("id", normalizedSeriesId).single();
        if (data) seriesDesc = data.description;
      } else {
        /* SQLite disabled */
        if (series && (series as any).description) seriesDesc = (series as any).description;
      }
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
    /* SQLite disabled */ const INVALID = db.prepare(`
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
    const total = (items ?? []).reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

    // Fiscal Logic
    let prevHash = '0';
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        prevHash = await getPreviousHash(supabase);
      } else {
        /* SQLite disabled */
        if (lastInv && lastInv.hash) prevHash = lastInv.hash;
      }
    } catch (e) {
      console.warn("Error getting previous hash:", e);
    }

    const docContent = `${invoice_number}${date}${total}${prevHash}`;
    const hash = generateDocumentHash(docContent);
    const signature = signDocument(docContent);

    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data: invoice, error: invError } = await supabase
        .from("faturas")
        .insert([{ 
          client_id, invoice_number, date, due_date, total, hash, 
          document_type, work_site_id, vat_withholding, exchange_rate, 
          currency, counter_value, global_discount, signature,
          service_date, service_location, cash_box, payment_method,
          series_id, company_id, status: 'ativo'
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
      await supabase.from("itens_fatura").insert(itemsToInsert);

      // Update stock and record movements for produtos
      for (const item of items) {
        if (item.product_id) {
          const { data: product } = await supabase.from("produtos").select("stock_quantity, warehouse_id, cost_price").eq("id", item.product_id).single();
          if (product) {
            const prevStock = product.stock_quantity;
            const currStock = prevStock - item.quantity;
            await supabase.from("produtos").update({ stock_quantity: currStock }).eq("id", item.product_id);
            await supabase.from("movimentos_stock").insert([{
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
      /* SQLite disabled */
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
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("profissoes").select("*").order("name", { ascending: true });
        if (!error) {
          return res.json(data);
        }
        console.warn("Supabase Query/Schema Error (/api/profissoes):", error.message);
      }
      /* SQLite disabled */
      res.json(professions);
    } catch (error) {
      console.error("Error in /api/professions:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/professions", async (req, res) => {
    const { name, inss_profession, base_salary, company_id } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase.from("profissoes").insert([{ name, inss_profession, base_salary, company_id }]).select();
      if (!error) {
        return res.json({ id: data[0].id });
      }
      console.warn("Supabase Query/Schema Error (POST /api/profissoes):", error.message);
    }
    /* SQLite disabled */
      /* SQLite disabled */
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/professions/:id", async (req, res) => {
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { error } = await supabase.from("profissoes").delete().eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      /* SQLite disabled */
      res.json({ success: true });
    }
  });

  app.get("/api/employees", async (req, res) => {
    console.log("GET /api/employees called");
    const { company_id } = req.query;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        let query = supabase
          .from("funcionarios")
          .select("*, profissoes(name)");
        
        if (company_id) {
          query = query.eq("company_id", company_id);
        }
        
        const { data, error } = await query.order("name", { ascending: true });
        
        if (!error) {
          const formatted = data.map(e => ({ ...e, profession_name: e.profissoes?.name }));
          return res.json(formatted);
        }
        console.warn("Supabase Query/Schema Error (/api/employees):", error.message);
      }
      
      /* SQLite disabled */
      const employees: any[] = [];
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
      bank_account, inss_number, company_id
    } = req.body;
    
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("funcionarios")
        .insert([{ 
          name, role, profession_id, salary, email, phone, hired_at,
          nif, address, iban, bank_name, image_url, birth_date,
          gender, marital_status, academic_level, department,
          bi, contract_type, dependents, subject_to_irt, subject_to_inss,
          bank_account, inss_number, company_id
        }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      /* SQLite disabled */
      /* SQLite disabled */ const INVALID = db.prepare(`
        INSERT INTO employees (
          name, role, profession_id, salary, email, phone, hired_at,
          nif, address, iban, bank_name, image_url, birth_date,
          gender, marital_status, academic_level, department,
          bi, contract_type, dependents, subject_to_irt, subject_to_inss,
          bank_account, inss_number, company_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, role, profession_id, salary, email, phone, hired_at,
        nif, address, iban, bank_name, image_url, birth_date,
        gender, marital_status, academic_level, department,
        bi, contract_type, dependents, subject_to_irt, subject_to_inss,
        bank_account, inss_number, company_id
      );
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { error } = await supabase.from("funcionarios").delete().eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      /* SQLite disabled */
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
    
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("funcionarios")
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

    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { error: empError } = await supabase
        .from("funcionarios")
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
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("labor_terminations")
          .select("*, funcionarios(name, role)");
        if (!error) return res.json(data);
      }
      return res.json([]);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/employees/absences", async (req, res) => {
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("employee_absences")
          .select("*, funcionarios(name)")
          .order("start_date", { ascending: false });
        
        if (!error) {
          const formatted = data.map(a => ({ ...a, employee_name: a.funcionarios?.name }));
          return res.json(formatted);
        }
        console.error("Supabase Query/Schema Error (/api/employees/absences):", error);
      }
      
      return res.json([]);
    } catch (error) {
      console.error("Error in /api/employees/absences:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/employees/absences", async (req, res) => {
    const { employee_id, type, start_date, end_date, amount, company_id } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("employee_absences")
        .insert([{ employee_id, type, start_date, end_date, amount, company_id }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ id: data[0].id });
    } else {
      return res.json({ id: Date.now() });
    }
  });

  app.get("/api/employees/attendance", async (req, res) => {
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("employee_attendance")
          .select("*, funcionarios(name)")
          .order("date", { ascending: false });
        
        if (!error) {
          const formatted = data.map(a => ({ ...a, employee_name: a.funcionarios?.name }));
          return res.json(formatted);
        }
        console.error("Supabase Query/Schema Error (/api/employees/attendance):", error);
      }
      
      return res.json([]);
    } catch (error) {
      console.error("Error in /api/employees/attendance:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/employees/attendance", async (req, res) => {
    const { employee_id, date, status, company_id } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("employee_attendance")
        .insert([{ employee_id, date, status, company_id }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ id: data[0].id });
    } else {
      return res.json({ id: Date.now() });
    }
  });

  app.post("/api/employees/attendance/bulk", async (req, res) => {
    const { attendanceMap, month, year } = req.body;
    // attendanceMap: { employeeId: { day: status } }
    try {
      var supabase = req.supabase || globalSupabase;
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

      /* SQLite disabled */
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
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("employee_attendance")
          .select("*")
          .gte("date", startDate)
          .lte("date", endDate);
        if (error) throw error;
        return res.json(data);
      }
      
      return res.json([]);
    } catch (error) {
      console.error("Error in monthly attendance:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/employees/contracts", async (req, res) => {
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("employee_contracts")
          .select("*, funcionarios(name)");
        
        if (!error) {
          const formatted = data.map(c => ({ ...c, employee_name: c.funcionarios?.name }));
          return res.json(formatted);
        }
        console.error("Supabase Query/Schema Error (/api/employees/contracts):", error);
      }
      
      return res.json([]);
    } catch (error) {
      console.error("Error in /api/employees/contracts:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/generated-contracts", (req, res) => {
    return res.json([]);
  });

  app.post("/api/generated-contracts", (req, res) => {
    return res.json({ id: Date.now() });
  });

  app.post("/api/employees/contracts", async (req, res) => {
    const { employee_id, contract_type, start_date, end_date, company_id } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase
        .from("employee_contracts")
        .insert([{ employee_id, contract_type, start_date, end_date, company_id }])
        .select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      /* SQLite disabled */
      /* SQLite disabled */
      res.json({ id: info.lastInsertRowid });
    }
  });

  // POS Endpoints
  app.get("/api/pos/sales", async (req, res) => {
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("pos_sales").select("*").order("date", { ascending: false });
        if (!error) {
          return res.json(data);
        }
        console.error("Supabase Query/Schema Error (/api/pos/sales):", error);
      }
      /* SQLite disabled */
      res.json(sales);
    } catch (error) {
      console.error("Error in /api/pos/sales:", error);
      res.status(500).send(String(error));
    }
  });

  app.get("/api/stock/movements", async (req, res) => {
    const { company_id, product_id, warehouse_id } = req.query;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        let query = supabase.from("movimentos_stock").select("*, produtos(name, referente), armazens(name)");
        if (company_id) query = query.eq("company_id", company_id);
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
      if (company_id) {
        conditions.push("sm.company_id = ?");
        params.push(company_id);
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
      /* SQLite disabled */
      const rows: any[] = [];
      res.json(rows);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.post("/api/stock/movements", async (req, res) => {
    const { product_id, type, quantity, warehouse_id, to_warehouse_id, description, company_id, unit_price } = req.body;
    try {
      // 1. Get current stock
      let currentStock = 0;
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data } = await supabase.from("produtos").select("stock_quantity").eq("id", product_id).single();
        currentStock = data?.stock_quantity || 0;
      } else {
        /* SQLite disabled */
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
          var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
            const { data: product } = await supabase.from("produtos").select("*").eq("id", product_id).single();
            if (product) {
              const { data: destProduct } = await supabase.from("produtos")
                .select("*")
                .eq("name", product.name)
                .eq("warehouse_id", to_warehouse_id)
                .single();
              
              if (destProduct) {
                await supabase.from("produtos").update({ stock_quantity: destProduct.stock_quantity + Number(quantity) }).eq("id", destProduct.id);
              } else {
                await supabase.from("produtos").insert([{
                  ...product,
                  id: undefined,
                  warehouse_id: to_warehouse_id,
                  stock_quantity: Number(quantity),
                  created_at: undefined,
                  company_id
                }]);
              }
            }
          } else {
            /* SQLite disabled */
            if (product) {
              /* SQLite disabled */
              if (destProduct) {
                /* SQLite disabled */
              } else {
                db.prepare(`
                  INSERT INTO products (name, referente, price, cost_price, stock_quantity, min_stock, warehouse_id, unit, category, barcode, image, company_id)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(product.name, product.referente, product.price, product.cost_price, Number(quantity), product.min_stock, to_warehouse_id, product.unit, product.category, product.barcode, product.image, company_id);
              }
            }
          }
        }
      }

      // 2. Update product stock (source)
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        await supabase.from("produtos").update({ stock_quantity: newStock }).eq("id", product_id);
        const { data, error } = await supabase.from("movimentos_stock").insert([{
          product_id, type, quantity, previous_stock: previousStock, current_stock: newStock,
          warehouse_id, to_warehouse_id, description, company_id, unit_price
        }]).select();
        if (error) throw error;
        res.json(data[0]);
      } else {
        /* SQLite disabled */
        /* SQLite disabled */
      /* SQLite disabled */ const INVALID = db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, current_stock, warehouse_id, to_warehouse_id, description, company_id, unit_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(product_id, type, quantity, previousStock, newStock, warehouse_id, to_warehouse_id, description, company_id, unit_price || 0);
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
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { error } = await supabase.from("produtos").update({ price, cost_price }).eq("id", id);
        if (error) throw error;
      } else {
        /* SQLite disabled */
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.get("/api/warehouses", async (req, res) => {
    var supabase = req.supabase || globalSupabase;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("armazens").select("*");
      if (!error) return res.json(data);
    }
    /* SQLite disabled */
    const warehouses: any[] = [];
    res.json(warehouses);
  });

  app.post("/api/warehouses", (req, res) => {
    const { name, localidade, provincia, responsavel, contacto, observacao } = req.body;
    /* SQLite disabled */
      /* SQLite disabled */
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/suppliers", (req, res) => {
    /* SQLite disabled */
    res.json(suppliers);
  });

  // Caixa Endpoints
  app.get("/api/caixas", (req, res) => {
    const { company_id } = req.query;
    try {
      let query = "SELECT * FROM caixas";
      const params: any[] = [];
      if (company_id) {
        query += " WHERE company_id = ?";
        params.push(company_id);
      }
      query += " ORDER BY name ASC";
      /* SQLite Fallback Removed */ res.json([]);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/caixas", (req, res) => {
    const { id, name, account, responsible, user, users, initialBalance, currentBalance, obs, bankName, status, company_id } = req.body;
    try {
      /* SQLite disabled */
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/caixas/:id/close", (req, res) => {
    try {
      /* SQLite disabled */
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/caixa-movements", (req, res) => {
    const { company_id } = req.query;
    try {
      let query = "SELECT * FROM caixa_movements";
      const params: any[] = [];
      if (company_id) {
        query += " WHERE company_id = ?";
        params.push(company_id);
      }
      query += " ORDER BY date DESC";
      /* SQLite Fallback Removed */ res.json([]);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/caixa-movements", (req, res) => {
    const { id, caixaId, type, amount, description, date, targetCaixaId, company_id } = req.body;
    try {
      /* SQLite disabled */
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/suppliers", (req, res) => {
    const { name, nif, email, phone, address } = req.body;
    /* SQLite disabled */
      /* SQLite disabled */
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/pos/sales", async (req, res) => {
    const { total, items, series_id, cost_center_id, pos_point_id, session_id, discount, payment_method } = req.body;
    const items_json = JSON.stringify(items);
    var supabase = req.supabase || globalSupabase;
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
      /* SQLite disabled */
      /* SQLite disabled */ const INVALID = db.prepare("INSERT INTO pos_sales (total, items_json, series_id, cost_center_id, pos_point_id, session_id, discount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        total, items_json, series_id, cost_center_id, pos_point_id, session_id, discount, payment_method
      );
      
      if (session_id) {
        /* SQLite disabled */
      }

      /* SQLite disabled */
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Settings Endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("app_settings").select("*");
        if (!error) {
          const settingsObj = data.reduce((acc: any, s: any) => {
            acc[s.key] = s.value;
            return acc;
          }, {});
          return res.json(settingsObj);
        }
        console.error("Supabase Query/Schema Error (/api/settings):", error);
      }
      /* SQLite disabled */
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
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { error } = await supabase.from("app_settings").upsert([{ key, value }]);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      /* SQLite disabled */
      res.json({ success: true });
    }
  });

  // Client Current Account (Conta Corrente)
  app.get("/api/clients/:id/account", async (req, res) => {
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data: invoices, error: invError } = await supabase.from("faturas").select("*").eq("client_id", req.params.id).order("date", { ascending: false });
        const { data: transactions, error: transError } = await supabase
          .from("transactions")
          .select("*, faturas!inner(client_id)")
          .eq("faturas.client_id", req.params.id)
          .eq("category", "sale")
          .order("date", { ascending: false });
        
        if (!invError && !transError) {
          return res.json({ invoices, transactions });
        }
        console.error("Supabase Query/Schema Error (/api/clients/:id/account):", invError || transError);
      }
      
      /* SQLite disabled */
      /* SQLite disabled */ const INVALID = db.prepare(`
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
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase
          .from("payroll")
          .select("*, funcionarios(name)")
          .order("year", { ascending: false })
          .order("month", { ascending: false });
        
        if (!error) {
          const formatted = data.map(p => ({ ...p, employee_name: p.funcionarios?.name }));
          return res.json(formatted);
        }
        console.error("Supabase Query/Schema Error (/api/payroll):", error);
      }
      
      /* SQLite Fallback Removed */ res.json([]);
    } catch (error) {
      console.error("Error in /api/payroll:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/payroll", async (req, res) => {
    const { employee_id, month, year, amount } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase.from("payroll").insert([{ employee_id, month, year, amount }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      /* SQLite disabled */
      /* SQLite disabled */
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Company Endpoints
  app.get("/api/company/:id", async (req, res) => {
    const { id } = req.params;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
        if (!error) return res.json(data);
      }
      /* SQLite Fallback Removed */ res.json(null);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.put("/api/company/:id", async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        updateData.updated_at = new Date().toISOString();
        const { data, error } = await supabase.from("companies").update(updateData).eq("id", id).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  // Workplaces Endpoints
  app.get("/api/workplaces", async (req, res) => {
    const { company_id } = req.query;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("workplaces").select("*").eq("company_id", company_id);
        if (!error) return res.json(data);
      }
      /* SQLite Fallback Removed */ res.json([]);
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.post("/api/workplaces", async (req, res) => {
    const { name, location, code, company_id } = req.body;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("workplaces").insert([{ name, location, code, company_id }]).select();
        if (!error) return res.json(data[0]);
        console.error("Supabase insert workplace error:", error);
        return res.status(500).json({ error: error.message });
      }
      throw new Error("Local DB disabled");
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  // Financial Endpoints
  app.get("/api/transactions", async (req, res) => {
    console.log("GET /api/transactions called");
    const { company_id } = req.query;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        let query = supabase.from("transactions").select("*");
        if (company_id) {
          query = query.eq("company_id", company_id);
        }
        const { data, error } = await query.order("date", { ascending: false });
        if (!error) {
          return res.json(data);
        }
        console.error("Supabase Query/Schema Error (/api/transactions):", error);
      }
      
      let queryStr = "SELECT * FROM transactions";
      const params: any[] = [];
      if (company_id) {
        queryStr += " WHERE company_id = ?";
        params.push(company_id);
      }
      queryStr += " ORDER BY date DESC";
      
      /* SQLite Fallback Removed */ res.json([]);
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
    /* SQLite disabled */
    console.log(`Added column ${col.name} to transactions table.`);
  } catch (e) {
    // Column likely already exists
  }
}

  app.post("/api/transactions", async (req, res) => {
    const { type, category, amount, description, payment_method, reference, observation, date, company_id } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { data, error } = await supabase.from("transactions").insert([{ 
        type, category, amount, description, payment_method, reference, observation, date, company_id 
      }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      /* SQLite disabled */
      /* SQLite disabled */ const INVALID = db.prepare("INSERT INTO transactions (type, category, amount, description, payment_method, reference, observation, date, company_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        type, category, amount, description, payment_method, reference, observation, date || new Date().toISOString(), company_id
      );
      res.json({ id: info.lastInsertRowid });
    }
  });

  // Cashier Endpoints
  app.get("/api/cash/sessions", async (req, res) => {
    const { company_id } = req.query;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        let query = supabase.from("cash_sessions").select("*").order("opened_at", { ascending: false });
        if (company_id) {
          query = query.eq("company_id", company_id);
        }
        const { data, error } = await query;
        if (!error) {
          return res.json(data);
        }
        console.error("Supabase Query/Schema Error (/api/cash/sessions):", error);
      }
      /* SQLite Fallback Removed */ res.json([]);
    } catch (error) {
      console.error("Error in /api/cash/sessions:", error);
      res.status(500).send(String(error));
    }
  });

  app.post("/api/cash/open", async (req, res) => {
    const { initial_balance, pos_point_id, company_id } = req.body;
    var supabase = req.supabase || globalSupabase;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("cash_sessions").insert([{ 
        initial_balance, 
        pos_point_id: pos_point_id || null, 
        status: 'open',
        company_id
      }]).select();
      if (error) return res.status(500).json({ error: error.message });
      res.json({ id: data[0].id });
    } else {
      /* SQLite disabled */
      /* SQLite disabled */
      res.json({ id: info.lastInsertRowid });
    }
  });

  app.post("/api/cash/close/:id", async (req, res) => {
    const { final_balance } = req.body;
    var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
      const { error } = await supabase
        .from("cash_sessions")
        .update({ final_balance, status: 'closed', closed_at: new Date().toISOString() })
        .eq("id", req.params.id);
      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } else {
      /* SQLite disabled */
      res.json({ success: true });
    }
  });

  // Fiscal Series
  app.get("/api/fiscal-series", async (req, res) => {
    const { company_id } = req.query;
    var supabase = req.supabase || globalSupabase;
    if (supabaseEnabled) {
      let query = supabase.from("series_fiscais").select("*");
      if (company_id) {
        query = query.eq("company_id", company_id);
      }
      const { data, error } = await query;
      if (!error) return res.json(data);
    }
    const series: any[] = [];
    res.json(series);
  });

  app.post("/api/fiscal-series", (req, res) => {
    const { description, user_id, type } = req.body;
    /* SQLite disabled */
      /* SQLite disabled */
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/fiscal-series/:id", (req, res) => {
    const { description, user_id, type, is_active } = req.body;
    /* SQLite disabled */
    res.json({ success: true });
  });

  // Cost Centers
  app.get("/api/cost-centers", (req, res) => {
    /* SQLite disabled */
    res.json(centers);
  });

  app.post("/api/cost-centers", (req, res) => {
    const { name, code } = req.body;
    /* SQLite disabled */
      /* SQLite disabled */
    res.json({ id: info.lastInsertRowid });
  });

  // --- METRICS ---
  app.get("/api/metrics", async (req, res) => {
    const { company_id } = req.query;
    var supabase = req.supabase || globalSupabase;
    if (supabaseEnabled) {
      let query = supabase.from("metrics").select("*");
      if (company_id) query = query.eq("company_id", company_id);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error) return res.json(data);
    }
    
    // Fallback SQLite
    try {
      const stmt = db?.prepare('SELECT * FROM metrics WHERE company_id = ? ORDER BY created_at DESC');
      const metrics = stmt ? stmt.all(company_id) : [];
      res.json(metrics);
    } catch(e) {
      res.status(500).json({ error: "Erro" });
    }
  });

  app.post("/api/metrics", async (req, res) => {
    const { sigla, descricao, observacoes, company_id } = req.body;
    var supabase = req.supabase || globalSupabase;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("metrics").insert([{ sigla, descricao, observacoes, company_id }]).select();
      if (!error) return res.status(201).json(data[0]);
    }

    try {
      const stmt = db?.prepare('INSERT INTO metrics (sigla, descricao, observacoes, company_id) VALUES (?, ?, ?, ?)');
      const info = stmt?.run(sigla, descricao, observacoes, company_id);
      res.status(201).json({ id: info?.lastInsertRowid, sigla, descricao, observacoes, company_id });
    } catch(e) {
      res.status(500).json({ error: "Erro" });
    }
  });

  app.put("/api/metrics/:id", async (req, res) => {
    const { sigla, descricao, observacoes } = req.body;
    const { id } = req.params;
    var supabase = req.supabase || globalSupabase;
    if (supabaseEnabled) {
      const { data, error } = await supabase.from("metrics").update({ sigla, descricao, observacoes }).eq("id", id).select();
      if (!error) return res.json({ success: true, data: data[0] });
    }

    try {
      const stmt = db?.prepare('UPDATE metrics SET sigla = ?, descricao = ?, observacoes = ? WHERE id = ?');
      stmt?.run(sigla, descricao, observacoes, id);
      res.json({ success: true });
    } catch(e) {
      res.status(500).json({ error: "Erro" });
    }
  });

  // POS Points
  app.get("/api/pos-points", (req, res) => {
    /* SQLite disabled */
    res.json(points);
  });

  app.post("/api/pos-points", (req, res) => {
    const { name, location } = req.body;
    /* SQLite disabled */
      /* SQLite disabled */
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/system-users", async (req, res) => {
    const { company_id } = req.query;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        let query = supabase.from("system_users").select("*");
        if (company_id) {
          query = query.eq("company_id", company_id);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
      }
      res.json([]);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/system-users", async (req, res) => {
    const { name, profession, date, permission_area, contact, morada, company_id } = req.body;
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { data, error } = await supabase.from("system_users").insert([{ 
          name, profession, date, permission_area, contact, morada, company_id 
        }]).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data[0]);
      }
      res.json({ id: Date.now() });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Dashboard Stats
  // Reports
  app.delete("/api/professions/:id", async (req, res) => {
    try {
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { error } = await supabase.from("profissoes").delete().eq("id", req.params.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        /* SQLite disabled */
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).send(String(error));
    }
  });

  app.get("/api/reports/profit-loss", async (req, res) => {
    const year = req.query.year || new Date().getFullYear();
    const { company_id } = req.query;
    try {
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const reportData = await Promise.all(months.map(async (month) => {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        // Income from Invoices
        let incomeQuery = "SELECT SUM(total) as total FROM invoices WHERE date >= ? AND date <= ? AND status != 'cancelled'";
        const incomeParams = [startDate, endDate];
        if (company_id) {
          incomeQuery += " AND company_id = ?";
          incomeParams.push(company_id as string);
        }
        /* SQLite disabled */
        const purchasesParams = [startDate, endDate];
        if (company_id) {
          purchasesQuery += " AND company_id = ?";
          purchasesParams.push(company_id as string);
        }
        /* SQLite disabled */
        const payrollParams = [year, String(month)];
        if (company_id) {
          payrollQuery += " AND company_id = ?";
          payrollParams.push(company_id as string);
        }
        /* SQLite disabled */
        const transParams = [startDate, endDate];
        if (company_id) {
          transQuery += " AND company_id = ?";
          transParams.push(company_id as string);
        }
        /* SQLite disabled */

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
      var supabase = req.supabase || globalSupabase;
      if (supabaseEnabled) {
        const { count: pendingCount, error: err2 } = await supabase.from("faturas").select("*", { count: 'exact', head: true }).neq("status", "anulado");
        const { count: clientCount, error: err3 } = await supabase.from("clientes").select("*", { count: 'exact', head: true });
        
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
        console.error("Supabase Query/Schema Error (/api/stats):", err2 || err3);
      }
      
      /* SQLite disabled */

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

-- SQL Script to initialize Supabase database for FaturaPronta
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  unit TEXT DEFAULT 'un',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  profession_id INTEGER REFERENCES professions(id),
  salary REAL NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  hired_at DATE,
  dismissed_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_contracts (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  contract_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS employee_absences (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS employee_attendance (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_sites (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_site_movements (
  id SERIAL PRIMARY KEY,
  work_site_id INTEGER NOT NULL REFERENCES work_sites(id),
  date DATE NOT NULL,
  doc_no TEXT,
  company TEXT,
  description TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  invoice_number TEXT UNIQUE NOT NULL,
  date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  total REAL DEFAULT 0,
  document_type TEXT,
  country_code TEXT,
  service_date DATE,
  service_location TEXT,
  hash TEXT,
  signature TEXT,
  vat_withholding REAL DEFAULT 0,
  exchange_rate REAL DEFAULT 1,
  currency TEXT DEFAULT 'Kwanza',
  counter_value REAL DEFAULT 0,
  global_discount REAL DEFAULT 0,
  work_site_id INTEGER REFERENCES work_sites(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  product_id INTEGER REFERENCES products(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_sales (
  id SERIAL PRIMARY KEY,
  total REAL NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  items_json TEXT NOT NULL,
  series_id INTEGER,
  cost_center_id INTEGER,
  pos_point_id INTEGER,
  session_id INTEGER,
  discount REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash'
);

CREATE TABLE IF NOT EXISTS fiscal_series (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  user_id INTEGER,
  type TEXT DEFAULT 'normal',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_centers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS pos_points (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id SERIAL PRIMARY KEY,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  initial_balance REAL NOT NULL,
  final_balance REAL,
  status TEXT DEFAULT 'open',
  pos_point_id INTEGER,
  total_sales REAL DEFAULT 0,
  total_discounts REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payroll (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  localidade TEXT,
  provincia TEXT,
  responsavel TEXT,
  contacto TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  nif TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  reference_id INTEGER
);

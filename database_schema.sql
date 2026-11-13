-- Empresas
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    nif TEXT UNIQUE NOT NULL,
    address TEXT
);

-- Séries de faturação (para garantir numeração sequencial)
CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL, -- Ex: FT
    year INTEGER NOT NULL,
    last_number INTEGER DEFAULT 0,
    UNIQUE(code, year)
);

-- Documentos (Faturas, Recibos, etc.)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    client_id UUID REFERENCES clients(id),
    document_type TEXT NOT NULL, -- FT, FR, NC, etc.
    series_code TEXT NOT NULL,
    number INTEGER NOT NULL,
    formatted_number TEXT UNIQUE NOT NULL, -- Ex: FT 2025/000001
    date_emissao TIMESTAMP NOT NULL,
    due_date DATE,
    work_site_id UUID,
    vat_withholding REAL DEFAULT 0,
    exchange_rate REAL DEFAULT 1,
    currency TEXT DEFAULT 'Kwanza',
    counter_value REAL DEFAULT 0,
    global_discount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    hash TEXT, -- Assinatura digital do documento
    is_locked BOOLEAN DEFAULT FALSE, -- Bloqueio absoluto
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cadeia de Hash (para conformidade fiscal)
CREATE TABLE hash_chain (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id),
    previous_hash TEXT,
    current_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

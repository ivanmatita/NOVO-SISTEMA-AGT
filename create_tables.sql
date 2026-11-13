-- 1. Tabela de Fornecedores
CREATE TABLE fornecedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  nif TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Compras
CREATE TABLE compras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  fornecedor_id UUID REFERENCES fornecedores(id),
  data_compra DATE NOT NULL,
  valor_total DECIMAL NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Caixas
CREATE TABLE caixas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  saldo_inicial DECIMAL DEFAULT 0,
  saldo_atual DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Movimentações de Caixa
CREATE TABLE caixa_movimentacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  caixa_id UUID REFERENCES caixas(id),
  tipo TEXT NOT NULL, -- 'entrada' ou 'saida'
  valor DECIMAL NOT NULL,
  descricao TEXT,
  data_movimento TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- CRIAR POLÍTICA DE ISOLAMENTO MULTIEMPRESA (ÚNICA PARA TODAS)
CREATE POLICY "company_isolation"
ON fornecedores FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

CREATE POLICY "company_isolation"
ON compras FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

CREATE POLICY "company_isolation"
ON caixas FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

CREATE POLICY "company_isolation"
ON caixa_movimentacoes FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

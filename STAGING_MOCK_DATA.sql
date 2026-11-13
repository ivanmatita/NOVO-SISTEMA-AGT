-- =====================================================================
-- IMATEC SOFT ERP — DADOS FICTÍCIOS DE TESTE E HOMOLOGAÇÃO (STAGING)
-- =====================================================================
-- Este arquivo gera dados fictícios para testar o isolamento multiempresa 
-- (Tenant A vs Tenant B), permissões, faturação e módulos em Staging.
-- =====================================================================

-- EMPRESAS FICTÍCIAS
INSERT INTO public.config_empresa (empresa_id, nome_empresa, nif, telefone, email, provincia, municipio, endereco, regime)
VALUES 
('a1111111-1111-1111-1111-111111111111', 'EMPRESA TESTE ALPHA (STAGING)', '5417000001', '+244 923 000 001', 'alpha@staging.test', 'Luanda', 'Viana', 'Zona Industrial de Viana, Lote A', 'Geral'),
('b2222222-2222-2222-2222-222222222222', 'EMPRESA TESTE BETA (STAGING)', '5417000002', '+244 923 000 002', 'beta@staging.test', 'Benguela', 'Lobito', 'Avenida da Independência, N.º 45', 'Simplificado')
ON CONFLICT (empresa_id) DO NOTHING;

-- PERFIS E USUÁRIOS DE TESTE (EMPRESA ALPHA)
INSERT INTO public.perfis (id, empresa_id, nome, email, cargo, nivel_acesso, modulos_acesso)
VALUES 
('u1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Administrador Alpha Staging', 'admin.alpha@staging.test', 'Director Geral', 'admin', '["all"]'),
('u1111111-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Vendedor Alpha POS', 'vendas.alpha@staging.test', 'Operador de Caixa', 'pos', '["pos", "vendas"]'),
('u1111111-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'Contabilista Alpha PGC', 'contabilidade.alpha@staging.test', 'Contabilista Certificado', 'contabilista', '["contabilidade", "relatorios"]')
ON CONFLICT (email) DO NOTHING;

-- PERFIS E USUÁRIOS DE TESTE (EMPRESA BETA)
INSERT INTO public.perfis (id, empresa_id, nome, email, cargo, nivel_acesso, modulos_acesso)
VALUES 
('u2222222-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'Gestor Beta Staging', 'admin.beta@staging.test', 'Gerente Comercial', 'admin', '["all"]')
ON CONFLICT (email) DO NOTHING;

-- CLIENTES FICTÍCIOS DE TESTE
INSERT INTO public.clientes (empresa_id, nome, nif, email, telefone, endereco, tipo_cliente)
VALUES 
('a1111111-1111-1111-1111-111111111111', 'Cliente Fictício Alpha Ltda', '5001234567', 'contato@clienteficticio.ao', '+244 912 345 678', 'Rua das Flores, N.º 12', 'Empresarial'),
('a1111111-1111-1111-1111-111111111111', 'Consumidor Final Staging', '999999999', 'cf@staging.test', '+244 900 000 000', 'Luanda', 'Consumidor Final'),
('b2222222-2222-2222-2222-222222222222', 'Cliente Fictício Beta SA', '5009876543', 'compras@cliente-beta.ao', '+244 923 888 777', 'Lobito, Benguela', 'Empresarial');

-- PRODUTOS FICTÍCIOS DE TESTE
INSERT INTO public.produtos (empresa_id, codigo, nome, preco_venda, preco_custo, taxa_imposto, stock_atual, tipo)
VALUES 
('a1111111-1111-1111-1111-111111111111', 'PROD-001', 'Licença de Software ERP Teste', 150000.00, 50000.00, 14.00, 100, 'P'),
('a1111111-1111-1111-1111-111111111111', 'SERV-001', 'Consultoria Técnica de Homologação', 75000.00, 0.00, 14.00, 0, 'S'),
('b2222222-2222-2222-2222-222222222222', 'PROD-BETA-01', 'Equipamento de Teste Beta', 250000.00, 120000.00, 14.00, 25, 'P');

-- SÉRIES FISCAIS DE HOMOLOGAÇÃO
INSERT INTO public.series_fiscais (empresa_id, tipo, ano, serie, descricao, proximo_numero)
VALUES 
('a1111111-1111-1111-1111-111111111111', 'FT', 2026, 'PRD', 'Série Fatura Alpha Staging', 1),
('a1111111-1111-1111-1111-111111111111', 'FR', 2026, 'PRD', 'Série Fatura Recibo Alpha Staging', 1),
('b2222222-2222-2222-2222-222222222222', 'FT', 2026, 'PRD', 'Série Fatura Beta Staging', 1)
ON CONFLICT (empresa_id, tipo, serie) DO NOTHING;

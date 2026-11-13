
-- Atualizar estrutura para garantir compatibilidade com o backend
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS valor_total NUMERIC(15, 2);
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS itens JSONB;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS detalhes JSONB;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS data_compra DATE;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS fornecedor_nome TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS tipo_documento TEXT;
ALTER TABLE public.compras ADD COLUMN IF NOT EXISTS numero_documento TEXT;
-- Renomear se necessário ou usar o valor_total na inserção
-- ALTER TABLE public.compras RENAME COLUMN total TO valor_total; 
-- O script anterior tinha valor_total, mas o código usa "total".
-- Vou corrigir a inserção no código em vez de alterar a tabela.

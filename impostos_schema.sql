-- Criação da tabela impostos conforme as especificações
CREATE TABLE IF NOT EXISTS public.impostos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    codigo_imposto TEXT,
    taxa NUMERIC NOT NULL DEFAULT 0,
    tipo_imposto TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexação para melhorar a performance das consultas multiempresa
CREATE INDEX IF NOT EXISTS idx_impostos_empresa_id ON public.impostos(empresa_id);

-- Activar RLS na tabela
ALTER TABLE public.impostos ENABLE ROW LEVEL SECURITY;

-- Excluir políticas existentes (caso existam)
DROP POLICY IF EXISTS "Usuários podem ver os seus impostos" ON public.impostos;
DROP POLICY IF EXISTS "Usuários podem criar impostos na sua empresa" ON public.impostos;
DROP POLICY IF EXISTS "Usuários podem atualizar impostos na sua empresa" ON public.impostos;
DROP POLICY IF EXISTS "Usuários podem apagar impostos na sua empresa" ON public.impostos;

-- Política: SELECT
-- Permite que usuários vejam apenas os impostos pertencentes à mesma empresa que eles
CREATE POLICY "Usuários podem ver os seus impostos" 
ON public.impostos FOR SELECT
USING (empresa_id IN (
    SELECT empresa_id FROM public.users WHERE id = auth.uid()
));

-- Política: INSERT
-- Permite inserção apenas para a própria empresa do usuário
CREATE POLICY "Usuários podem criar impostos na sua empresa" 
ON public.impostos FOR INSERT 
WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM public.users WHERE id = auth.uid()
));

-- Política: UPDATE
-- Permite atualização apenas dos impostos da própria empresa
CREATE POLICY "Usuários podem atualizar impostos na sua empresa" 
ON public.impostos FOR UPDATE 
USING (empresa_id IN (
    SELECT empresa_id FROM public.users WHERE id = auth.uid()
))
WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM public.users WHERE id = auth.uid()
));

-- Política: DELETE
-- Permite remoção apenas dos impostos da própria empresa
CREATE POLICY "Usuários podem apagar impostos na sua empresa" 
ON public.impostos FOR DELETE 
USING (empresa_id IN (
    SELECT empresa_id FROM public.users WHERE id = auth.uid()
));

-- Realtime: Habilitar o realtime para a tabela impostos
ALTER PUBLICATION supabase_realtime ADD TABLE public.impostos;

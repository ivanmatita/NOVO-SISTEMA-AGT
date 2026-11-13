-- 1. Limpar policies obsoletas que causam recursão
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_select_safe" ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_safe" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_safe" ON public.perfis;
DROP POLICY IF EXISTS "perfis_delete_safe" ON public.perfis;

-- 2. Ativar RLS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 3. Criar policies seguras (SEM RECURSÃO)
CREATE POLICY "perfis_select_safe" ON public.perfis FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "perfis_insert_safe" ON public.perfis FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "perfis_update_safe" ON public.perfis FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "perfis_delete_safe" ON public.perfis FOR DELETE USING (auth.uid() IS NOT NULL);

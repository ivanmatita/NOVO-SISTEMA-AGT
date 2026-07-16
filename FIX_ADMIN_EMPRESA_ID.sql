-- ============================================================
-- FIX: Corrigir empresa_id nulo para utilizadores administradores
-- Muitos admins foram criados com company_id mas sem empresa_id
-- Isto fazia com que não aparecessem na área de utilizadores
-- ============================================================

-- 1. Atualizar perfis: copiar company_id para empresa_id onde está nulo
UPDATE public.perfis
SET empresa_id = company_id
WHERE empresa_id IS NULL
  AND company_id IS NOT NULL;

-- 2. Atualizar perfis: copiar empresa_id para company_id onde company_id está nulo
UPDATE public.perfis
SET company_id = empresa_id
WHERE company_id IS NULL
  AND empresa_id IS NOT NULL;

-- 3. Garantir que admins/proprietários têm is_admin e level corretos em perfis
UPDATE public.perfis
SET is_admin = true, level = 10
WHERE role IN ('admin', 'admin_empresa', 'super_admin', 'proprietario')
  AND (is_admin IS NULL OR is_admin = false);

-- 4. Atualizar system_users: copiar company_id para empresa_id onde está nulo
UPDATE public.system_users
SET empresa_id = company_id
WHERE empresa_id IS NULL
  AND company_id IS NOT NULL;

-- 5. Atualizar system_users: copiar empresa_id para company_id onde company_id está nulo
UPDATE public.system_users
SET company_id = empresa_id
WHERE company_id IS NULL
  AND empresa_id IS NOT NULL;

-- 6. Garantir que admins têm is_admin e level corretos em system_users
UPDATE public.system_users
SET is_admin = true, level = 10
WHERE role IN ('admin', 'admin_empresa', 'super_admin', 'proprietario')
  AND (is_admin IS NULL OR is_admin = false);

-- Verificação: ver quantos registos ficaram sem empresa_id
SELECT 
  'perfis' as tabela,
  COUNT(*) as total,
  COUNT(empresa_id) as com_empresa_id,
  COUNT(company_id) as com_company_id,
  COUNT(*) - COUNT(empresa_id) as sem_empresa_id
FROM public.perfis
UNION ALL
SELECT 
  'system_users' as tabela,
  COUNT(*) as total,
  COUNT(empresa_id) as com_empresa_id,
  COUNT(company_id) as com_company_id,
  COUNT(*) - COUNT(empresa_id) as sem_empresa_id
FROM public.system_users;

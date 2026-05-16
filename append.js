import fs from 'fs';
fs.appendFileSync('PERFECT_RLS_SUPER_FIX.sql', `

-- 9. GARANTIR FOREIGN KEYS
ALTER TABLE public.perfis 
DROP CONSTRAINT IF EXISTS perfis_empresa_id_fkey;

ALTER TABLE public.perfis 
ADD CONSTRAINT perfis_empresa_id_fkey 
FOREIGN KEY (empresa_id) 
REFERENCES public.empresas(id) 
ON DELETE CASCADE;
`);

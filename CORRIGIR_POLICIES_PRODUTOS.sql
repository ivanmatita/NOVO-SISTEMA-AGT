-- Remover todas as políticas duplicadas ou existentes da tabela produtos
DROP POLICY IF EXISTS "Enable read access for users" ON produtos;
DROP POLICY IF EXISTS "Enable insert for users" ON produtos;
DROP POLICY IF EXISTS "Enable update for users" ON produtos;
DROP POLICY IF EXISTS "Enable delete for users" ON produtos;
DROP POLICY IF EXISTS "produtos_select_policy" ON produtos;
DROP POLICY IF EXISTS "produtos_insert_policy" ON produtos;
DROP POLICY IF EXISTS "produtos_update_policy" ON produtos;
DROP POLICY IF EXISTS "produtos_delete_policy" ON produtos;

-- Activar RLS na tabela
ALTER TABLE IF EXISTS produtos ENABLE ROW LEVEL SECURITY;

-- Criar as 4 políticas corretas e definitivas usando empresa_id
CREATE POLICY "produtos_select_policy"
ON produtos FOR SELECT
USING (empresa_id = (SELECT empresa_id FROM perfis WHERE perfis.id = auth.uid()));

CREATE POLICY "produtos_insert_policy"
ON produtos FOR INSERT
WITH CHECK (empresa_id = (SELECT empresa_id FROM perfis WHERE perfis.id = auth.uid()));

CREATE POLICY "produtos_update_policy"
ON produtos FOR UPDATE
USING (empresa_id = (SELECT empresa_id FROM perfis WHERE perfis.id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM perfis WHERE perfis.id = auth.uid()));

CREATE POLICY "produtos_delete_policy"
ON produtos FOR DELETE
USING (empresa_id = (SELECT empresa_id FROM perfis WHERE perfis.id = auth.uid()));

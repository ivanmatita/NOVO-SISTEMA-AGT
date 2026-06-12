-- CLEANUP DUPLICATE DOCUMENT TYPES
-- Keep only the first occurrence (or company specific if we filter later, but for now just unique codes)
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY codigo, empresa_id ORDER BY created_at DESC) as row_num
    FROM documentos_tipos
)
DELETE FROM documentos_tipos
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- Robust unique constraint (using COALESCE to handle NULL in uniqueness)
-- Standard UNIQUE (codigo, empresa_id) allows multiple (FT, NULL)
-- We want only one (FT, NULL)
ALTER TABLE documentos_tipos DROP CONSTRAINT IF EXISTS unique_code_per_tenant;
CREATE UNIQUE INDEX IF NOT EXISTS unique_global_code ON documentos_tipos (codigo) WHERE empresa_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_tenant_code ON documentos_tipos (codigo, empresa_id) WHERE empresa_id IS NOT NULL;

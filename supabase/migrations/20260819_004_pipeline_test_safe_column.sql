-- Migration: 20260819_004_pipeline_test_safe_column.sql
-- Teste controlado e nao destrutivo do pipeline de migrations

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '_schema_migrations'
      AND column_name = 'pipeline_validated_at'
  ) THEN
    ALTER TABLE public._schema_migrations
      ADD COLUMN pipeline_validated_at timestamptz DEFAULT NULL;
    RAISE NOTICE 'Coluna pipeline_validated_at adicionada com sucesso.';
  ELSE
    RAISE NOTICE 'Coluna pipeline_validated_at ja existe. Ignorando.';
  END IF;
END$$;
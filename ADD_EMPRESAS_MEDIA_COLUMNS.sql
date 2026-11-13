-- GARANTIR COLUNAS DE IDENTIDADE VISUAL NA TABELA DE EMPRESAS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas' AND column_name='watermark_url') THEN
        ALTER TABLE public.empresas ADD COLUMN watermark_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas' AND column_name='watermark_size') THEN
        ALTER TABLE public.empresas ADD COLUMN watermark_size NUMERIC DEFAULT 100;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas' AND column_name='footer_image_url') THEN
        ALTER TABLE public.empresas ADD COLUMN footer_image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas' AND column_name='footer_size') THEN
        ALTER TABLE public.empresas ADD COLUMN footer_size NUMERIC DEFAULT 100;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas' AND column_name='logo_size') THEN
        ALTER TABLE public.empresas ADD COLUMN logo_size NUMERIC DEFAULT 100;
    END IF;
END $$;
NOTIFY pgrst, 'reload schema';

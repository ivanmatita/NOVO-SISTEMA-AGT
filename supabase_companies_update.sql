-- Safe alteration to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS nome_empresa TEXT,
ADD COLUMN IF NOT EXISTS matricula TEXT,
ADD COLUMN IF NOT EXISTS alvara TEXT,
ADD COLUMN IF NOT EXISTS localizacao TEXT,
ADD COLUMN IF NOT EXISTS provincia TEXT,
ADD COLUMN IF NOT EXISTS codigo_postal TEXT,
ADD COLUMN IF NOT EXISTS inss TEXT,
ADD COLUMN IF NOT EXISTS contacto TEXT,
ADD COLUMN IF NOT EXISTS responsavel TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS regime TEXT,
ADD COLUMN IF NOT EXISTS tipo_empresa TEXT,
ADD COLUMN IF NOT EXISTS coordenadas_bancarias TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS watermark_url TEXT,
ADD COLUMN IF NOT EXISTS footer_image_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Ensure nome_empresa has a value based on name, for backward compatibility
UPDATE public.companies SET nome_empresa = name WHERE nome_empresa IS NULL;

NOTIFY pgrst, 'reload schema';

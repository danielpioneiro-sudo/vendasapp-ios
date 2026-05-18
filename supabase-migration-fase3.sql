-- ============================================================
-- VendasApp iOS — Migration Fase 3 (Personalização da Empresa)
-- Execute no Supabase SQL Editor APÓS a migration principal
-- ============================================================

-- 1. Adicionar campos extras em companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_empresa TEXT;

-- 2. Criar bucket de logos (via Storage API do Supabase)
-- Execute no painel Storage > New Bucket:
--   Nome: company-logos
--   Public: true
-- Ou via SQL (requer extensão storage habilitada):
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Policy: qualquer autenticado pode fazer upload no próprio diretório
CREATE POLICY "company admins can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "logos are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "admins can update own logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-logos'
    AND auth.uid() IS NOT NULL
  );

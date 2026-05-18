-- ============================================================
-- VendasApp iOS — Migration COMPLETA (execute tudo de uma vez)
-- Supabase SQL Editor: https://supabase.com/dashboard/project/ddgnxpzohzukjprqgzgr/sql
-- ============================================================

-- ============================================================
-- TABELAS BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  logo_url             TEXT,
  theme                TEXT NOT NULL DEFAULT 'blue'
                         CHECK (theme IN ('blue','green','gray','wine','indigo')),
  contract_template    TEXT DEFAULT '',
  owner_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_status  TEXT NOT NULL DEFAULT 'trial'
                         CHECK (subscription_status IN ('trial','active','expired')),
  trial_ends_at        TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  endereco             TEXT,
  telefone             TEXT,
  email_empresa        TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'vendedor'
                CHECK (role IN ('admin','vendedor')),
  name        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

CREATE TABLE IF NOT EXISTS invite_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code        TEXT UNIQUE NOT NULL,
  used_by     UUID REFERENCES auth.users(id),
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  telefone    TEXT,
  email       TEXT,
  cidade      TEXT,
  observacoes TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materiais (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  unidade     TEXT NOT NULL DEFAULT 'un',
  preco_unit  NUMERIC(12,2),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID REFERENCES companies(id) ON DELETE CASCADE,
  cliente_id            UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome          TEXT NOT NULL,
  endereco_entrega      TEXT,
  telefone_contato      TEXT,
  nome_contato          TEXT,
  itens_json            TEXT NOT NULL DEFAULT '[]',
  valor_total           NUMERIC(12,2),
  observacoes           TEXT,
  assinatura_vendedor   TEXT,
  assinatura_cliente    TEXT,
  assinatura_recebimento TEXT,
  foto_url              TEXT,
  logs_json             TEXT NOT NULL DEFAULT '[]',
  status                TEXT NOT NULL DEFAULT 'arte_pendente'
                          CHECK (status IN ('arte_pendente','pago_parcial','pago_total','entregue')),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_company_members_user    ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_clientes_company        ON clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_materiais_company       ON materiais(company_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_company         ON pedidos(company_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code       ON invite_codes(code);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM company_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM company_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos         ENABLE ROW LEVEL SECURITY;

-- companies
DROP POLICY IF EXISTS "member can view own company"     ON companies;
DROP POLICY IF EXISTS "admin can update company"        ON companies;
DROP POLICY IF EXISTS "authenticated can insert company" ON companies;

CREATE POLICY "member can view own company" ON companies
  FOR SELECT USING (id = get_my_company_id());

CREATE POLICY "admin can update company" ON companies
  FOR UPDATE USING (id = get_my_company_id() AND get_my_role() = 'admin');

CREATE POLICY "authenticated can insert company" ON companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- company_members
DROP POLICY IF EXISTS "member can view team"          ON company_members;
DROP POLICY IF EXISTS "can insert own member record"  ON company_members;
DROP POLICY IF EXISTS "admin can insert members"      ON company_members;

CREATE POLICY "member can view team" ON company_members
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "can insert own member record" ON company_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin can insert members" ON company_members
  FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');

-- invite_codes
DROP POLICY IF EXISTS "admin can manage invites"            ON invite_codes;
DROP POLICY IF EXISTS "authenticated can read invite by code" ON invite_codes;

CREATE POLICY "admin can manage invites" ON invite_codes
  FOR ALL USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

CREATE POLICY "authenticated can read invite by code" ON invite_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- clientes / materiais / pedidos
DROP POLICY IF EXISTS "company members only" ON clientes;
DROP POLICY IF EXISTS "company members only" ON materiais;
DROP POLICY IF EXISTS "company members only" ON pedidos;

CREATE POLICY "company members only" ON clientes
  FOR ALL USING (company_id = get_my_company_id());

CREATE POLICY "company members only" ON materiais
  FOR ALL USING (company_id = get_my_company_id());

CREATE POLICY "company members only" ON pedidos
  FOR ALL USING (company_id = get_my_company_id());

-- ============================================================
-- STORAGE: bucket de logos
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "company admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "logos are publicly readable"     ON storage.objects;
DROP POLICY IF EXISTS "admins can update own logos"     ON storage.objects;

CREATE POLICY "company admins can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "logos are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "admins can update own logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-logos' AND auth.uid() IS NOT NULL
  );

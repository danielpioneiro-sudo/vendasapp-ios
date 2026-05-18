-- ============================================================
-- VendasApp iOS — Migration multi-tenant
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  theme TEXT NOT NULL DEFAULT 'blue' CHECK (theme IN ('blue','green','gray','wine','indigo')),
  contract_template TEXT DEFAULT '',
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial','active','expired')),
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Membros da empresa (admin ou vendedor)
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin','vendedor')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- 3. Códigos de convite
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Adicionar company_id nas tabelas existentes (nullable para dados legados do app atual)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE pedidos  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_clientes_company ON clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_materiais_company ON materiais(company_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_company ON pedidos(company_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);

-- ============================================================
-- 6. Row Level Security (RLS)
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Helper: retorna o company_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM company_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Helper: retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM company_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- companies: só membros da empresa podem ver; admin pode atualizar
CREATE POLICY "member can view own company" ON companies
  FOR SELECT USING (id = get_my_company_id());

CREATE POLICY "admin can update company" ON companies
  FOR UPDATE USING (id = get_my_company_id() AND get_my_role() = 'admin');

CREATE POLICY "authenticated can insert company" ON companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- company_members: membros veem os da mesma empresa; admin pode gerenciar
CREATE POLICY "member can view team" ON company_members
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "admin can insert members" ON company_members
  FOR INSERT WITH CHECK (company_id = get_my_company_id() AND get_my_role() = 'admin');

CREATE POLICY "can insert own member record" ON company_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- invite_codes: admin cria; qualquer autenticado pode ler pelo código (para validação)
CREATE POLICY "admin can manage invites" ON invite_codes
  FOR ALL USING (company_id = get_my_company_id() AND get_my_role() = 'admin');

CREATE POLICY "authenticated can read invite by code" ON invite_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- clientes, materiais, pedidos: apenas membros da mesma empresa
DROP POLICY IF EXISTS "company members only" ON clientes;
CREATE POLICY "company members only" ON clientes
  FOR ALL USING (company_id = get_my_company_id() OR company_id IS NULL);

DROP POLICY IF EXISTS "company members only" ON materiais;
CREATE POLICY "company members only" ON materiais
  FOR ALL USING (company_id = get_my_company_id() OR company_id IS NULL);

DROP POLICY IF EXISTS "company members only" ON pedidos;
CREATE POLICY "company members only" ON pedidos
  FOR ALL USING (company_id = get_my_company_id() OR company_id IS NULL);

-- Habilitar RLS nas tabelas existentes (se ainda não estiver)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

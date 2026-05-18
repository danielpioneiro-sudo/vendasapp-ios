-- ============================================================
-- VendasApp iOS — Fix Schema v3
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── clientes: colunas possivelmente faltando ─────────────────
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rua             TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro          TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cpf             TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_nascimento TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_documento  TEXT DEFAULT 'cpf';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacoes     TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade          TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone        TEXT;

-- company_id só adiciona se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE clientes ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── materiais: colunas possivelmente faltando ─────────────────
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS unidade   TEXT NOT NULL DEFAULT 'un';
ALTER TABLE materiais ADD COLUMN IF NOT EXISTS preco     NUMERIC(12,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'materiais' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE materiais ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── pedidos: recriar (foi dropada pelo script anterior) ───────
CREATE TABLE IF NOT EXISTS pedidos (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID        REFERENCES companies(id) ON DELETE CASCADE,
  cliente_id             BIGINT      REFERENCES clientes(id)  ON DELETE SET NULL,
  cliente_nome           TEXT        NOT NULL DEFAULT '',
  endereco_entrega       TEXT,
  telefone_contato       TEXT,
  nome_contato           TEXT,
  forma_condicao         TEXT,
  forma_metodo           TEXT,
  forma_pagamento        TEXT,
  valor_total            NUMERIC(12,2),
  data_entrega           TEXT,
  horario_entrega        TEXT,
  produtos               JSONB,
  observacoes            TEXT,
  layout_obs             TEXT,
  assinatura_vendedor    TEXT,
  assinatura_cliente     TEXT,
  assinatura_recebimento TEXT,
  data_recebimento       TEXT,
  logs_json              TEXT        NOT NULL DEFAULT '[]',
  status                 TEXT        NOT NULL DEFAULT 'arte_pendente'
                           CHECK (status IN ('arte_pendente','pago_parcial','pago_total','entregue')),
  criado_em              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_company  ON pedidos(company_id);
CREATE INDEX IF NOT EXISTS idx_clientes_company ON clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_materiais_company ON materiais(company_id);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE pedidos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company members only" ON pedidos;
CREATE POLICY "company members only" ON pedidos
  FOR ALL USING (company_id = get_my_company_id());

DROP POLICY IF EXISTS "company members only" ON clientes;
CREATE POLICY "company members only" ON clientes
  FOR ALL USING (company_id = get_my_company_id());

DROP POLICY IF EXISTS "company members only" ON materiais;
CREATE POLICY "company members only" ON materiais
  FOR ALL USING (company_id = get_my_company_id());

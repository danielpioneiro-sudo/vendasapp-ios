#!/bin/bash
# Uso: SUPABASE_ACCESS_TOKEN=seu_token ./deploy-fn.sh
# Gere um token em: app.supabase.com -> Account -> Access Tokens

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Erro: defina a variavel SUPABASE_ACCESS_TOKEN antes de rodar este script."
  echo "Exemplo: SUPABASE_ACCESS_TOKEN=sbp_... ./deploy-fn.sh"
  exit 1
fi

REF=ddgnxpzohzukjprqgzgr

SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase functions deploy create-admin --project-ref $REF --no-verify-jwt
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase functions deploy create-vendedor --project-ref $REF --no-verify-jwt

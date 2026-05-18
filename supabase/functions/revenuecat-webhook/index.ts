// Supabase Edge Function: RevenueCat → subscription_status sync
// Deploy: supabase functions deploy revenuecat-webhook
// Set secrets: supabase secrets set REVENUECAT_WEBHOOK_AUTH=<bearer token from RevenueCat dashboard>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const STATUS_MAP: Record<string, string> = {
  INITIAL_PURCHASE: 'active',
  RENEWAL: 'active',
  PRODUCT_CHANGE: 'active',
  UNCANCELLATION: 'active',
  CANCELLATION: 'expired',
  EXPIRATION: 'expired',
  BILLING_ISSUE: 'expired',
};

Deno.serve(async (req) => {
  // Verify RevenueCat authorization header
  const authHeader = req.headers.get('Authorization');
  if (!WEBHOOK_AUTH || authHeader !== WEBHOOK_AUTH) {
    return new Response('Unauthorized', { status: 401 });
  }

  let event: any;
  try {
    event = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const companyId: string | undefined = event?.event?.app_user_id;
  const eventType: string | undefined = event?.event?.type;

  if (!companyId || !eventType) {
    return new Response('Missing fields', { status: 400 });
  }

  const newStatus = STATUS_MAP[eventType];
  if (!newStatus) {
    // Unknown event — ignore silently
    return new Response('OK', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from('companies')
    .update({ subscription_status: newStatus })
    .eq('id', companyId);

  if (error) {
    console.error('Supabase update error', error);
    return new Response('DB error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
});

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  companies: {
    id: string;
    name: string;
    logo_url: string | null;
    theme: 'blue' | 'green' | 'gray' | 'wine' | 'indigo';
    contract_template: string;
    owner_id: string | null;
    subscription_status: 'trial' | 'active' | 'expired';
    trial_ends_at: string;
    endereco: string | null;
    telefone: string | null;
    email_empresa: string | null;
    cnpj: string | null;
    created_at: string;
  };
  company_members: {
    id: string;
    company_id: string;
    user_id: string;
    role: 'admin' | 'vendedor';
    name: string | null;
    created_at: string;
  };
  invite_codes: {
    id: string;
    company_id: string;
    code: string;
    used_by: string | null;
    used_at: string | null;
    expires_at: string;
    created_by: string | null;
    created_at: string;
  };
};

export type Company = Database['companies'];
export type CompanyMember = Database['company_members'];

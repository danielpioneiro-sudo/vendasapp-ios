import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Company, CompanyMember } from './supabase';
import { THEMES, ThemeKey } from '@/constants/themes';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  company: Company | null;
  member: CompanyMember | null;
  theme: typeof THEMES[ThemeKey];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, companyName: string) => Promise<{ error: string | null }>;
  joinWithCode: (email: string, password: string, name: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [member, setMember] = useState<CompanyMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadCompanyData(session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadCompanyData(session.user.id);
      else {
        setCompany(null);
        setMember(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadCompanyData(userId: string) {
    try {
      const { data: memberData } = await supabase
        .from('company_members')
        .select('*, companies(*)')
        .eq('user_id', userId)
        .single();

      if (memberData) {
        setMember(memberData as CompanyMember);
        setCompany((memberData as any).companies as Company);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshCompany() {
    if (user) await loadCompanyData(user.id);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, name: string, companyName: string) {
    try {
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ email: email.toLowerCase(), password, name, companyName }),
        }
      );
      const text = await res.text();
      let json: any = {};
      try { json = JSON.parse(text); } catch (_) {}
      if (!res.ok || json.error) return { error: json.error ?? `HTTP ${res.status}: ${text}` };

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });
      if (signInError) return { error: signInError.message };

      return { error: null };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async function joinWithCode(email: string, password: string, name: string, code: string) {
    try {
      // Edge Function creates user with email_confirm: true — no SMTP required
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-vendedor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ email: email.toLowerCase(), password, name, code }),
        }
      );
      const json = await res.json();
      if (!res.ok || json.error) return { error: json.error ?? 'Erro ao criar conta' };

      // Sign in with the newly created (confirmed) account
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });
      if (signInError) return { error: signInError.message };

      return { error: null };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setCompany(null);
    setMember(null);
  }

  async function deleteAccount() {
    if (!user) return { error: 'Não autenticado' };
    try {
      // Call RPC to remove user data (requires delete_my_account() function in Supabase)
      const { error: rpcError } = await supabase.rpc('delete_my_account');
      if (rpcError) {
        // Fallback: remove from company_members manually and sign out
        await supabase.from('company_members').delete().eq('user_id', user.id);
      }
      await supabase.auth.signOut();
      setCompany(null);
      setMember(null);
      return { error: null };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  const themeKey = (company?.theme ?? 'blue') as ThemeKey;
  const theme = THEMES[themeKey];

  return (
    <AuthContext.Provider value={{ session, user, company, member, theme, loading, signIn, signUp, joinWithCode, signOut, refreshCompany, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type Cliente = {
  id: string;
  nome: string;
  rua: string | null;
  bairro: string | null;
  cidade: string | null;
  telefone: string | null;
  email: string | null;
  tipo_documento: 'cpf' | 'cnpj';
  cpf: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  company_id: string | null;
};

export function useClientes() {
  const { company } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClientes = useCallback(async (q?: string) => {
    if (!company) return;
    setLoading(true);
    let query = supabase
      .from('clientes')
      .select('*')
      .eq('company_id', company.id)
      .order('nome');
    if (q) query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`);
    const { data } = await query;
    setClientes((data as Cliente[]) ?? []);
    setLoading(false);
  }, [company]);

  const createCliente = async (fields: Partial<Cliente>) => {
    if (!company) return { error: 'Sem empresa [company null]' };
    const { data, error } = await supabase
      .from('clientes')
      .insert({ ...fields, company_id: company.id })
      .select()
      .single();
    console.log('[createCliente] data:', JSON.stringify(data), 'error:', JSON.stringify(error));
    if (error) return { error: `${error.code}: ${error.message} — ${error.details ?? ''}` };
    return { error: null };
  };

  const updateCliente = async (id: string, fields: Partial<Cliente>) => {
    const { error } = await supabase.from('clientes').update(fields).eq('id', id);
    return { error: error?.message ?? null };
  };

  const getCliente = async (id: string): Promise<Cliente | null> => {
    const { data } = await supabase.from('clientes').select('*').eq('id', id).single();
    return data as Cliente | null;
  };

  return { clientes, loading, fetchClientes, createCliente, updateCliente, getCliente };
}

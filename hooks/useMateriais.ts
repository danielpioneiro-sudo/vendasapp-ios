import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type Material = {
  id: string;
  nome: string;
  descricao: string | null;
  unidade: string;
  preco: number | null;
  company_id: string | null;
};

export function useMateriais() {
  const { company } = useAuth();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMateriais = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    const { data } = await supabase
      .from('materiais')
      .select('*')
      .eq('company_id', company.id)
      .order('nome');
    setMateriais((data as Material[]) ?? []);
    setLoading(false);
  }, [company]);

  const createMaterial = async (fields: { nome: string; descricao?: string; unidade: string; preco?: number | null }) => {
    if (!company) return { error: 'Sem empresa' };
    const { error } = await supabase.from('materiais').insert({ ...fields, company_id: company.id });
    return { error: error?.message ?? null };
  };

  const deleteMaterial = async (id: string) => {
    const { error } = await supabase.from('materiais').delete().eq('id', id);
    return { error: error?.message ?? null };
  };

  return { materiais, loading, fetchMateriais, createMaterial, deleteMaterial };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type ProdutoPedido = {
  material_id?: string;
  nome: string;
  quantidade: number;
  unidade: string;
  preco_unit: number;
  subtotal: number;
};

export type LogEntry = {
  tipo: 'ocorrencia' | 'pagamento';
  texto: string;
  valor?: number;
  obs?: string;
  assinatura?: string;
  data: string;
};

export type StatusPedido = 'arte_pendente' | 'pago_parcial' | 'pago_total' | 'entregue';

export type Pedido = {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  endereco_entrega: string | null;
  telefone_contato: string | null;
  nome_contato: string | null;
  forma_condicao: string | null;
  forma_metodo: string | null;
  forma_pagamento: string | null;
  valor_total: number | null;
  data_entrega: string | null;
  horario_entrega: string | null;
  produtos: ProdutoPedido[] | null;
  observacoes: string | null;
  layout_obs: string | null;
  assinatura_vendedor: string | null;
  assinatura_cliente: string | null;
  assinatura_recebimento: string | null;
  data_recebimento: string | null;
  logs_json: string;
  status: StatusPedido;
  company_id: string | null;
  criado_em: string;
};

export function usePedidos() {
  const { company } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPedidos = useCallback(async (status?: StatusPedido) => {
    if (!company) return;
    setLoading(true);
    let query = supabase
      .from('pedidos')
      .select('*')
      .eq('company_id', company.id)
      .order('criado_em', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data } = await query;
    setPedidos((data as Pedido[]) ?? []);
    setLoading(false);
  }, [company]);

  const getPedido = async (id: string): Promise<Pedido | null> => {
    const { data } = await supabase.from('pedidos').select('*').eq('id', id).single();
    return data as Pedido | null;
  };

  const createPedido = async (fields: Partial<Pedido>) => {
    if (!company) return { data: null, error: 'Sem empresa' };
    const { data, error } = await supabase
      .from('pedidos')
      .insert({ ...fields, company_id: company.id, logs_json: '[]', status: 'arte_pendente' })
      .select('id')
      .single();
    return { data, error: error?.message ?? null };
  };

  const addLog = async (pedidoId: string, entry: LogEntry, novoStatus?: StatusPedido) => {
    const { data: pedido } = await supabase.from('pedidos').select('logs_json').eq('id', pedidoId).single();
    let logs: LogEntry[] = [];
    try { logs = JSON.parse((pedido as any)?.logs_json || '[]'); } catch (_) {}
    logs.push(entry);
    const update: Record<string, unknown> = { logs_json: JSON.stringify(logs) };
    if (novoStatus) update.status = novoStatus;
    const { error } = await supabase.from('pedidos').update(update).eq('id', pedidoId);
    return { error: error?.message ?? null };
  };

  const confirmarEntrega = async (pedidoId: string, assinatura: string) => {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const { error } = await supabase.from('pedidos').update({
      assinatura_recebimento: assinatura,
      data_recebimento: now,
      status: 'entregue',
    }).eq('id', pedidoId);
    return { error: error?.message ?? null };
  };

  const registrarPagamento = async (pedidoId: string, valor: number, obs: string, assinatura: string, valorTotal: number) => {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const { data: pedido } = await supabase.from('pedidos').select('logs_json').eq('id', pedidoId).single();
    let logs: LogEntry[] = [];
    try { logs = JSON.parse((pedido as any)?.logs_json || '[]'); } catch (_) {}

    const entry: LogEntry = {
      tipo: 'pagamento',
      texto: `Pagamento recebido: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}${obs ? ' — ' + obs : ''}`,
      valor,
      obs,
      assinatura,
      data: now,
    };
    logs.push(entry);

    const totalPago = logs.filter(l => l.tipo === 'pagamento').reduce((s, l) => s + (l.valor || 0), 0);
    const novoStatus: StatusPedido = totalPago >= valorTotal ? 'pago_total' : 'pago_parcial';

    const { error } = await supabase.from('pedidos').update({
      logs_json: JSON.stringify(logs),
      status: novoStatus,
    }).eq('id', pedidoId);

    return { error: error?.message ?? null, novoStatus };
  };

  const deletePedido = async (id: string) => {
    const { error } = await supabase.from('pedidos').delete().eq('id', id);
    return { error: error?.message ?? null };
  };

  return { pedidos, loading, fetchPedidos, getPedido, createPedido, addLog, confirmarEntrega, registrarPagamento, deletePedido };
}

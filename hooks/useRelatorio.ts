import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Pedido, LogEntry } from './usePedidos';

export type PeriodoFiltro = 'semana' | 'mes' | 'trimestre';

export type KPIs = {
  totalPedidos: number;
  valorFaturado: number;
  valorRecebido: number;
  entregues: number;
  pendentes: number;
  pagos: number;
};

export type DadoGrafico = {
  label: string;
  value: number;
};

function parseDateSafe(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  // ISO format (Supabase default)
  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) return iso;
  // Brazilian locale fallback: "15/05/2026, 14:30:00"
  const parts = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (parts) return new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
  return null;
}

function getRange(periodo: PeriodoFiltro): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (periodo === 'semana') from.setDate(from.getDate() - 7);
  else if (periodo === 'mes') from.setDate(from.getDate() - 30);
  else from.setDate(from.getDate() - 90);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function buildChartData(pedidos: Pedido[], periodo: PeriodoFiltro): DadoGrafico[] {
  const { from } = getRange(periodo);
  const map: Record<string, number> = {};

  if (periodo === 'semana') {
    // 7 buckets: one per day
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      map[key] = 0;
    }
    pedidos.forEach(p => {
      const d = parseDateSafe(p.criado_em);
      if (!d) return;
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (key in map) map[key] += p.valor_total ?? 0;
    });
  } else if (periodo === 'mes') {
    // 4 buckets: weeks
    const labels = ['Sem 4', 'Sem 3', 'Sem 2', 'Sem 1'];
    labels.forEach(l => { map[l] = 0; });
    pedidos.forEach(p => {
      const d = parseDateSafe(p.criado_em);
      if (!d) return;
      const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
      let label = '';
      if (daysAgo <= 7) label = 'Sem 1';
      else if (daysAgo <= 14) label = 'Sem 2';
      else if (daysAgo <= 21) label = 'Sem 3';
      else label = 'Sem 4';
      map[label] += p.valor_total ?? 0;
    });
  } else {
    // 3 buckets: months
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('pt-BR', { month: 'short' });
      map[key] = 0;
    }
    pedidos.forEach(p => {
      const d = parseDateSafe(p.criado_em);
      if (!d) return;
      const key = d.toLocaleDateString('pt-BR', { month: 'short' });
      if (key in map) map[key] += p.valor_total ?? 0;
    });
  }

  return Object.entries(map).map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
}

function calcKPIs(pedidos: Pedido[]): KPIs {
  let valorRecebido = 0;
  pedidos.forEach(p => {
    try {
      const logs: LogEntry[] = JSON.parse(p.logs_json || '[]');
      valorRecebido += logs
        .filter(l => l.tipo === 'pagamento')
        .reduce((s, l) => s + (l.valor ?? 0), 0);
    } catch (_) {}
  });

  return {
    totalPedidos: pedidos.length,
    valorFaturado: pedidos.reduce((s, p) => s + (p.valor_total ?? 0), 0),
    valorRecebido,
    entregues: pedidos.filter(p => p.status === 'entregue').length,
    pendentes: pedidos.filter(p => p.status === 'arte_pendente').length,
    pagos: pedidos.filter(p => p.status === 'pago_total' || p.status === 'pago_parcial').length,
  };
}

export function useRelatorio() {
  const { company } = useAuth();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRelatorio = useCallback(async (p: PeriodoFiltro) => {
    if (!company) return;
    setLoading(true);
    const { from } = getRange(p);
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('company_id', company.id)
      .gte('criado_em', from.toISOString())
      .order('criado_em', { ascending: false });
    setPedidos((data as Pedido[]) ?? []);
    setLoading(false);
  }, [company]);

  const kpis = calcKPIs(pedidos);
  const chartData = buildChartData(pedidos, periodo);
  const recentes = pedidos.slice(0, 5);

  function changePeriodo(p: PeriodoFiltro) {
    setPeriodo(p);
    fetchRelatorio(p);
  }

  return { periodo, changePeriodo, kpis, chartData, recentes, loading, fetchRelatorio };
}

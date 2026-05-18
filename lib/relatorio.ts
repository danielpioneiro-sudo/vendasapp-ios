import { Company } from './supabase';
import { Pedido, LogEntry } from '@/hooks/usePedidos';
import { KPIs, PeriodoFiltro } from '@/hooks/useRelatorio';

const PERIODO_LABEL: Record<PeriodoFiltro, string> = {
  semana: 'Últimos 7 dias',
  mes: 'Últimos 30 dias',
  trimestre: 'Últimos 90 dias',
};

function totalPago(p: Pedido): number {
  try {
    const logs: LogEntry[] = JSON.parse(p.logs_json || '[]');
    return logs.filter(l => l.tipo === 'pagamento').reduce((s, l) => s + (l.valor ?? 0), 0);
  } catch (_) { return 0; }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    arte_pendente: 'Pendente',
    pago_parcial: 'Pago Parcial',
    pago_total: 'Pago Total',
    entregue: 'Entregue',
  };
  return map[s] ?? s;
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function buildRelatorioHtml(
  company: Company,
  kpis: KPIs,
  pedidos: Pedido[],
  periodo: PeriodoFiltro
): string {
  const logoHtml = company.logo_url
    ? `<img src="${company.logo_url}" style="max-height:64px;max-width:160px;object-fit:contain;" />`
    : '';

  const pedidosRows = pedidos.map(p => `
    <tr>
      <td>#${p.id.slice(-6).toUpperCase()}</td>
      <td>${p.cliente_nome}</td>
      <td>${p.data_entrega ?? '—'}</td>
      <td>${statusLabel(p.status)}</td>
      <td style="text-align:right">${brl(p.valor_total ?? 0)}</td>
      <td style="text-align:right">${brl(totalPago(p))}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:-apple-system,Arial,sans-serif; font-size:12px; color:#111; padding:32px; }
    .header { display:flex; align-items:center; gap:16px; border-bottom:2px solid #e5e7eb; padding-bottom:16px; margin-bottom:24px; }
    .header-text h1 { font-size:18px; font-weight:700; }
    .header-text p { color:#6b7280; font-size:12px; margin-top:2px; }
    .kpis { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
    .kpi { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
    .kpi-label { font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; }
    .kpi-value { font-size:18px; font-weight:700; color:#111; margin-top:4px; }
    h2 { font-size:13px; font-weight:700; color:#374151; margin-bottom:10px; text-transform:uppercase; letter-spacing:.5px; }
    table { width:100%; border-collapse:collapse; }
    th { background:#f3f4f6; padding:8px; text-align:left; font-size:10px; text-transform:uppercase; color:#6b7280; }
    td { padding:8px; border-bottom:1px solid #f3f4f6; font-size:11px; }
    tr:last-child td { border-bottom:none; }
    .total-row td { font-weight:700; background:#f9fafb; }
    .footer { text-align:center; margin-top:32px; font-size:10px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:12px; }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="header-text">
      <h1>${company.name}</h1>
      <p>Relatório de vendas — ${PERIODO_LABEL[periodo]}</p>
      <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
    </div>
  </div>

  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Total de pedidos</div>
      <div class="kpi-value">${kpis.totalPedidos}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Valor faturado</div>
      <div class="kpi-value">${brl(kpis.valorFaturado)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Valor recebido</div>
      <div class="kpi-value">${brl(kpis.valorRecebido)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Entregues</div>
      <div class="kpi-value">${kpis.entregues}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Pendentes</div>
      <div class="kpi-value">${kpis.pendentes}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Pagos / parcial</div>
      <div class="kpi-value">${kpis.pagos}</div>
    </div>
  </div>

  <h2>Pedidos do período</h2>
  <table>
    <thead>
      <tr>
        <th>Nº</th><th>Cliente</th><th>Entrega</th><th>Status</th>
        <th style="text-align:right">Valor</th><th style="text-align:right">Recebido</th>
      </tr>
    </thead>
    <tbody>
      ${pedidosRows}
      <tr class="total-row">
        <td colspan="4">TOTAL</td>
        <td style="text-align:right">${brl(kpis.valorFaturado)}</td>
        <td style="text-align:right">${brl(kpis.valorRecebido)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">${company.name} · Relatório gerado pelo VendasApp</div>
</body>
</html>`;
}

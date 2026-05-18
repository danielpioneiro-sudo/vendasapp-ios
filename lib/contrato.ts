import { Company, CompanyMember } from './supabase';
import { Pedido, LogEntry } from '@/hooks/usePedidos';

export type ContratoVariaveis = {
  nome_cliente: string;
  valor_total: string;
  data: string;
  data_entrega: string;
  vendedor: string;
  empresa: string;
  cnpj_empresa: string;
  endereco_empresa: string;
  telefone_empresa: string;
  email_empresa: string;
  endereco_entrega: string;
  forma_pagamento: string;
  condicoes_pagamento: string;
  produtos: string;
  numero_pedido: string;
  layout_obs: string;
  observacoes: string;
};

export function resolveVariaveis(
  template: string,
  vars: Partial<ContratoVariaveis>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  }
  return result;
}

export function buildVariaveis(
  company: Company,
  member: CompanyMember | null,
  pedido?: Partial<Pedido>
): ContratoVariaveis {
  const produtos = Array.isArray(pedido?.produtos)
    ? pedido!.produtos!.map(p =>
        `${p.quantidade}x ${p.nome} (${p.unidade}) — ${p.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      ).join('\n')
    : '';

  return {
    nome_cliente: pedido?.cliente_nome ?? 'Nome do Cliente',
    valor_total: pedido?.valor_total != null
      ? pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'R$ 0,00',
    data: new Date().toLocaleDateString('pt-BR'),
    data_entrega: pedido?.data_entrega ?? '__/__/____',
    vendedor: member?.name ?? 'Vendedor',
    empresa: company.name,
    cnpj_empresa: company.cnpj ?? '',
    endereco_empresa: (company as any).endereco ?? '',
    telefone_empresa: (company as any).telefone ?? '',
    email_empresa: (company as any).email_empresa ?? '',
    endereco_entrega: pedido?.endereco_entrega ?? '',
    forma_pagamento: pedido?.forma_pagamento ?? '',
    condicoes_pagamento: pedido?.forma_condicao ?? '',
    produtos,
    numero_pedido: pedido?.id ? pedido.id.slice(-6).toUpperCase() : '------',
    layout_obs: pedido?.layout_obs ?? '',
    observacoes: pedido?.observacoes ?? '',
  };
}

// Normalizes signature to a clean data URI
function normalizeSig(sig: string | null | undefined): string {
  if (!sig) return '';
  // Strip any whitespace/newlines that some environments add
  const clean = sig.replace(/\s+/g, '');
  if (clean.startsWith('data:')) {
    // Ensure format is exactly data:image/png;base64,<data>
    const comma = clean.indexOf(',');
    if (comma === -1) return '';
    return 'data:image/png;base64,' + clean.substring(comma + 1);
  }
  return `data:image/png;base64,${clean}`;
}

function cabecalhoHtml(company: Company, logoUrl: string | null | undefined, primaryColor: string): string {
  const cnpj = company.cnpj ?? '';
  const telefone = (company as any).telefone ?? '';
  const emailEmpresa = (company as any).email_empresa ?? '';
  const endereco = (company as any).endereco ?? '';
  const contato = [telefone, emailEmpresa].filter(Boolean).join('  |  ');

  const logoContent = logoUrl
    ? `<img src="${logoUrl}" style="max-height:64px;max-width:72px;display:block;margin:0 auto;" />`
    : `<div style="font-size:28px;line-height:64px;text-align:center;">&#x1F3E2;</div>`;

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${primaryColor};">
    <tr>
      <td width="104" style="padding:18px 0 18px 20px;vertical-align:middle;">
        <div style="width:82px;height:82px;background:white;border-radius:10px;text-align:center;line-height:82px;overflow:hidden;">
          ${logoContent}
        </div>
      </td>
      <td style="padding:18px 20px;vertical-align:middle;">
        <div style="color:white;font-size:22px;font-weight:800;letter-spacing:0.5px;">${company.name.toUpperCase()}</div>
        ${cnpj ? `<div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:3px;">CNPJ: ${cnpj}</div>` : ''}
        ${contato ? `<div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:2px;">${contato}</div>` : ''}
        ${endereco ? `<div style="color:rgba(255,255,255,0.75);font-size:11px;margin-top:2px;">${endereco}</div>` : ''}
      </td>
    </tr>
  </table>`;
}

function secaoHtml(titulo: string, cor: string): string {
  return `<div style="background:${cor};color:white;font-size:11px;font-weight:700;letter-spacing:1px;padding:7px 12px;margin-top:14px;">${titulo}</div>`;
}

function linhaHtml(label: string, valor: string | null | undefined): string {
  if (!valor) return '';
  return `
  <tr>
    <td style="padding:7px 12px;color:#6b7280;font-size:12px;width:38%;border-bottom:1px solid #f3f4f6;vertical-align:top;">${label}</td>
    <td style="padding:7px 12px;color:#111827;font-size:13px;border-bottom:1px solid #f3f4f6;vertical-align:top;">${valor}</td>
  </tr>`;
}

function blocoAssinatura(sig: string | null | undefined, label: string, datetime?: string): string {
  const src = normalizeSig(sig);
  return `
  <td style="width:50%;text-align:center;padding:0 20px;vertical-align:bottom;">
    ${src
      ? `<img src="${src}" style="max-width:220px;max-height:80px;display:block;margin:0 auto;" />`
      : `<div style="height:80px;"></div>`
    }
    <div style="border-top:1px solid #374151;margin-top:4px;padding-top:5px;">
      <div style="font-size:11px;color:#6b7280;">${label}</div>
      ${datetime ? `<div style="font-size:10px;color:#9ca3af;margin-top:2px;">${datetime}</div>` : ''}
    </div>
  </td>`;
}

function rodapeHtml(numeroPedido: string, company: Company): string {
  const cnpj = company.cnpj ?? '';
  const telefone = (company as any).telefone ?? '';
  return `
  <div style="text-align:center;margin-top:32px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;">
    Contrato #${numeroPedido} &nbsp;·&nbsp; ${company.name}${cnpj ? ' &nbsp;·&nbsp; CNPJ: ' + cnpj : ''}${telefone ? ' &nbsp;·&nbsp; ' + telefone : ''}
  </div>`;
}

export function buildContratoHtml(
  textoResolvido: string,
  company: Company,
  pedido: Partial<Pedido>,
  options: {
    logoUrl?: string | null;
    primaryColor?: string;
    assinaturaVendedor?: string | null;
    assinaturaCliente?: string | null;
    logs?: LogEntry[];
  } = {}
): string {
  const {
    logoUrl,
    primaryColor = '#4F46E5',
    assinaturaVendedor,
    assinaturaCliente,
    logs = [],
  } = options;

  const numeroPedido = pedido.id ? pedido.id.slice(-6).toUpperCase() : '------';
  const now = new Date();
  const dataAtual = now.toLocaleDateString('pt-BR');
  const dataHoraAssinatura = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
  const valorTotal = pedido.valor_total != null
    ? pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;
  const produtos = Array.isArray(pedido.produtos) ? pedido.produtos : [];
  const dataEntrega = [pedido.data_entrega, pedido.horario_entrega].filter(Boolean).join(' às ');

  const ocorrencias = logs.filter(l => l.tipo === 'ocorrencia');
  const pagamentos = logs.filter(l => l.tipo === 'pagamento');
  const temPosterior = ocorrencias.length > 0 || pagamentos.length > 0 ||
    (pedido.status === 'entregue' && (pedido.assinatura_recebimento || pedido.data_recebimento));

  const produtosRows = produtos.map((p, i) => `
  <tr style="background:${i % 2 === 1 ? '#f9fafb' : 'white'}">
    <td colspan="2" style="padding:8px 12px;font-size:13px;border-bottom:1px solid #f3f4f6;">
      <span style="font-weight:500;">${p.quantidade}x ${p.nome}</span>
      <span style="color:#9ca3af;font-size:11px;"> (${p.unidade})</span>
      <span style="float:right;color:#16a34a;font-weight:600;">${p.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    </td>
  </tr>`).join('');

  // ── Seção posterior ao contrato ──────────────────────────────
  let posteriorHtml = '';
  if (temPosterior) {
    posteriorHtml += `
    <div style="margin-top:28px;border-top:2px dashed #d1d5db;padding-top:16px;">
      <div style="text-align:center;color:#9ca3af;font-size:11px;font-style:italic;margin-bottom:8px;">
        &#9472;&#9472; Informações registradas após a celebração do contrato &#9472;&#9472;
      </div>`;

    if (ocorrencias.length > 0) {
      posteriorHtml += `
      ${secaoHtml('OCORRÊNCIAS REGISTRADAS', '#92400E')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde68a;border-top:none;">
        ${ocorrencias.map(oc => `
        <tr style="background:#fffbeb;">
          <td style="padding:7px 12px;color:#92400E;font-size:11px;width:32%;border-bottom:1px solid #fde68a;vertical-align:top;">${oc.data}</td>
          <td style="padding:7px 12px;color:#78350f;font-size:12px;border-bottom:1px solid #fde68a;">${oc.texto}</td>
        </tr>`).join('')}
      </table>`;
    }

    if (pagamentos.length > 0) {
      posteriorHtml += `
      ${secaoHtml('PAGAMENTOS REGISTRADOS', '#065F46')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d1fae5;border-top:none;">
        ${pagamentos.map((p, i) => {
          const sig = normalizeSig(p.assinatura);
          return `
          <tr style="background:${i % 2 === 1 ? '#f0fdf4' : 'white'}">
            <td style="padding:7px 12px;color:#6b7280;font-size:11px;width:32%;border-bottom:1px solid #d1fae5;vertical-align:top;">${p.data}</td>
            <td style="padding:7px 12px;color:#059669;font-size:13px;font-weight:700;border-bottom:1px solid #d1fae5;">${(p.valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td style="padding:7px 12px;color:#374151;font-size:12px;border-bottom:1px solid #d1fae5;">${p.obs ?? ''}</td>
          </tr>
          ${sig ? `
          <tr style="background:#f0fdf4;">
            <td colspan="3" style="padding:6px 12px;border-bottom:1px solid #d1fae5;">
              <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">Assinatura:</div>
              <img src="${sig}" style="max-width:180px;max-height:55px;display:block;" />
            </td>
          </tr>` : ''}`;
        }).join('')}
      </table>`;
    }

    if (pedido.status === 'entregue' && (pedido.assinatura_recebimento || pedido.data_recebimento)) {
      const sigEntrega = normalizeSig(pedido.assinatura_recebimento);
      posteriorHtml += `
      ${secaoHtml('CONFIRMAÇÃO DE ENTREGA', '#16A34A')}
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #bbf7d0;border-top:none;">
        ${linhaHtml('Data da entrega', pedido.data_recebimento)}
        ${linhaHtml('Endereço', pedido.endereco_entrega)}
        ${sigEntrega ? `
        <tr>
          <td style="padding:7px 12px;color:#6b7280;font-size:12px;width:38%;border-bottom:1px solid #bbf7d0;vertical-align:top;">Assinatura de recebimento</td>
          <td style="padding:7px 12px;border-bottom:1px solid #bbf7d0;">
            <img src="${sigEntrega}" style="max-width:200px;max-height:65px;display:block;" />
          </td>
        </tr>` : ''}
      </table>`;
    }

    posteriorHtml += `</div>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#111; background:#fff; }
    .content { padding:0 24px 24px; max-width:800px; margin:0 auto; }
    table { border-collapse:collapse; }
  </style>
</head>
<body>

  ${cabecalhoHtml(company, logoUrl, primaryColor)}

  <div class="content">

    <div style="text-align:center;padding:18px 0 14px;">
      <div style="font-size:17px;font-weight:700;color:${primaryColor};letter-spacing:2px;">CONTRATO DE SERVIÇO</div>
      <div style="color:#9ca3af;font-size:11px;margin-top:4px;">N&#186; ${numeroPedido} &nbsp;&#183;&nbsp; ${dataAtual}</div>
    </div>

    ${secaoHtml('DADOS DO CLIENTE', primaryColor)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-top:none;">
      ${linhaHtml('Nome / Razão Social', pedido.cliente_nome)}
      ${linhaHtml('Telefone / WhatsApp', pedido.telefone_contato)}
      ${linhaHtml('Recebedor', pedido.nome_contato)}
      ${linhaHtml('Endereço de entrega', pedido.endereco_entrega)}
    </table>

    ${secaoHtml('REFERÊNCIAS · VALOR TOTAL', primaryColor)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-top:none;">
      ${linhaHtml('Condições', pedido.forma_condicao)}
      ${linhaHtml('Forma de pagamento', pedido.forma_pagamento)}
    </table>

    ${valorTotal ? `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr style="background:${primaryColor};">
        <td style="padding:10px 12px;color:white;font-weight:700;font-size:14px;">VALOR TOTAL:</td>
        <td style="padding:10px 12px;color:white;font-weight:800;font-size:16px;text-align:right;">${valorTotal}</td>
      </tr>
    </table>` : ''}

    ${dataEntrega ? `
    ${secaoHtml('PREVISÃO DE CHEGADA', primaryColor)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-top:none;">
      ${linhaHtml('Data / Horário', dataEntrega)}
    </table>` : ''}

    ${produtos.length > 0 ? `
    ${secaoHtml('PRODUTOS / QUANTIDADE', primaryColor)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-top:none;">
      ${produtosRows}
    </table>` : ''}

    ${pedido.layout_obs ? `
    ${secaoHtml('LAYOUT / ARTE', primaryColor)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-top:none;">
      <tr><td style="padding:8px 12px;font-size:13px;color:#374151;">${pedido.layout_obs}</td></tr>
    </table>` : ''}

    ${pedido.observacoes ? `
    ${secaoHtml('OBSERVAÇÕES', primaryColor)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-top:none;">
      <tr><td style="padding:8px 12px;font-size:13px;color:#374151;">${pedido.observacoes}</td></tr>
    </table>` : ''}

    <br/>

    ${textoResolvido ? `
    ${secaoHtml('TERMOS DO CONTRATO', primaryColor)}
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;padding:14px 12px;">
      <div style="font-size:11px;color:#374151;line-height:1.7;">${textoResolvido.replace(/\n/g, '<br/>')}</div>
    </div>` : ''}

    <!-- ── Assinaturas principais do contrato ── -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;">
      <tr>
        ${blocoAssinatura(assinaturaCliente, 'Assinatura do cliente', dataHoraAssinatura)}
        ${blocoAssinatura(assinaturaVendedor, 'Responsável pela empresa', dataHoraAssinatura)}
      </tr>
    </table>

    <!-- ── Informações posteriores ── -->
    ${posteriorHtml}

    ${rodapeHtml(numeroPedido, company)}
  </div>
</body>
</html>`;
}

export function buildReciboHtml(
  company: Company,
  pedido: Partial<Pedido>,
  pagamentos: LogEntry[],
  options: {
    logoUrl?: string | null;
    primaryColor?: string;
  } = {}
): string {
  const { logoUrl, primaryColor = '#4F46E5' } = options;
  const numeroPedido = pedido.id ? pedido.id.slice(-6).toUpperCase() : '------';
  const dataAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const totalPago = pagamentos.reduce((s, l) => s + (l.valor ?? 0), 0);

  const pagamentosRows = pagamentos.map((p, i) => {
    const sig = normalizeSig(p.assinatura);
    return `
    <tr style="background:${i % 2 === 1 ? '#f0fdf4' : 'white'}">
      <td style="padding:8px 12px;font-size:12px;color:#374151;border-bottom:1px solid #d1fae5;width:32%;vertical-align:top;">${p.data}</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#059669;border-bottom:1px solid #d1fae5;width:22%;">${(p.valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      <td style="padding:8px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #d1fae5;">${p.obs ?? ''}</td>
    </tr>
    ${sig ? `
    <tr style="background:#f0fdf4;">
      <td colspan="3" style="padding:6px 12px;border-bottom:1px solid #d1fae5;">
        <div style="font-size:10px;color:#6b7280;margin-bottom:3px;">Assinatura:</div>
        <img src="${sig}" style="max-width:200px;max-height:60px;display:block;" />
      </td>
    </tr>` : ''}`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#111; background:#fff; }
    .content { padding:0 24px 24px; max-width:800px; margin:0 auto; }
    table { border-collapse:collapse; }
  </style>
</head>
<body>
  ${cabecalhoHtml(company, logoUrl, primaryColor)}
  <div class="content">

    <div style="text-align:center;padding:18px 0 14px;">
      <div style="font-size:17px;font-weight:700;color:${primaryColor};letter-spacing:2px;">RECIBO DE PAGAMENTO</div>
      <div style="color:#9ca3af;font-size:11px;margin-top:4px;">Ref. Contrato N&#186; ${numeroPedido} &nbsp;&#183;&nbsp; Emitido em: ${dataAtual}</div>
    </div>

    ${secaoHtml('DADOS DO PEDIDO', primaryColor)}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-top:none;">
      ${linhaHtml('Cliente', pedido.cliente_nome)}
      ${linhaHtml('Valor total do pedido', pedido.valor_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}
      ${linhaHtml('Total recebido', totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))}
      ${pedido.valor_total && totalPago < pedido.valor_total
        ? linhaHtml('Saldo restante', (pedido.valor_total - totalPago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
        : ''}
    </table>

    ${secaoHtml('PAGAMENTOS REGISTRADOS', '#065F46')}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d1fae5;border-top:none;">
      <tr style="background:#f3f4f6;">
        <td style="padding:6px 12px;font-size:11px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">Data</td>
        <td style="padding:6px 12px;font-size:11px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">Valor</td>
        <td style="padding:6px 12px;font-size:11px;font-weight:700;color:#374151;border-bottom:1px solid #e5e7eb;">Observação</td>
      </tr>
      ${pagamentosRows}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:0;">
      <tr style="background:${primaryColor};">
        <td style="padding:10px 12px;color:white;font-weight:700;font-size:14px;">TOTAL PAGO:</td>
        <td style="padding:10px 12px;color:white;font-weight:800;font-size:16px;text-align:right;">${totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
      </tr>
    </table>

    ${rodapeHtml(numeroPedido, company)}
  </div>
</body>
</html>`;
}

export function buildAdendoEntregaHtml(
  company: Company,
  pedido: Partial<Pedido>,
  options: {
    logoUrl?: string | null;
    primaryColor?: string;
  } = {}
): string {
  const { logoUrl, primaryColor = '#4F46E5' } = options;
  const numeroPedido = pedido.id ? pedido.id.slice(-6).toUpperCase() : '------';
  const dataEmissao = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const dataEntrega = pedido.data_recebimento ?? dataEmissao;
  const sigEntrega = normalizeSig(pedido.assinatura_recebimento);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#111; background:#fff; }
    .content { padding:0 24px 24px; max-width:800px; margin:0 auto; }
    table { border-collapse:collapse; }
  </style>
</head>
<body>
  ${cabecalhoHtml(company, logoUrl, '#16A34A')}
  <div class="content">

    <div style="text-align:center;padding:18px 0 14px;">
      <div style="font-size:17px;font-weight:700;color:#16a34a;letter-spacing:2px;">ADENDO DE ENTREGA</div>
      <div style="color:#9ca3af;font-size:11px;margin-top:4px;">Ref. Contrato N&#186; ${numeroPedido} &nbsp;&#183;&nbsp; Emitido em: ${dataEmissao}</div>
    </div>

    ${secaoHtml('CONFIRMAÇÃO DE ENTREGA', '#16A34A')}
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #bbf7d0;border-top:none;">
      ${linhaHtml('Cliente', pedido.cliente_nome)}
      ${linhaHtml('Endereço de entrega', pedido.endereco_entrega)}
      ${linhaHtml('Data / Hora da entrega', dataEntrega)}
      ${linhaHtml('Recebedor', pedido.nome_contato)}
    </table>

    ${secaoHtml('DECLARAÇÃO', '#16A34A')}
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-top:none;padding:14px 12px;">
      <div style="font-size:12px;color:#374151;line-height:1.7;">
        O(a) cliente identificado(a) acima declara ter recebido o(s) produto(s)/serviço(s)
        referente ao Contrato N&#186; ${numeroPedido} da empresa ${company.name}, em perfeito estado e
        de acordo com o combinado. Este adendo complementa o contrato original e tem plena
        validade legal como comprovante de entrega.
      </div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:40px;">
      <tr>
        ${blocoAssinatura(sigEntrega, 'Assinatura de recebimento')}
        <td style="width:50%;text-align:center;padding:0 20px;vertical-align:bottom;">
          <div style="height:80px;"></div>
          <div style="border-top:1px solid #374151;padding-top:5px;">
            <div style="font-size:11px;color:#6b7280;">Data: ${dataEntrega}</div>
          </div>
        </td>
      </tr>
    </table>

    ${rodapeHtml(numeroPedido, company)}
  </div>
</body>
</html>`;
}

export const TEMPLATE_PADRAO = `A parte identificada como "DADOS DO CLIENTE" compromete-se a efetuar o pagamento do valor indicado no campo "VALOR TOTAL", conforme as condições estabelecidas no campo "REFERÊNCIAS" à empresa {{empresa}}, pela execução dos serviços descritos no campo "PRODUTOS" na quantidade e especificações constantes nos campos "QUANTIDADE" e "OBSERVAÇÕES", dentro do prazo fixado no campo "PREVISÃO DE CHEGADA", sendo que a arte final desenvolvida para o serviço integra o valor contratado, e seu uso separado dependerá de ajuste posterior; a CONTRATANTE declara que, no ato do recebimento do material/serviço, verificará sua conformidade com o solicitado, dando-o por aceito e aprovado, salvo se, no prazo de 3 (três) dias úteis, apresentar por escrito as ressalvas pertinentes; em caso de atraso no pagamento, incidirão multa de 2%, juros de 1% ao mês e correção pelo INPC desde o vencimento, operando-se o vencimento antecipado das demais parcelas, tornando a dívida integralmente exigível; as partes reconhecem que este pedido foi formalizado e enviado via WhatsApp e que o seu aceite pela CONTRATANTE, mediante mensagem textual na referida plataforma, tem plena validade legal e força vinculante, conforme disposto na Lei nº 14.063/2020. ASSINANDO ESSE CONTRATO VOCÊ ESTÁ AUTORIZANDO A PRODUÇÃO DO MATERIAL.`;

export const VARIAVEIS_DISPONIVEIS: { chave: string; descricao: string }[] = [
  { chave: '{{nome_cliente}}', descricao: 'Nome do cliente' },
  { chave: '{{valor_total}}', descricao: 'Valor total do pedido' },
  { chave: '{{data}}', descricao: 'Data atual' },
  { chave: '{{data_entrega}}', descricao: 'Data de entrega' },
  { chave: '{{vendedor}}', descricao: 'Nome do vendedor' },
  { chave: '{{empresa}}', descricao: 'Nome da empresa' },
  { chave: '{{cnpj_empresa}}', descricao: 'CNPJ/CPF da empresa' },
  { chave: '{{endereco_empresa}}', descricao: 'Endereço da empresa' },
  { chave: '{{telefone_empresa}}', descricao: 'Telefone da empresa' },
  { chave: '{{email_empresa}}', descricao: 'E-mail da empresa' },
  { chave: '{{endereco_entrega}}', descricao: 'Endereço de entrega' },
  { chave: '{{forma_pagamento}}', descricao: 'Forma de pagamento' },
  { chave: '{{condicoes_pagamento}}', descricao: 'Condições de pagamento' },
  { chave: '{{produtos}}', descricao: 'Lista de produtos' },
  { chave: '{{numero_pedido}}', descricao: 'Número do pedido' },
  { chave: '{{layout_obs}}', descricao: 'Layout / Arte' },
  { chave: '{{observacoes}}', descricao: 'Observações do pedido' },
];

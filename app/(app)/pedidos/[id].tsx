import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Alert,
  KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StatusBadge } from '@/components/StatusBadge';
import { SignaturePad } from '@/components/SignaturePad';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AuthInput } from '@/components/AuthInput';
import { usePedidos, Pedido, LogEntry } from '@/hooks/usePedidos';
import { useAuth } from '@/lib/auth';
import { resolveVariaveis, buildVariaveis, buildContratoHtml, buildReciboHtml, buildAdendoEntregaHtml } from '@/lib/contrato';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-400 uppercase mb-2 px-4">{title}</Text>
      <View className="bg-white rounded-2xl mx-4 p-4 shadow-sm">{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row py-1.5 border-b border-gray-50 last:border-0">
      <Text className="text-gray-400 text-sm w-28">{label}</Text>
      <Text className="text-gray-800 text-sm flex-1">{value}</Text>
    </View>
  );
}

function LogCard({ log }: { log: LogEntry }) {
  const { t } = useTranslation();
  const isPagamento = log.tipo === 'pagamento';
  return (
    <View className={`rounded-xl p-3 mb-2 ${isPagamento ? 'bg-green-50' : 'bg-gray-50'}`}>
      <View className="flex-row items-center justify-between mb-1">
        <Text className={`text-xs font-semibold ${isPagamento ? 'text-green-700' : 'text-gray-500'}`}>
          {isPagamento ? t('pedidos.logPayment') : t('pedidos.logOccurrence')}
        </Text>
        <Text className="text-xs text-gray-400">{log.data}</Text>
      </View>
      <Text className="text-gray-700 text-sm">{log.texto}</Text>
    </View>
  );
}

export default function PedidoDetailScreen() {
  const { theme, company, member } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPedido, addLog, registrarPagamento, confirmarEntrega, deletePedido } = usePedidos();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [showPagamento, setShowPagamento] = useState(false);
  const [showEntrega, setShowEntrega] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const [valorPag, setValorPag] = useState('');
  const [obsPag, setObsPag] = useState('');
  const [assinaturaPag, setAssinaturaPag] = useState('');
  const [savingPag, setSavingPag] = useState(false);

  const [assinaturaEntrega, setAssinaturaEntrega] = useState('');
  const [savingEntrega, setSavingEntrega] = useState(false);

  const [textoLog, setTextoLog] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  const [drawingPag, setDrawingPag] = useState(false);
  const [drawingEntrega, setDrawingEntrega] = useState(false);

  const load = useCallback(async () => {
    const p = await getPedido(id);
    setPedido(p);
    if (p) {
      try { setLogs(JSON.parse(p.logs_json || '[]')); } catch (_) { setLogs([]); }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handlePagamento() {
    const valor = parseFloat(valorPag.replace(',', '.'));
    if (!valor || valor <= 0) { Alert.alert(t('pedidos.modal.payment.invalidValue')); return; }
    setSavingPag(true);
    const { error } = await registrarPagamento(id, valor, obsPag, assinaturaPag, pedido?.valor_total ?? 0);
    setSavingPag(false);
    if (error) { Alert.alert(t('common.error'), error); return; }
    setShowPagamento(false);
    setValorPag(''); setObsPag(''); setAssinaturaPag('');
    load();
  }

  async function handleEntrega() {
    setSavingEntrega(true);
    const { error } = await confirmarEntrega(id, assinaturaEntrega);
    setSavingEntrega(false);
    if (error) { Alert.alert(t('common.error'), error); return; }
    setShowEntrega(false);
    load();
  }

  async function handleLog() {
    if (!textoLog.trim()) return;
    setSavingLog(true);
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const { error } = await addLog(id, { tipo: 'ocorrencia', texto: textoLog.trim(), data: now });
    setSavingLog(false);
    if (error) { Alert.alert(t('common.error'), error); return; }
    setTextoLog('');
    setShowLog(false);
    load();
  }

  async function handleDeletePedido() {
    Alert.alert(
      'Excluir pedido',
      'Tem certeza? Esta ação não pode ser desfeita.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'), style: 'destructive', onPress: async () => {
            const { error } = await deletePedido(id);
            if (error) { Alert.alert(t('common.error'), error); return; }
            router.back();
          },
        },
      ]
    );
  }

  async function handleGerarContrato() {
    if (!company || !pedido) return;
    const template = company.contract_template;
    if (!template) {
      Alert.alert(t('pedidos.contract.noTemplate'), t('pedidos.contract.noTemplateSub'));
      return;
    }
    try {
      const vars = buildVariaveis(company, member, pedido);
      const resolvido = resolveVariaveis(template, vars);
      const html = buildContratoHtml(resolvido, company, pedido, {
        logoUrl: company.logo_url,
        primaryColor: theme.primary,
        assinaturaVendedor: pedido.assinatura_vendedor,
        assinaturaCliente: pedido.assinatura_cliente,
        logs,
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Contrato — ${pedido.cliente_nome}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      Alert.alert(t('pedidos.contract.pdfError'), e.message);
    }
  }

  async function handleGerarRecibo() {
    if (!company || !pedido) return;
    const pagamentos = logs.filter(l => l.tipo === 'pagamento');
    if (pagamentos.length === 0) {
      Alert.alert(t('pedidos.contract.noPayments'), t('pedidos.contract.noPaymentsSub'));
      return;
    }
    try {
      const html = buildReciboHtml(company, pedido, pagamentos, {
        logoUrl: company.logo_url,
        primaryColor: theme.primary,
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Recibo — ${pedido.cliente_nome}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      Alert.alert(t('pedidos.contract.pdfError'), e.message);
    }
  }

  async function handleGerarAdendo() {
    if (!company || !pedido) return;
    if (pedido.status !== 'entregue') {
      Alert.alert(t('pedidos.contract.notDelivered'), t('pedidos.contract.notDeliveredSub'));
      return;
    }
    try {
      const html = buildAdendoEntregaHtml(company, pedido, {
        logoUrl: company.logo_url,
        primaryColor: theme.primary,
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Adendo Entrega — ${pedido.cliente_nome}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      Alert.alert(t('pedidos.contract.pdfError'), e.message);
    }
  }

  if (loading) return <LoadingScreen />;
  if (!pedido) return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
      <Text className="text-gray-500">{t('pedidos.notFound')}</Text>
    </SafeAreaView>
  );

  const produtos = Array.isArray(pedido.produtos) ? pedido.produtos : [];
  const totalPago = logs.filter(l => l.tipo === 'pagamento').reduce((s, l) => s + (l.valor ?? 0), 0);
  const restante = (pedido.valor_total ?? 0) - totalPago;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: theme.primary }} className="px-6 pt-14 pb-5">
        <View className="flex-row items-center mb-3">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-white text-2xl">‹</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1" numberOfLines={1}>{pedido.cliente_nome}</Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-white/70 text-sm">#{pedido.id.slice(-6).toUpperCase()}</Text>
          <StatusBadge status={pedido.status} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}>

        {/* Ações */}
        <View className="px-4 mb-4" style={{ gap: 8 }}>
          <View className="flex-row" style={{ gap: 8 }}>
            <TouchableOpacity className="flex-1 rounded-xl py-3 items-center"
              style={{ backgroundColor: theme.primary }}
              onPress={() => setShowPagamento(true)}>
              <Text className="text-white text-sm font-semibold">{t('pedidos.actions.payment')}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-green-600 rounded-xl py-3 items-center"
              onPress={() => setShowEntrega(true)}>
              <Text className="text-white text-sm font-semibold">{t('pedidos.actions.delivery')}</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row" style={{ gap: 8 }}>
            <TouchableOpacity className="flex-1 bg-gray-100 rounded-xl py-3 items-center"
              onPress={() => setShowLog(true)}>
              <Text className="text-gray-700 text-sm font-semibold">{t('pedidos.actions.log')}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 rounded-xl py-3 items-center border"
              style={{ borderColor: theme.primary, backgroundColor: theme.primaryLight }}
              onPress={handleGerarContrato}>
              <Text className="text-sm font-semibold" style={{ color: theme.primaryDark }}>
                {t('pedidos.actions.contract')}
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row" style={{ gap: 8 }}>
            <TouchableOpacity className="flex-1 rounded-xl py-3 items-center"
              style={{ backgroundColor: '#0891B2' }}
              onPress={handleGerarRecibo}>
              <Text className="text-white text-sm font-semibold">{t('pedidos.actions.receipt')}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 rounded-xl py-3 items-center"
              style={{ backgroundColor: '#16A34A' }}
              onPress={handleGerarAdendo}>
              <Text className="text-white text-sm font-semibold">{t('pedidos.actions.deliveryDoc')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resumo financeiro */}
        {pedido.valor_total != null && (
          <Section title={t('pedidos.financial.title')}>
            <View className="flex-row justify-between py-1">
              <Text className="text-gray-500">{t('pedidos.financial.total')}</Text>
              <Text className="text-gray-900 font-semibold">
                {pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
            <View className="flex-row justify-between py-1">
              <Text className="text-gray-500">{t('pedidos.financial.paid')}</Text>
              <Text className="text-green-600 font-semibold">
                {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
            {restante > 0 && (
              <View className="flex-row justify-between py-1 border-t border-gray-100 mt-1 pt-2">
                <Text className="text-gray-700 font-medium">{t('pedidos.financial.balance')}</Text>
                <Text className="text-red-500 font-bold">
                  {restante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            )}
          </Section>
        )}

        {/* Informações */}
        <Section title={t('pedidos.info.title')}>
          <InfoRow label={t('pedidos.info.payment')} value={pedido.forma_pagamento} />
          <InfoRow label={t('pedidos.info.delivery')} value={[pedido.data_entrega, pedido.horario_entrega].filter(Boolean).join(' às ')} />
          <InfoRow label={t('pedidos.info.address')} value={pedido.endereco_entrega} />
          <InfoRow label={t('pedidos.info.contact')} value={[pedido.nome_contato, pedido.telefone_contato].filter(Boolean).join(' — ')} />
          {pedido.data_recebimento && <InfoRow label={t('pedidos.info.received')} value={pedido.data_recebimento} />}
          {pedido.observacoes && (
            <View className="pt-2">
              <Text className="text-gray-400 text-sm mb-1">{t('pedidos.info.notes')}</Text>
              <Text className="text-gray-800 text-sm">{pedido.observacoes}</Text>
            </View>
          )}
        </Section>

        {/* Produtos */}
        {produtos.length > 0 && (
          <Section title={t('pedidos.productsSection')}>
            {produtos.map((p, idx) => (
              <View key={idx} className="flex-row items-center py-2 border-b border-gray-50 last:border-0">
                <Text className="text-gray-800 flex-1 text-sm">{p.nome}</Text>
                <Text className="text-gray-400 text-sm mx-2">{p.quantidade} {p.unidade}</Text>
                <Text className="text-gray-700 font-medium text-sm">
                  {p.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {/* Assinaturas originais */}
        {(pedido.assinatura_vendedor || pedido.assinatura_cliente) && (
          <Section title={t('pedidos.signaturesSection')}>
            <View className="flex-row gap-3">
              {pedido.assinatura_vendedor && (
                <View className="flex-1 items-center">
                  <Text className="text-xs text-gray-400 mb-1">{t('pedidos.sigSeller')}</Text>
                  <Image source={{ uri: pedido.assinatura_vendedor }} className="w-full rounded-lg"
                    style={{ height: 80 }} resizeMode="contain" />
                </View>
              )}
              {pedido.assinatura_cliente && (
                <View className="flex-1 items-center">
                  <Text className="text-xs text-gray-400 mb-1">{t('pedidos.sigClient')}</Text>
                  <Image source={{ uri: pedido.assinatura_cliente }} className="w-full rounded-lg"
                    style={{ height: 80 }} resizeMode="contain" />
                </View>
              )}
            </View>
          </Section>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <Section title={t('pedidos.historySection', { count: logs.length })}>
            {[...logs].reverse().map((log, idx) => <LogCard key={idx} log={log} />)}
          </Section>
        )}

        {/* Excluir pedido */}
        <View className="mx-4 mt-2 mb-2">
          <TouchableOpacity
            className="border border-red-200 bg-red-50 rounded-xl py-3 items-center"
            onPress={handleDeletePedido}
          >
            <Text className="text-red-600 text-sm font-semibold">🗑 Excluir pedido</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Pagamento */}
      <Modal visible={showPagamento} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <Text className="text-lg font-bold text-gray-900">{t('pedidos.modal.payment.title')}</Text>
              <TouchableOpacity onPress={() => setShowPagamento(false)}>
                <Text className="text-gray-400">{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled"
              scrollEnabled={!drawingPag}>
              <AuthInput label={t('pedidos.modal.payment.amount')} value={valorPag} onChangeText={setValorPag}
                placeholder="0,00" keyboardType="decimal-pad" />
              <AuthInput label={t('pedidos.modal.payment.notes')} value={obsPag} onChangeText={setObsPag}
                placeholder={t('pedidos.modal.payment.optional')} autoCapitalize="sentences" />
              <View className="mb-4">
                <SignaturePad label={t('pedidos.modal.payment.signature')} onSave={setAssinaturaPag}
                  onClear={() => setAssinaturaPag('')}
                  onDrawStart={() => setDrawingPag(true)}
                  onDrawEnd={() => setDrawingPag(false)} />
              </View>
              <PrimaryButton title={t('pedidos.modal.payment.confirm')} loading={savingPag}
                onPress={handlePagamento} color={theme.primary} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Entrega */}
      <Modal visible={showEntrega} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <Text className="text-lg font-bold text-gray-900">{t('pedidos.modal.delivery.title')}</Text>
            <TouchableOpacity onPress={() => setShowEntrega(false)}>
              <Text className="text-gray-400">{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }} scrollEnabled={!drawingEntrega}>
            <Text className="text-gray-500 text-sm mb-4">
              {t('pedidos.modal.delivery.instructions')}
            </Text>
            <View className="mb-6">
              <SignaturePad label={t('pedidos.modal.delivery.signature')} onSave={setAssinaturaEntrega}
                onClear={() => setAssinaturaEntrega('')}
                onDrawStart={() => setDrawingEntrega(true)}
                onDrawEnd={() => setDrawingEntrega(false)} />
            </View>
            <PrimaryButton title={t('pedidos.modal.delivery.confirm')} loading={savingEntrega}
              onPress={handleEntrega} color="#16A34A" />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal Ocorrência */}
      <Modal visible={showLog} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <Text className="text-lg font-bold text-gray-900">{t('pedidos.modal.log.title')}</Text>
              <TouchableOpacity onPress={() => setShowLog(false)}>
                <Text className="text-gray-400">{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            <View className="p-4">
              <TextInput
                className="bg-white rounded-2xl p-4 text-gray-900 shadow-sm"
                value={textoLog}
                onChangeText={setTextoLog}
                placeholder={t('pedidos.modal.log.placeholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                autoCapitalize="sentences"
                style={{ minHeight: 120, textAlignVertical: 'top' }}
              />
              <View className="mt-4">
                <PrimaryButton title={t('pedidos.modal.log.btn')} loading={savingLog}
                  onPress={handleLog} color={theme.primary} />
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

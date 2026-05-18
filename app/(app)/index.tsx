import { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BarChart } from 'react-native-gifted-charts';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { useRelatorio, PeriodoFiltro } from '@/hooks/useRelatorio';
import { buildRelatorioHtml } from '@/lib/relatorio';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;

type QuickAction = {
  emoji: string;
  labelKey: string;
  route: '/(app)/clientes' | '/(app)/pedidos' | '/(app)/materiais' | '/(app)/configuracoes';
};
const QUICK_ACTIONS: QuickAction[] = [
  { emoji: '👥', labelKey: 'dashboard.clients', route: '/(app)/clientes' },
  { emoji: '📋', labelKey: 'dashboard.orders', route: '/(app)/pedidos' },
  { emoji: '📦', labelKey: 'dashboard.products', route: '/(app)/materiais' },
  { emoji: '⚙️', labelKey: 'dashboard.config', route: '/(app)/configuracoes' },
];

const PERIODO_KEYS: PeriodoFiltro[] = ['semana', 'mes', 'trimestre'];

function KPICard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm flex-1">
      <Text className="text-gray-400 text-xs font-semibold uppercase" numberOfLines={1}>{label}</Text>
      <Text className="text-gray-900 text-xl font-bold mt-1" style={color ? { color } : undefined}
        numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text className="text-gray-400 text-xs mt-0.5">{sub}</Text> : null}
    </View>
  );
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function HomeScreen() {
  const { company, member, theme } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { periodo, changePeriodo, kpis, chartData, recentes, loading, fetchRelatorio } = useRelatorio();

  useEffect(() => { fetchRelatorio(periodo); }, [fetchRelatorio]);

  const logoUrl = company?.logo_url ?? null;
  const isAdmin = member?.role === 'admin';
  const firstName = member?.name ? member.name.split(' ')[0] : null;
  const greeting = firstName
    ? t('dashboard.greetingNamed', { name: firstName })
    : t('dashboard.greetingDefault');

  const barData = chartData.map(d => ({
    value: d.value,
    label: d.label,
    frontColor: theme.primary,
    topLabelComponent: d.value > 0
      ? () => (
          <Text style={{ fontSize: 8, color: '#6B7280', marginBottom: 2 }}>
            {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : String(Math.round(d.value))}
          </Text>
        )
      : undefined,
  }));

  async function handleExportPDF() {
    if (!company) return;
    try {
      const html = buildRelatorioHtml(company, kpis, recentes, periodo);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: t('dashboard.exportPDF'),
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      console.warn('PDF error', e.message);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Header ── */}
        <View style={{ backgroundColor: theme.primary }} className="px-6 pt-8 pb-12">
          <View className="flex-row items-center justify-between mb-3">
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={{ width: 44, height: 44, borderRadius: 10 }} resizeMode="contain" />
            ) : (
              <View className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Text className="text-white text-lg font-bold">
                  {company?.name?.[0]?.toUpperCase() ?? 'V'}
                </Text>
              </View>
            )}
            {isAdmin && (
              <View className="bg-white/20 rounded-lg px-3 py-1">
                <Text className="text-white text-xs font-semibold">{t('dashboard.admin')}</Text>
              </View>
            )}
          </View>
          <Text className="text-white/80 text-sm">{company?.name ?? 'VendasApp'}</Text>
          <Text className="text-white text-2xl font-bold mt-0.5">{greeting}</Text>
        </View>

        <View className="px-4 -mt-6">

          {/* ── Trial banner ── */}
          {company?.subscription_status === 'trial' && (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
              <Text className="text-amber-800 font-semibold text-sm">{t('dashboard.trialBanner')}</Text>
              <Text className="text-amber-700 text-xs mt-0.5">{t('dashboard.trialSub')}</Text>
            </View>
          )}

          {/* ── Período ── */}
          <View className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
            <View className="flex-row border-b border-gray-100">
              {PERIODO_KEYS.map(p => (
                <TouchableOpacity
                  key={p}
                  className="flex-1 py-3 items-center"
                  style={{ borderBottomWidth: periodo === p ? 2 : 0, borderBottomColor: theme.primary }}
                  onPress={() => changePeriodo(p)}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: periodo === p ? theme.primary : '#9CA3AF' }}
                  >
                    {t(`dashboard.periodo.${p}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <View className="p-4">
                {/* KPI cards — row 1 */}
                <View className="flex-row mb-3" style={{ gap: 10 }}>
                  <KPICard label={t('dashboard.ordersCard')} value={String(kpis.totalPedidos)} />
                  <KPICard
                    label={t('dashboard.billedCard')}
                    value={brl(kpis.valorFaturado)}
                    sub={t('dashboard.receivedSub', { value: brl(kpis.valorRecebido) })}
                    color={theme.primary}
                  />
                </View>
                {/* KPI cards — row 2 */}
                <View className="flex-row mb-4" style={{ gap: 10 }}>
                  <KPICard label={t('dashboard.deliveredCard')} value={String(kpis.entregues)} color="#16A34A" />
                  <KPICard label={t('dashboard.pendingCard')} value={String(kpis.pendentes)} color="#D97706" />
                  <KPICard label={t('dashboard.inPaymentCard')} value={String(kpis.pagos)} color="#2563EB" />
                </View>

                {/* ── Gráfico de barras ── */}
                {chartData.some(d => d.value > 0) ? (
                  <View>
                    <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">
                      {t('dashboard.chartTitle')}
                    </Text>
                    <BarChart
                      data={barData}
                      width={CHART_W}
                      height={160}
                      barWidth={CHART_W / (barData.length * 2.5)}
                      spacing={CHART_W / (barData.length * 3)}
                      initialSpacing={8}
                      noOfSections={4}
                      yAxisThickness={0}
                      xAxisThickness={1}
                      xAxisColor="#F3F4F6"
                      rulesColor="#F3F4F6"
                      rulesType="solid"
                      yAxisTextStyle={{ color: '#9CA3AF', fontSize: 9 }}
                      xAxisLabelTextStyle={{ color: '#9CA3AF', fontSize: 9 }}
                      hideYAxisText={false}
                      isAnimated
                      animationDuration={600}
                    />
                  </View>
                ) : (
                  <View className="items-center py-4">
                    <Text className="text-gray-300 text-sm">{t('dashboard.noData')}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Ações rápidas ── */}
          <View className="bg-white rounded-2xl shadow-sm p-4 mb-3 flex-row flex-wrap">
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.route}
                className="bg-gray-50 rounded-xl p-3 items-center"
                onPress={() => router.push(action.route)}
                style={{ width: '48%', margin: '1%' }}
              >
                <Text style={{ fontSize: 28 }}>{action.emoji}</Text>
                <Text className="text-gray-700 font-semibold text-sm mt-1">{t(action.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Pedidos recentes ── */}
          {recentes.length > 0 && (
            <View className="mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold text-gray-400 uppercase">{t('dashboard.recentOrders')}</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/pedidos')}>
                  <Text className="text-xs font-semibold" style={{ color: theme.primary }}>{t('dashboard.viewAll')}</Text>
                </TouchableOpacity>
              </View>
              {recentes.map(p => (
                <TouchableOpacity
                  key={p.id}
                  className="bg-white rounded-2xl px-4 py-3 mb-2 flex-row items-center shadow-sm"
                  onPress={() => router.push(`/(app)/pedidos/${p.id}`)}
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-gray-900 font-medium text-sm" numberOfLines={1}>
                      {p.cliente_nome}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                      #{p.id.slice(-6).toUpperCase()}
                      {p.valor_total != null ? `  ·  ${brl(p.valor_total)}` : ''}
                    </Text>
                  </View>
                  <StatusBadge status={p.status} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Exportar relatório ── */}
          <TouchableOpacity
            className="rounded-2xl py-4 items-center shadow-sm"
            style={{ backgroundColor: theme.primary }}
            onPress={handleExportPDF}
          >
            <Text className="text-white font-semibold">{t('dashboard.exportPDF')}</Text>
            <Text className="text-white/70 text-xs mt-1">
              {t('dashboard.exportSub', {
                period: t(`dashboard.periodo.${periodo}`),
                count: kpis.totalPedidos,
              })}
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StatusBadge } from '@/components/StatusBadge';
import { usePedidos, Pedido, StatusPedido } from '@/hooks/usePedidos';
import { useAuth } from '@/lib/auth';

type TabKey = StatusPedido | 'todos';

const TAB_KEYS: { key: TabKey; labelKey: string }[] = [
  { key: 'todos', labelKey: 'pedidos.tabs.all' },
  { key: 'arte_pendente', labelKey: 'pedidos.tabs.pending' },
  { key: 'pago_parcial', labelKey: 'pedidos.tabs.partial' },
  { key: 'pago_total', labelKey: 'pedidos.tabs.paid' },
  { key: 'entregue', labelKey: 'pedidos.tabs.delivered' },
];

function PedidoCard({ item }: { item: Pedido }) {
  const router = useRouter();
  const date = item.data_entrega
    ? new Date(item.data_entrega).toLocaleDateString('pt-BR')
    : item.criado_em
    ? new Date(item.criado_em).toLocaleDateString('pt-BR')
    : '—';

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl mx-4 mb-3 p-4 shadow-sm"
      onPress={() => router.push(`/(app)/pedidos/${item.id}`)}
    >
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-gray-900 font-semibold flex-1 mr-2" numberOfLines={1}>
          {item.cliente_nome}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-gray-400 text-sm">#{item.id.slice(-6).toUpperCase()}</Text>
        <View className="flex-row items-center gap-3">
          <Text className="text-gray-400 text-xs">{date}</Text>
          {item.valor_total != null && (
            <Text className="text-gray-700 font-semibold text-sm">
              {item.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PedidosScreen() {
  const { pedidos, loading, fetchPedidos } = usePedidos();
  const { theme } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('todos');

  useFocusEffect(useCallback(() => {
    fetchPedidos(activeTab !== 'todos' ? activeTab as StatusPedido : undefined);
  }, [activeTab, fetchPedidos]));

  if (loading && pedidos.length === 0) return <LoadingScreen />;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScreenHeader
        title={t('pedidos.title')}
        subtitle={t('pedidos.subtitle', { count: pedidos.length })}
        right={
          <TouchableOpacity
            onPress={() => router.push('/(app)/pedidos/novo')}
            className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </TouchableOpacity>
        }
      />

      {/* Status Tabs */}
      <View className="bg-white border-b border-gray-100">
        <FlatList
          data={TAB_KEYS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={tp => tp.key}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              onPress={() => setActiveTab(tab.key)}
              className="px-4 py-2 rounded-full mr-2"
              style={{
                backgroundColor: activeTab === tab.key ? theme.primary : '#F3F4F6',
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: activeTab === tab.key ? '#fff' : '#6B7280' }}
              >
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={pedidos}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState emoji="📋" title={t('pedidos.empty')} subtitle={t('pedidos.emptySub')} />
        }
        renderItem={({ item }) => <PedidoCard item={item} />}
      />
    </SafeAreaView>
  );
}

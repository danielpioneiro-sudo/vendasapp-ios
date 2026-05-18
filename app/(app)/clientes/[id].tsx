import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '@/components/LoadingScreen';
import { StatusBadge } from '@/components/StatusBadge';
import { useClientes, Cliente } from '@/hooks/useClientes';
import { usePedidos, Pedido } from '@/hooks/usePedidos';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row py-2 border-b border-gray-50">
      <Text className="text-gray-400 text-sm w-28">{label}</Text>
      <Text className="text-gray-800 text-sm flex-1">{value}</Text>
    </View>
  );
}

export default function ClienteDetailScreen() {
  const { theme } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCliente } = useClientes();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [c, { data }] = await Promise.all([
        getCliente(id),
        supabase.from('pedidos').select('id,cliente_nome,status,valor_total,criado_em')
          .eq('cliente_id', id).order('criado_em', { ascending: false }).limit(10),
      ]);
      setCliente(c);
      setPedidos((data as Pedido[]) ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <LoadingScreen />;
  if (!cliente) return (
    <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
      <Text className="text-gray-500">{t('clientes.notFound')}</Text>
    </SafeAreaView>
  );

  const initials = cliente.nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const enderecoCompleto = [cliente.rua, cliente.bairro, cliente.cidade].filter(Boolean).join(', ') || null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View style={{ backgroundColor: theme.primary }} className="px-6 pt-14 pb-6">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-white text-2xl">‹</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold flex-1" numberOfLines={1}>
            {t('clientes.detail')}
          </Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/clientes/novo', params: { id: cliente.id } })}>
            <Text className="text-white/80 text-sm">{t('common.edit')}</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center">
          <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center mr-4">
            <Text className="text-white text-xl font-bold">{initials}</Text>
          </View>
          <View>
            <Text className="text-white text-lg font-bold">{cliente.nome}</Text>
            {cliente.telefone && <Text className="text-white/80">{cliente.telefone}</Text>}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Info */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <InfoRow label="E-mail" value={cliente.email} />
          <InfoRow label={cliente.tipo_documento?.toUpperCase() ?? 'CPF'} value={cliente.cpf} />
          <InfoRow label={t('clientes.form.birthDate')} value={cliente.data_nascimento} />
          <InfoRow label={t('clientes.form.address')} value={enderecoCompleto} />
          {cliente.observacoes && (
            <View className="pt-2">
              <Text className="text-gray-400 text-sm">{t('clientes.form.notes')}</Text>
              <Text className="text-gray-800 text-sm mt-1">{cliente.observacoes}</Text>
            </View>
          )}
        </View>

        {/* Ação rápida */}
        <TouchableOpacity
          className="rounded-2xl py-4 items-center mb-4 shadow-sm"
          style={{ backgroundColor: theme.primary }}
          onPress={() => router.push({ pathname: '/(app)/pedidos/novo', params: { clienteId: cliente.id, clienteNome: cliente.nome } })}
        >
          <Text className="text-white font-semibold">{t('clientes.newOrder')}</Text>
        </TouchableOpacity>

        {/* Pedidos recentes */}
        <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">{t('clientes.recentOrders')}</Text>
        {pedidos.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center shadow-sm">
            <Text className="text-gray-400 text-sm">{t('clientes.noOrders')}</Text>
          </View>
        ) : (
          pedidos.map(p => (
            <TouchableOpacity
              key={p.id}
              className="bg-white rounded-2xl px-4 py-3 mb-3 flex-row items-center shadow-sm"
              onPress={() => router.push(`/(app)/pedidos/${p.id}`)}
            >
              <View className="flex-1">
                <Text className="text-gray-900 font-medium text-sm">
                  {t('clientes.order', { num: p.id.slice(-6).toUpperCase() })}
                </Text>
                {p.valor_total != null && (
                  <Text className="text-gray-500 text-xs">
                    {p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                )}
              </View>
              <StatusBadge status={p.status} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useClientes, Cliente } from '@/hooks/useClientes';
import { useAuth } from '@/lib/auth';

function ClienteCard({ item }: { item: Cliente }) {
  const { theme } = useAuth();
  const router = useRouter();
  const initials = item.nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl mx-4 mb-3 p-4 flex-row items-center shadow-sm"
      onPress={() => router.push(`/(app)/clientes/${item.id}`)}
    >
      <View
        className="w-11 h-11 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: theme.primaryLight }}
      >
        <Text className="font-bold text-sm" style={{ color: theme.primaryDark }}>{initials}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-semibold">{item.nome}</Text>
        {item.telefone ? <Text className="text-gray-400 text-sm">{item.telefone}</Text> : null}
        {item.cidade ? <Text className="text-gray-400 text-xs">{item.cidade}</Text> : null}
      </View>
      <Text className="text-gray-300 text-xl">›</Text>
    </TouchableOpacity>
  );
}

export default function ClientesScreen() {
  const { clientes, loading, fetchClientes } = useClientes();
  const { theme } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');

  useFocusEffect(useCallback(() => { fetchClientes(); }, [fetchClientes]));

  function handleSearch(text: string) {
    setSearch(text);
    fetchClientes(text || undefined);
  }

  if (loading && clientes.length === 0) return <LoadingScreen />;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScreenHeader
        title={t('clientes.title')}
        subtitle={t('clientes.subtitle', { count: clientes.length })}
        right={
          <TouchableOpacity
            onPress={() => router.push('/(app)/clientes/novo')}
            className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View className="px-4 pt-3 pb-2">
        <View className="bg-white rounded-xl flex-row items-center px-3 border border-gray-200">
          <Text className="text-gray-400 mr-2">🔍</Text>
          <TextInput
            className="flex-1 py-3 text-gray-900 text-base"
            placeholder={t('clientes.searchPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text className="text-gray-400 text-base">✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={clientes}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={
          search
            ? <EmptyState emoji="🔍" title={t('clientes.emptySearch')} subtitle={t('clientes.emptySearchSub', { query: search })} />
            : <EmptyState emoji="👥" title={t('clientes.empty')} subtitle={t('clientes.emptySub')} />
        }
        renderItem={({ item }) => <ClienteCard item={item} />}
      />
    </SafeAreaView>
  );
}

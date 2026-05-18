import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useMateriais, Material } from '@/hooks/useMateriais';
import { useAuth } from '@/lib/auth';

function MaterialCard({ item, onDelete }: { item: Material; onDelete: () => void }) {
  const { theme } = useAuth();
  const { t } = useTranslation();
  return (
    <View className="bg-white rounded-2xl mx-4 mb-3 p-4 flex-row items-center shadow-sm">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: theme.primaryLight }}
      >
        <Text style={{ fontSize: 20 }}>📦</Text>
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-semibold">{item.nome}</Text>
        {item.descricao ? <Text className="text-gray-400 text-xs">{item.descricao}</Text> : null}
        <View className="flex-row items-center mt-1 gap-2">
          <Text className="text-gray-500 text-xs">{item.unidade}</Text>
          {item.preco != null && (
            <Text className="text-green-600 text-xs font-semibold">
              {item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() =>
          Alert.alert(t('materiais.deleteTitle'), t('materiais.deleteConfirm', { name: item.nome }), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.remove'), style: 'destructive', onPress: onDelete },
          ])
        }
        className="p-2"
      >
        <Text className="text-red-400 text-lg">🗑</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MateriaisScreen() {
  const { materiais, loading, fetchMateriais, createMaterial, deleteMaterial } = useMateriais();
  const { theme } = useAuth();
  const { t } = useTranslation();

  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('un');
  const [preco, setPreco] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useFocusEffect(useCallback(() => { fetchMateriais(); }, [fetchMateriais]));

  function openModal() {
    setNome(''); setDescricao(''); setUnidade('un'); setPreco(''); setErrors({});
    setShowModal(true);
  }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = t('common.required');
    if (!unidade.trim()) e.unidade = t('common.required');
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    const precoNum = preco ? parseFloat(preco.replace(',', '.')) : null;
    const { error } = await createMaterial({
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      unidade: unidade.trim(),
      preco: isNaN(precoNum as number) ? null : precoNum,
    });
    setSaving(false);
    if (error) { Alert.alert(t('common.error'), error); return; }
    setShowModal(false);
    fetchMateriais();
  }

  async function handleDelete(id: string) {
    const { error } = await deleteMaterial(id);
    if (error) Alert.alert(t('common.error'), error);
    else fetchMateriais();
  }

  if (loading && materiais.length === 0) return <LoadingScreen />;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScreenHeader
        title={t('materiais.title')}
        subtitle={t('materiais.subtitle', { count: materiais.length })}
        right={
          <TouchableOpacity
            onPress={openModal}
            className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={materiais}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState emoji="📦" title={t('materiais.empty')} subtitle={t('materiais.emptySub')} />
        }
        renderItem={({ item }) => (
          <MaterialCard item={item} onDelete={() => handleDelete(item.id)} />
        )}
      />

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <SafeAreaView className="flex-1 bg-gray-50">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <Text className="text-lg font-bold text-gray-900">{t('materiais.newProduct')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text className="text-gray-400 text-base">{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <AuthInput label={t('materiais.productName')} value={nome} onChangeText={setNome}
                placeholder="Ex: Banner 1m x 2m" autoCapitalize="words" error={errors.nome} />
              <AuthInput label={t('materiais.description')} value={descricao} onChangeText={setDescricao}
                placeholder="Detalhes extras..." autoCapitalize="sentences" />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AuthInput label={t('materiais.unit')} value={unidade} onChangeText={setUnidade}
                    placeholder="un, m², kg..." error={errors.unidade} />
                </View>
                <View className="flex-1">
                  <AuthInput label={t('materiais.price')} value={preco} onChangeText={setPreco}
                    placeholder="0,00" keyboardType="decimal-pad" />
                </View>
              </View>

              <PrimaryButton title={t('materiais.saveBtn')} loading={saving} onPress={handleSave}
                color={theme.primary} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

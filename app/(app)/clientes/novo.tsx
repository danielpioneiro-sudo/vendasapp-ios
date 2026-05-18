import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useClientes } from '@/hooks/useClientes';
import { useAuth } from '@/lib/auth';

export default function NovoClienteScreen() {
  const { theme } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(params.id);

  const { createCliente, updateCliente, getCliente } = useClientes();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [tipoDoc, setTipoDoc] = useState<'cpf' | 'cnpj'>('cpf');

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [rua, setRua] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEdit || !params.id) return;
    getCliente(params.id).then(c => {
      if (!c) { router.back(); return; }
      setNome(c.nome ?? '');
      setTelefone(c.telefone ?? '');
      setEmail(c.email ?? '');
      setTipoDoc(c.tipo_documento ?? 'cpf');
      setCpf(c.cpf ?? '');
      setDataNascimento(c.data_nascimento ?? '');
      setRua(c.rua ?? '');
      setBairro(c.bairro ?? '');
      setCidade(c.cidade ?? '');
      setObservacoes(c.observacoes ?? '');
      setLoading(false);
    });
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = t('common.required');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const fields = {
      nome: nome.trim(),
      telefone: telefone.trim() || null,
      email: email.trim() || null,
      tipo_documento: tipoDoc,
      cpf: cpf.trim() || null,
      data_nascimento: dataNascimento.trim() || null,
      rua: rua.trim() || null,
      bairro: bairro.trim() || null,
      cidade: cidade.trim() || null,
      observacoes: observacoes.trim() || null,
    };

    const { error } = isEdit && params.id
      ? await updateCliente(params.id, fields)
      : await createCliente(fields);

    setSaving(false);
    if (error) { Alert.alert(t('common.error'), error); return; }
    router.back();
  }

  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* Header */}
        <View style={{ backgroundColor: theme.primary }} className="px-6 pt-14 pb-5 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-white text-2xl">‹</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">
            {isEdit ? t('clientes.form.titleEdit') : t('clientes.form.titleNew')}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
          {/* Dados básicos */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">
            {t('clientes.form.basicData')}
          </Text>
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <AuthInput label={t('clientes.form.fullName')} value={nome} onChangeText={setNome}
              placeholder="João da Silva" autoCapitalize="words" error={errors.nome} />
            <AuthInput label={t('clientes.form.phone')} value={telefone} onChangeText={setTelefone}
              placeholder="(65) 99999-9999" keyboardType="phone-pad" />
            <AuthInput label={t('clientes.form.email')} value={email} onChangeText={setEmail}
              placeholder="joao@email.com" keyboardType="email-address" />
          </View>

          {/* Documento */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">
            {t('clientes.form.document')}
          </Text>
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row mb-3">
              {(['cpf', 'cnpj'] as const).map(tp => (
                <TouchableOpacity
                  key={tp}
                  onPress={() => setTipoDoc(tp)}
                  className="flex-1 py-2 rounded-lg items-center mr-2"
                  style={{ backgroundColor: tipoDoc === tp ? theme.primary : '#F3F4F6' }}
                >
                  <Text className="font-semibold text-sm" style={{ color: tipoDoc === tp ? '#fff' : '#374151' }}>
                    {tp.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <AuthInput label={tipoDoc === 'cpf' ? 'CPF' : 'CNPJ'} value={cpf} onChangeText={setCpf}
              placeholder={tipoDoc === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
              keyboardType="numeric" />
            {tipoDoc === 'cpf' && (
              <AuthInput label={t('clientes.form.birthDate')} value={dataNascimento} onChangeText={setDataNascimento}
                placeholder="DD/MM/AAAA" keyboardType="numeric" />
            )}
          </View>

          {/* Endereço */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">
            {t('clientes.form.address')}
          </Text>
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <AuthInput label={t('clientes.form.street')} value={rua} onChangeText={setRua}
              placeholder="Rua das Flores, 123" autoCapitalize="words" />
            <AuthInput label={t('clientes.form.neighborhood')} value={bairro} onChangeText={setBairro}
              placeholder="Centro" autoCapitalize="words" />
            <AuthInput label={t('clientes.form.city')} value={cidade} onChangeText={setCidade}
              placeholder="Cuiabá" autoCapitalize="words" />
          </View>

          {/* Observações */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">
            {t('clientes.form.notes')}
          </Text>
          <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
            <AuthInput label={t('clientes.form.notes')} value={observacoes} onChangeText={setObservacoes}
              placeholder={t('clientes.form.notesPlaceholder')} autoCapitalize="sentences"
              multiline numberOfLines={3} />
          </View>

          <PrimaryButton
            title={isEdit ? t('clientes.form.saveEdit') : t('clientes.form.saveNew')}
            loading={saving}
            onPress={handleSave}
            color={theme.primary}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

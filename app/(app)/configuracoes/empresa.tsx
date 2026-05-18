import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function EmpresaScreen() {
  const { company, theme, refreshCompany } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    setNome(company.name ?? '');
    setCnpj(company.cnpj ?? '');
    setEndereco((company as any).endereco ?? '');
    setTelefone((company as any).telefone ?? '');
    setEmail((company as any).email_empresa ?? '');
    setLogoUri(company.logo_url ?? null);
  }, [company]);

  async function pickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso à galeria nas configurações do iOS.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    await uploadLogo(result.assets[0].uri);
  }

  async function uploadLogo(uri: string) {
    if (!company) return;
    setUploadingLogo(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${company.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) {
        Alert.alert('Erro no upload', uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', company.id);

      if (updateError) {
        Alert.alert('Erro ao salvar logo', updateError.message);
        return;
      }

      setLogoUri(publicUrl);
      await refreshCompany();
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    if (!company) return;
    Alert.alert('Remover logo', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          await supabase.from('companies').update({ logo_url: null }).eq('id', company.id);
          setLogoUri(null);
          await refreshCompany();
        },
      },
    ]);
  }

  async function handleSave() {
    if (!nome.trim()) { Alert.alert('Nome obrigatório'); return; }
    if (!company) return;
    setSaving(true);
    const { error } = await supabase.from('companies').update({
      name: nome.trim(),
      cnpj: cnpj.trim() || null,
      endereco: endereco.trim() || null,
      telefone: telefone.trim() || null,
      email_empresa: email.trim() || null,
    }).eq('id', company.id);
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    await refreshCompany();
    Alert.alert('Salvo!', 'Dados da empresa atualizados.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* Header */}
        <View style={{ backgroundColor: theme.primary }} className="px-6 pt-14 pb-5 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-white text-2xl">‹</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Dados da empresa</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">Logo</Text>
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm items-center">
            {uploadingLogo ? (
              <View className="w-28 h-28 rounded-2xl bg-gray-100 items-center justify-center mb-4">
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : logoUri ? (
              <Image
                source={{ uri: logoUri }}
                className="w-28 h-28 rounded-2xl mb-4"
                resizeMode="contain"
              />
            ) : (
              <View
                className="w-28 h-28 rounded-2xl items-center justify-center mb-4"
                style={{ backgroundColor: theme.primaryLight }}
              >
                <Text style={{ fontSize: 48 }}>🏢</Text>
              </View>
            )}
            <View className="flex-row" style={{ gap: 10 }}>
              <TouchableOpacity
                className="flex-1 rounded-xl py-2.5 items-center"
                style={{ backgroundColor: theme.primary }}
                onPress={pickLogo}
                disabled={uploadingLogo}
              >
                <Text className="text-white font-semibold text-sm">
                  {logoUri ? 'Trocar logo' : 'Adicionar logo'}
                </Text>
              </TouchableOpacity>
              {logoUri && (
                <TouchableOpacity
                  className="rounded-xl py-2.5 px-4 items-center bg-red-50 border border-red-200"
                  onPress={removeLogo}
                >
                  <Text className="text-red-600 font-semibold text-sm">Remover</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-gray-400 text-xs mt-3 text-center">
              Imagem quadrada recomendada. Exibida no cabeçalho do app e nos contratos.
            </Text>
          </View>

          {/* Dados */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">Informações</Text>
          <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
            <AuthInput
              label="Nome da empresa *"
              value={nome}
              onChangeText={setNome}
              placeholder="Minha Empresa Ltda"
              autoCapitalize="words"
            />
            <AuthInput
              label="CNPJ / CPF"
              value={cnpj}
              onChangeText={setCnpj}
              placeholder="00.000.000/0001-00 ou 000.000.000-00"
              keyboardType="default"
            />
            <AuthInput
              label="Endereço"
              value={endereco}
              onChangeText={setEndereco}
              placeholder="Rua, número, cidade..."
              autoCapitalize="words"
            />
            <AuthInput
              label="Telefone / WhatsApp"
              value={telefone}
              onChangeText={setTelefone}
              placeholder="(65) 99999-9999"
              keyboardType="phone-pad"
            />
            <AuthInput
              label="E-mail da empresa"
              value={email}
              onChangeText={setEmail}
              placeholder="contato@empresa.com"
              keyboardType="email-address"
            />
          </View>

          <PrimaryButton title="Salvar dados" loading={saving} onPress={handleSave} color={theme.primary} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

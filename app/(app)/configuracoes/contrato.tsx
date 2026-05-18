import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  TEMPLATE_PADRAO,
  VARIAVEIS_DISPONIVEIS,
  resolveVariaveis,
  buildVariaveis,
  buildContratoHtml,
} from '@/lib/contrato';

type TabKey = 'editor' | 'preview';

export default function ContratoScreen() {
  const { company, member, theme } = useAuth();
  const router = useRouter();

  const [template, setTemplate] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('editor');
  const [showVars, setShowVars] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [cursorPos, setCursorPos] = useState(0);

  useEffect(() => {
    if (!company) return;
    setTemplate(company.contract_template || TEMPLATE_PADRAO);
  }, [company]);

  async function handleSave() {
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from('companies')
      .update({ contract_template: template })
      .eq('id', company.id);
    setSaving(false);
    if (error) Alert.alert('Erro', error.message);
    else Alert.alert('Salvo!', 'Modelo de contrato atualizado.');
  }

  function insertVariable(chave: string) {
    const before = template.slice(0, cursorPos);
    const after = template.slice(cursorPos);
    const newText = before + chave + after;
    setTemplate(newText);
    setCursorPos(cursorPos + chave.length);
    setShowVars(false);
  }

  async function handleGeneratePdf(sample = false) {
    if (!company) return;
    setGeneratingPdf(true);
    try {
      const vars = buildVariaveis(company, member, sample ? undefined : undefined);
      const resolvido = resolveVariaveis(template, vars);
      const html = buildContratoHtml(resolvido, company, company.logo_url);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar contrato',
        UTI: 'com.adobe.pdf',
      });
    } catch (e: any) {
      Alert.alert('Erro ao gerar PDF', e.message);
    } finally {
      setGeneratingPdf(false);
    }
  }

  const previewText = company
    ? resolveVariaveis(template, buildVariaveis(company, member))
    : template;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* Header */}
        <View style={{ backgroundColor: theme.primary }} className="px-6 pt-14 pb-4">
          <View className="flex-row items-center mb-3">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Text className="text-white text-2xl">‹</Text>
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold flex-1">Modelo de contrato</Text>
          </View>
          {/* Tabs */}
          <View className="flex-row bg-white/20 rounded-xl p-1">
            {(['editor', 'preview'] as TabKey[]).map(tab => (
              <TouchableOpacity
                key={tab}
                className="flex-1 py-2 rounded-lg items-center"
                style={{ backgroundColor: activeTab === tab ? 'white' : 'transparent' }}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  className="text-sm font-semibold capitalize"
                  style={{ color: activeTab === tab ? theme.primary : 'rgba(255,255,255,0.8)' }}
                >
                  {tab === 'editor' ? '✏️ Editor' : '👁 Preview'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {activeTab === 'editor' ? (
          <View className="flex-1">
            {/* Toolbar */}
            <View className="bg-white border-b border-gray-100 px-4 py-2 flex-row items-center justify-between">
              <TouchableOpacity
                className="flex-row items-center px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: theme.primaryLight }}
                onPress={() => setShowVars(true)}
              >
                <Text style={{ color: theme.primaryDark }} className="text-sm font-semibold">
                  {'{ }'} Inserir variável
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Restaurar padrão',
                    'Substituir o texto atual pelo modelo padrão?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Restaurar', style: 'destructive', onPress: () => setTemplate(TEMPLATE_PADRAO) },
                    ]
                  );
                }}
              >
                <Text className="text-gray-400 text-sm">Restaurar padrão</Text>
              </TouchableOpacity>
            </View>

            {/* Text editor */}
            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
              <TextInput
                ref={inputRef}
                value={template}
                onChangeText={setTemplate}
                onSelectionChange={e => setCursorPos(e.nativeEvent.selection.start)}
                multiline
                autoCapitalize="sentences"
                placeholder="Digite o texto do contrato..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 p-4 text-gray-800 text-sm leading-6"
                style={{ minHeight: 400, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
              />
            </ScrollView>

            {/* Footer actions */}
            <View className="px-4 py-3 bg-white border-t border-gray-100" style={{ gap: 10 }}>
              <PrimaryButton
                title="Salvar modelo"
                loading={saving}
                onPress={handleSave}
                color={theme.primary}
              />
              <TouchableOpacity
                className="border rounded-xl py-3 items-center"
                style={{ borderColor: theme.primary }}
                onPress={() => handleGeneratePdf(true)}
                disabled={generatingPdf}
              >
                <Text style={{ color: theme.primary }} className="font-semibold">
                  {generatingPdf ? 'Gerando PDF...' : '📄 Gerar PDF de exemplo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Preview */
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              {/* Cabeçalho simulado */}
              <View className="items-center border-b border-gray-200 pb-4 mb-4">
                <Text className="text-base font-bold text-gray-900">{company?.name}</Text>
                <Text className="text-xs text-gray-400 uppercase tracking-wide mt-1">
                  Contrato / Pedido de Serviço
                </Text>
              </View>
              {/* Corpo */}
              <Text className="text-gray-700 text-sm leading-6">{previewText}</Text>
              {/* Assinaturas simuladas */}
              <View className="flex-row mt-10" style={{ gap: 24 }}>
                {['Assinatura do cliente', 'Responsável'].map(label => (
                  <View key={label} className="flex-1 items-center">
                    <View className="border-t border-gray-400 w-full mb-1" />
                    <Text className="text-xs text-gray-400">{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              className="rounded-xl py-4 items-center"
              style={{ backgroundColor: theme.primary }}
              onPress={() => handleGeneratePdf(true)}
              disabled={generatingPdf}
            >
              <Text className="text-white font-semibold">
                {generatingPdf ? 'Gerando...' : '📄 Exportar como PDF'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Variáveis Modal */}
      <Modal visible={showVars} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <Text className="text-lg font-bold text-gray-900">Variáveis disponíveis</Text>
            <TouchableOpacity onPress={() => setShowVars(false)}>
              <Text className="text-gray-400">Fechar</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-gray-500 text-sm px-4 pt-3 pb-1">
            Toque para inserir no cursor atual do editor.
          </Text>
          <FlatList
            data={VARIAVEIS_DISPONIVEIS}
            keyExtractor={i => i.chave}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="bg-white rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between shadow-sm"
                onPress={() => insertVariable(item.chave)}
              >
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs mb-0.5">{item.descricao}</Text>
                  <Text
                    className="text-sm font-semibold font-mono"
                    style={{ color: theme.primaryDark }}
                  >
                    {item.chave}
                  </Text>
                </View>
                <Text style={{ color: theme.primary }} className="text-lg ml-2">+</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

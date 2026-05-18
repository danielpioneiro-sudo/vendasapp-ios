import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, FlatList,
  KeyboardAvoidingView, Platform, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SignaturePad } from '@/components/SignaturePad';
import { useClientes, Cliente } from '@/hooks/useClientes';
import { useMateriais, Material } from '@/hooks/useMateriais';
import { usePedidos, ProdutoPedido } from '@/hooks/usePedidos';
import { useAuth } from '@/lib/auth';

const CONDICOES = ['À vista', '30 dias', '30/60 dias', '30/60/90 dias', 'A combinar'];
const METODOS = ['Dinheiro', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Cheque'];

type ItemPedido = ProdutoPedido & { material_id: string; lineId: string };

export default function NovoPedidoScreen() {
  const { theme, member } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ clienteId?: string; clienteNome?: string }>();
  const { fetchClientes, clientes } = useClientes();
  const { materiais, fetchMateriais } = useMateriais();
  const { createPedido } = usePedidos();

  // Cliente
  const [clienteId, setClienteId] = useState(params.clienteId ?? '');
  const [clienteNome, setClienteNome] = useState(params.clienteNome ?? '');
  const [clienteSearch, setClienteSearch] = useState(params.clienteNome ?? '');
  const [showClientePicker, setShowClientePicker] = useState(false);

  // Produtos
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [qtyInput, setQtyInput] = useState<Record<string, string>>({});

  // Entrega
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [nomeContato, setNomeContato] = useState('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [horarioEntrega, setHorarioEntrega] = useState('');

  // Pagamento
  const [condicao, setCondicao] = useState('');
  const [metodo, setMetodo] = useState('');
  const [valorTotalManual, setValorTotalManual] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Assinaturas
  const [assinaturaVendedor, setAssinaturaVendedor] = useState('');
  const [assinaturaCliente, setAssinaturaCliente] = useState('');
  const [drawing, setDrawing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const valorCalculado = itens.reduce((s, i) => s + i.subtotal, 0);
  const valorFinal = parseFloat(valorTotalManual.replace(',', '.')) || valorCalculado;

  useEffect(() => {
    fetchMateriais();
    fetchClientes();
  }, []);

  function addMaterial(m: Material) {
    const lineId = `${m.id}_${Date.now()}`;
    const item: ItemPedido = {
      lineId,
      material_id: m.id,
      nome: m.nome,
      quantidade: 1,
      unidade: m.unidade,
      preco_unit: m.preco ?? 0,
      subtotal: m.preco ?? 0,
    };
    setItens(prev => [...prev, item]);
    setQtyInput(prev => ({ ...prev, [lineId]: '1' }));
    setShowMaterialPicker(false);
  }

  function updateQty(lineId: string, qty: string) {
    setQtyInput(prev => ({ ...prev, [lineId]: qty }));
    const n = parseFloat(qty.replace(',', '.')) || 0;
    setItens(prev => prev.map(i =>
      i.lineId === lineId
        ? { ...i, quantidade: n, subtotal: +(n * i.preco_unit).toFixed(2) }
        : i
    ));
  }

  function removeItem(lineId: string) {
    setItens(prev => prev.filter(i => i.lineId !== lineId));
  }

  function selectCliente(c: Cliente) {
    setClienteId(c.id);
    setClienteNome(c.nome);
    setClienteSearch(c.nome);
    const end = [c.rua, c.bairro, c.cidade].filter(Boolean).join(', ');
    if (end && !enderecoEntrega) setEnderecoEntrega(end);
    if (c.telefone && !telefoneContato) setTelefoneContato(c.telefone);
    setShowClientePicker(false);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!clienteNome.trim()) e.cliente = 'Informe o cliente';
    if (itens.length === 0) e.itens = 'Adicione ao menos um produto';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    const formaPagamento = [condicao, metodo].filter(Boolean).join(' — ') || null;
    const { error } = await createPedido({
      cliente_id: clienteId || null,
      cliente_nome: clienteNome.trim(),
      endereco_entrega: enderecoEntrega.trim() || null,
      nome_contato: nomeContato.trim() || null,
      telefone_contato: telefoneContato.trim() || null,
      data_entrega: dataEntrega.trim() || null,
      horario_entrega: horarioEntrega.trim() || null,
      forma_condicao: condicao || null,
      forma_metodo: metodo || null,
      forma_pagamento: formaPagamento,
      valor_total: valorFinal || null,
      produtos: itens.map(({ lineId, ...item }) => item),
      observacoes: observacoes.trim() || null,
      assinatura_vendedor: assinaturaVendedor || null,
      assinatura_cliente: assinaturaCliente || null,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error); return; }
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* Header */}
        <View style={{ backgroundColor: theme.primary }} className="px-6 pt-14 pb-5 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Text className="text-white text-2xl">‹</Text>
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Novo pedido</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"
          scrollEnabled={!drawing}>

          {/* ── CLIENTE ── */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-2">Cliente</Text>
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <TouchableOpacity
              className="border rounded-xl px-4 py-3 flex-row items-center justify-between"
              style={{ borderColor: errors.cliente ? '#EF4444' : '#D1D5DB' }}
              onPress={() => setShowClientePicker(true)}
            >
              <Text className={clienteNome ? 'text-gray-900' : 'text-gray-400'}>
                {clienteNome || 'Selecionar cliente...'}
              </Text>
              <Text className="text-gray-400">›</Text>
            </TouchableOpacity>
            {errors.cliente ? <Text className="text-red-500 text-xs mt-1">{errors.cliente}</Text> : null}
          </View>

          {/* ── PRODUTOS ── */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-2">Produtos</Text>
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            {itens.map(item => (
              <View key={item.lineId} className="flex-row items-center mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-800 font-medium text-sm" numberOfLines={1}>{item.nome}</Text>
                  <Text className="text-gray-400 text-xs">
                    {item.preco_unit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {item.unidade}
                  </Text>
                </View>
                <TextInput
                  className="border border-gray-200 rounded-lg px-2 py-1 w-16 text-center text-gray-900"
                  value={qtyInput[item.lineId] ?? '1'}
                  onChangeText={v => updateQty(item.lineId, v)}
                  keyboardType="decimal-pad"
                />
                <Text className="text-gray-700 font-semibold text-sm w-20 text-right">
                  {item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
                <TouchableOpacity onPress={() => removeItem(item.lineId)} className="ml-2 p-1">
                  <Text className="text-red-400">✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {errors.itens ? <Text className="text-red-500 text-xs mb-2">{errors.itens}</Text> : null}

            <TouchableOpacity
              className="border border-dashed rounded-xl py-3 items-center"
              style={{ borderColor: theme.primary }}
              onPress={() => setShowMaterialPicker(true)}
            >
              <Text style={{ color: theme.primary }} className="font-semibold text-sm">+ Adicionar produto</Text>
            </TouchableOpacity>

            {valorCalculado > 0 && (
              <View className="mt-3 pt-3 border-t border-gray-100 flex-row justify-between">
                <Text className="text-gray-500 font-medium">Subtotal calculado</Text>
                <Text className="text-gray-900 font-bold">
                  {valorCalculado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            )}
          </View>

          {/* ── PAGAMENTO ── */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-2">Pagamento</Text>
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <Text className="text-sm font-medium text-gray-700 mb-2">Condição</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {CONDICOES.map(c => (
                <TouchableOpacity key={c} onPress={() => setCondicao(c === condicao ? '' : c)}
                  className="px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: condicao === c ? theme.primary : '#F9FAFB',
                    borderColor: condicao === c ? theme.primary : '#E5E7EB',
                  }}>
                  <Text className="text-xs font-medium" style={{ color: condicao === c ? '#fff' : '#374151' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Método</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {METODOS.map(m => (
                <TouchableOpacity key={m} onPress={() => setMetodo(m === metodo ? '' : m)}
                  className="px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: metodo === m ? theme.primary : '#F9FAFB',
                    borderColor: metodo === m ? theme.primary : '#E5E7EB',
                  }}>
                  <Text className="text-xs font-medium" style={{ color: metodo === m ? '#fff' : '#374151' }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <AuthInput label="Valor total (R$)" value={valorTotalManual}
              onChangeText={setValorTotalManual}
              placeholder={valorCalculado > 0
                ? valorCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                : '0,00'}
              keyboardType="decimal-pad" />
          </View>

          {/* ── ENTREGA ── */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-2">Entrega</Text>
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <AuthInput label="Endereço de entrega" value={enderecoEntrega} onChangeText={setEnderecoEntrega}
              placeholder="Rua, número, bairro..." autoCapitalize="words" />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <AuthInput label="Nome do contato" value={nomeContato} onChangeText={setNomeContato}
                  placeholder="Nome" autoCapitalize="words" />
              </View>
              <View className="flex-1">
                <AuthInput label="Telefone" value={telefoneContato} onChangeText={setTelefoneContato}
                  placeholder="(65) 99999-9999" keyboardType="phone-pad" />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <AuthInput label="Data de entrega" value={dataEntrega} onChangeText={setDataEntrega}
                  placeholder="DD/MM/AAAA" keyboardType="numeric" />
              </View>
              <View className="flex-1">
                <AuthInput label="Horário" value={horarioEntrega} onChangeText={setHorarioEntrega}
                  placeholder="HH:MM" keyboardType="numeric" />
              </View>
            </View>
          </View>

          {/* ── OBSERVAÇÕES ── */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-2">Observações</Text>
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <AuthInput label="Observações do pedido" value={observacoes} onChangeText={setObservacoes}
              placeholder="Instruções especiais, detalhes do layout..." autoCapitalize="sentences"
              multiline numberOfLines={3} />
          </View>

          {/* ── ASSINATURAS ── */}
          <Text className="text-xs font-semibold text-gray-400 uppercase mb-2">Assinaturas</Text>
          <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm gap-4">
            <SignaturePad
              label={`Assinatura do vendedor${member?.name ? ' (' + member.name + ')' : ''}`}
              onSave={setAssinaturaVendedor}
              onClear={() => setAssinaturaVendedor('')}
              onDrawStart={() => setDrawing(true)}
              onDrawEnd={() => setDrawing(false)}
            />
            <View className="h-px bg-gray-100" />
            <SignaturePad
              label="Assinatura do cliente"
              onSave={setAssinaturaCliente}
              onClear={() => setAssinaturaCliente('')}
              onDrawStart={() => setDrawing(true)}
              onDrawEnd={() => setDrawing(false)}
            />
          </View>

          <PrimaryButton title="Criar pedido" loading={saving} onPress={handleSave} color={theme.primary} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Cliente Picker Modal */}
      <Modal visible={showClientePicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <Text className="text-lg font-bold text-gray-900">Selecionar cliente</Text>
            <TouchableOpacity onPress={() => setShowClientePicker(false)}>
              <Text className="text-gray-400">Fechar</Text>
            </TouchableOpacity>
          </View>
          <View className="px-4 pt-3 pb-2">
            <View className="bg-white rounded-xl flex-row items-center px-3 border border-gray-200">
              <Text className="text-gray-400 mr-2">🔍</Text>
              <TextInput className="flex-1 py-3 text-gray-900" placeholder="Buscar cliente..."
                placeholderTextColor="#9CA3AF"
                value={clienteSearch}
                onChangeText={t => { setClienteSearch(t); fetchClientes(t); }}
              />
            </View>
          </View>
          <FlatList
            data={clientes}
            keyExtractor={i => i.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="bg-white rounded-xl px-4 py-3 mb-2 flex-row items-center"
                onPress={() => selectCliente(item)}
              >
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">{item.nome}</Text>
                  {item.telefone && <Text className="text-gray-400 text-sm">{item.telefone}</Text>}
                </View>
                <Text className="text-gray-300">›</Text>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <TouchableOpacity
                className="rounded-xl py-3 items-center mt-2"
                style={{ borderWidth: 1, borderColor: theme.primary, borderStyle: 'dashed' }}
                onPress={() => {
                  setClienteNome(clienteSearch);
                  setClienteId('');
                  setShowClientePicker(false);
                }}
              >
                <Text style={{ color: theme.primary }} className="font-medium text-sm">
                  Usar "{clienteSearch}" sem cadastro
                </Text>
              </TouchableOpacity>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Material Picker Modal */}
      <Modal visible={showMaterialPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <Text className="text-lg font-bold text-gray-900">Adicionar produto</Text>
            <TouchableOpacity onPress={() => setShowMaterialPicker(false)}>
              <Text className="text-gray-400">Fechar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={materiais}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <View className="items-center py-8">
                <Text className="text-gray-400">Nenhum produto cadastrado</Text>
              </View>
            }
            renderItem={({ item: m }) => (
              <TouchableOpacity
                className="bg-white rounded-xl px-4 py-3 mb-2 flex-row items-center"
                onPress={() => addMaterial(m)}
              >
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">{m.nome}</Text>
                  <Text className="text-gray-400 text-sm">{m.unidade}</Text>
                </View>
                {m.preco != null && (
                  <Text className="text-green-600 font-semibold">
                    {m.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

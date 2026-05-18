import { View, Text } from 'react-native';
import { StatusPedido } from '@/hooks/usePedidos';

const CONFIG: Record<StatusPedido, { label: string; bg: string; text: string }> = {
  arte_pendente: { label: 'Pendente', bg: '#FEF3C7', text: '#92400E' },
  pago_parcial:  { label: 'Pago Parcial',  bg: '#FFEDD5', text: '#9A3412' },
  pago_total:    { label: 'Pago Total',    bg: '#DBEAFE', text: '#1E40AF' },
  entregue:      { label: 'Entregue',      bg: '#DCFCE7', text: '#166534' },
};

export function StatusBadge({ status }: { status: StatusPedido }) {
  const c = CONFIG[status] ?? CONFIG.arte_pendente;
  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: c.bg }}>
      <Text className="text-xs font-semibold" style={{ color: c.text }}>{c.label}</Text>
    </View>
  );
}

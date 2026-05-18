import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

type Props = {
  onSave: (base64: string) => void;
  onClear?: () => void;
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
  label?: string;
};

const style = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: 1px solid #E5E7EB; border-radius: 12px; background: #fff; }
  .m-signature-pad--footer { display: none; }
  body { margin: 0; padding: 0; background: transparent; }
`;

export function SignaturePad({ onSave, onClear, onDrawStart, onDrawEnd, label = 'Assine abaixo' }: Props) {
  const ref = useRef<any>(null);
  const [captured, setCaptured] = useState(false);

  function handleOK(data: string) {
    setCaptured(true);
    onSave(data);
  }

  function handleClear() {
    ref.current?.clearSignature();
    setCaptured(false);
    onClear?.();
  }

  function handleBegin() {
    onDrawStart?.();
  }

  function handleEnd() {
    ref.current?.readSignature();
    onDrawEnd?.();
  }

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Text className="text-sm font-medium text-gray-700">{label}</Text>
          {captured && (
            <Text className="text-green-600 text-xs font-semibold">✓ Capturada</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleClear}>
          <Text className="text-sm text-red-500">Limpar</Text>
        </TouchableOpacity>
      </View>
      <View
        className="rounded-xl overflow-hidden bg-white"
        style={{ height: 180, borderWidth: captured ? 2 : 1, borderColor: captured ? '#16A34A' : '#E5E7EB' }}
        onTouchStart={() => onDrawStart?.()}
        onTouchEnd={() => onDrawEnd?.()}
        onTouchCancel={() => onDrawEnd?.()}
      >
        <SignatureCanvas
          ref={ref}
          onOK={handleOK}
          onBegin={handleBegin}
          onEnd={handleEnd}
          onEmpty={() => setCaptured(false)}
          descriptionText=""
          clearText="Limpar"
          confirmText="Salvar"
          webStyle={style}
          autoClear={false}
          imageType="image/png"
        />
      </View>
      {!captured && (
        <TouchableOpacity
          className="mt-2 bg-gray-100 rounded-lg py-2 items-center"
          onPress={() => ref.current?.readSignature()}
        >
          <Text className="text-gray-600 text-sm font-medium">Confirmar assinatura</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

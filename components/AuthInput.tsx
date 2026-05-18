import { TextInput, TextInputProps, View, Text } from 'react-native';

type Props = TextInputProps & { label: string; error?: string };

export function AuthInput({ label, error, ...props }: Props) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
      <TextInput
        className={`w-full border rounded-xl px-4 py-3 text-base bg-white text-gray-900 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholderTextColor="#9CA3AF"
        autoCapitalize="none"
        {...props}
      />
      {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
    </View>
  );
}

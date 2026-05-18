import { View, Text } from 'react-native';

type Props = { emoji: string; title: string; subtitle?: string };

export function EmptyState({ emoji, title, subtitle }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text style={{ fontSize: 56 }}>{emoji}</Text>
      <Text className="text-gray-700 font-semibold text-lg mt-4 text-center">{title}</Text>
      {subtitle ? <Text className="text-gray-400 text-sm mt-1 text-center">{subtitle}</Text> : null}
    </View>
  );
}

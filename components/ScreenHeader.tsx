import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, subtitle, back, right }: Props) {
  const { theme } = useAuth();
  const router = useRouter();

  return (
    <View style={{ backgroundColor: theme.primary }} className="px-6 pt-14 pb-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {back && (
            <TouchableOpacity onPress={() => router.back()} className="mr-3 -ml-1">
              <Text className="text-white text-2xl">‹</Text>
            </TouchableOpacity>
          )}
          <View className="flex-1">
            <Text className="text-white text-xl font-bold" numberOfLines={1}>{title}</Text>
            {subtitle ? <Text className="text-white/70 text-sm">{subtitle}</Text> : null}
          </View>
        </View>
        {right && <View className="ml-3">{right}</View>}
      </View>
    </View>
  );
}

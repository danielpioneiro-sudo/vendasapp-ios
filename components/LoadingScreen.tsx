import { View, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '@/lib/auth';

export function LoadingScreen() {
  const { theme } = useAuth();
  return (
    <View className="flex-1 items-center justify-center bg-gray-50" style={{ gap: 24 }}>
      <Image
        source={require('@/assets/splash-icon.png')}
        style={{ width: 220, height: 63, resizeMode: 'contain' }}
      />
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

import '../global.css';
import '@/lib/i18n';
import { enableScreens } from 'react-native-screens';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/lib/auth';
import { configurePurchases } from '@/lib/purchases';

// Disable native screens: RNSScreen crashes in Expo Go (Fabric/new arch) when
// style contains pointerEvents string values — "expected boolean, had string"
enableScreens(false);

function RootLayoutNav() {
  const { session, loading, company } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Configure RevenueCat once the company is known
  useEffect(() => {
    if (company?.id) {
      configurePurchases(company.id);
    }
  }, [company?.id]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPaywall = segments[0] === 'paywall';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && inAuthGroup) {
      router.replace('/(app)');
      return;
    }

    // Subscription gate — redirect to paywall when trial expired or subscription expired
    if (session && !inAuthGroup && !inPaywall && company) {
      if (company.subscription_status === 'expired') {
        router.replace('/paywall');
        return;
      }
      if (company.subscription_status === 'trial' && company.trial_ends_at) {
        const trialEnd = new Date(company.trial_ends_at);
        if (trialEnd < new Date()) {
          router.replace('/paywall');
          return;
        }
      }
    }
  }, [session, loading, segments, company]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="paywall" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

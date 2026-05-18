import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { VendasAppLogo } from '@/components/VendasAppLogo';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = t('common.required');
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t('common.emailInvalid');
    if (!password) e.password = t('common.required');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) Alert.alert(t('auth.login.errorTitle'), error);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-16 pb-8">
            {/* Logo / Header */}
            <View className="items-center mb-10">
              <VendasAppLogo variant="full" size={56} />
            </View>

            {/* Form */}
            <View className="bg-white rounded-2xl p-6 shadow-sm">
              <Text className="text-xl font-bold text-gray-900 mb-6">{t('auth.login.title')}</Text>

              <AuthInput
                label={t('auth.login.email')}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                error={errors.email}
              />

              <AuthInput
                label={t('auth.login.password')}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                error={errors.password}
              />

              <PrimaryButton
                title={t('auth.login.loginBtn')}
                loading={loading}
                onPress={handleLogin}
                className="mt-2"
              />
            </View>

            {/* Divider */}
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="mx-4 text-gray-400 text-sm">{t('common.or')}</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Secondary actions */}
            <TouchableOpacity
              className="bg-white border border-gray-200 rounded-xl py-4 items-center mb-4"
              onPress={() => router.push('/(auth)/register')}
            >
              <Text className="text-gray-700 font-medium">{t('auth.login.createAccount')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center"
              onPress={() => router.push('/(auth)/join')}
            >
              <Text className="text-blue-600 font-medium">{t('auth.login.joinWithCode')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

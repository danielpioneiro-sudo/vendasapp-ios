import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { VendasAppLogo } from '@/components/VendasAppLogo';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('common.required');
    if (!companyName.trim()) e.companyName = t('common.required');
    if (!email.trim()) e.email = t('common.required');
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t('common.emailInvalid');
    if (!password) e.password = t('common.required');
    else if (password.length < 6) e.password = t('common.minPassword');
    if (password !== confirm) e.confirm = t('common.passwordMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await signUp(email.trim().toLowerCase(), password, name.trim(), companyName.trim());
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.register.errorTitle'), error);
    } else {
      Alert.alert(t('auth.register.successTitle'), t('auth.register.successMessage'));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 px-6 pt-8 pb-8">
            <TouchableOpacity onPress={() => router.back()} className="mb-6">
              <Text className="text-blue-600 text-base">{t('common.back')}</Text>
            </TouchableOpacity>

            <View className="items-center mb-6">
              <VendasAppLogo variant="full" size={44} />
            </View>

            <Text className="text-2xl font-bold text-gray-900 mb-2">{t('auth.register.title')}</Text>
            <Text className="text-gray-500 mb-8">{t('auth.register.subtitle')}</Text>

            <View className="bg-white rounded-2xl p-6 shadow-sm">
              <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                {t('auth.register.yourData')}
              </Text>

              <AuthInput
                label={t('auth.register.yourName')}
                value={name}
                onChangeText={setName}
                placeholder="João Silva"
                autoCapitalize="words"
                error={errors.name}
              />

              <AuthInput
                label={t('auth.register.email')}
                value={email}
                onChangeText={setEmail}
                placeholder="joao@empresa.com"
                keyboardType="email-address"
                error={errors.email}
              />

              <AuthInput
                label={t('auth.register.password')}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                error={errors.password}
              />

              <AuthInput
                label={t('auth.register.confirmPassword')}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                secureTextEntry
                error={errors.confirm}
              />

              <View className="h-px bg-gray-100 my-4" />

              <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                {t('auth.register.companyData')}
              </Text>

              <AuthInput
                label={t('auth.register.companyName')}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Minha Empresa Ltda"
                autoCapitalize="words"
                error={errors.companyName}
              />

              <PrimaryButton
                title={t('auth.register.createBtn')}
                loading={loading}
                onPress={handleRegister}
                className="mt-2"
              />
            </View>

            <Text className="text-center text-gray-400 text-xs mt-6 px-4">
              {t('auth.register.terms')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

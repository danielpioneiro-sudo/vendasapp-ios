import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { AuthInput } from '@/components/AuthInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { VendasAppLogo } from '@/components/VendasAppLogo';

export default function JoinScreen() {
  const { joinWithCode } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!code.trim() || code.trim().length < 6) e.code = t('auth.join.codeInvalid');
    if (!name.trim()) e.name = t('common.required');
    if (!email.trim()) e.email = t('common.required');
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t('common.emailInvalid');
    if (!password) e.password = t('common.required');
    else if (password.length < 6) e.password = t('common.minPassword');
    if (password !== confirm) e.confirm = t('common.passwordMismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleJoin() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await joinWithCode(
      email.trim().toLowerCase(),
      password,
      name.trim(),
      code.trim()
    );
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), error);
    } else {
      Alert.alert(
        t('auth.join.successTitle'),
        t('auth.join.successMessage'),
        [{ text: t('common.ok'), onPress: () => router.replace('/(auth)/login') }]
      );
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

            <Text className="text-2xl font-bold text-gray-900 mb-2">{t('auth.join.title')}</Text>
            <Text className="text-gray-500 mb-8">{t('auth.join.subtitle')}</Text>

            <View className="bg-white rounded-2xl p-6 shadow-sm">
              <AuthInput
                label={t('auth.join.inviteCode')}
                value={code}
                onChangeText={(tx) => setCode(tx.toUpperCase())}
                placeholder="ABC123"
                autoCapitalize="characters"
                maxLength={8}
                error={errors.code}
              />

              <View className="h-px bg-gray-100 my-2 mb-4" />

              <AuthInput
                label={t('auth.join.yourName')}
                value={name}
                onChangeText={setName}
                placeholder="Maria Souza"
                autoCapitalize="words"
                error={errors.name}
              />

              <AuthInput
                label={t('auth.join.email')}
                value={email}
                onChangeText={setEmail}
                placeholder="maria@empresa.com"
                keyboardType="email-address"
                error={errors.email}
              />

              <AuthInput
                label={t('auth.join.password')}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                error={errors.password}
              />

              <AuthInput
                label={t('auth.join.confirmPassword')}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                secureTextEntry
                error={errors.confirm}
              />

              <PrimaryButton
                title={t('auth.join.joinBtn')}
                loading={loading}
                onPress={handleJoin}
                className="mt-2"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

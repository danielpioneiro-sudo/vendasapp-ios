import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { THEMES, ThemeKey } from '@/constants/themes';

function NavRow({ label, subtitle, onPress }: { label: string; subtitle?: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between py-3 border-b border-gray-50"
      onPress={onPress}
    >
      <View>
        <Text className="text-gray-900 font-medium">{label}</Text>
        {subtitle ? <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text> : null}
      </View>
      <Text className="text-gray-300 text-xl">›</Text>
    </TouchableOpacity>
  );
}

export default function ConfigScreen() {
  const { company, member, theme, signOut, refreshCompany, deleteAccount } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const isAdmin = member?.role === 'admin';

  async function handleThemeChange(newTheme: ThemeKey) {
    if (!company) return;
    const { error } = await supabase
      .from('companies')
      .update({ theme: newTheme })
      .eq('id', company.id);
    if (error) Alert.alert(t('common.error'), error.message);
    else await refreshCompany();
  }

  async function generateInviteCode() {
    if (!company) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('invite_codes').insert({
      company_id: company.id,
      code,
      created_by: member?.user_id,
    });
    if (error) Alert.alert(t('common.error'), error.message);
    else Alert.alert(t('config.codeGenerated'), t('config.codeMsg', { code }));
  }

  const subscriptionLabel =
    company?.subscription_status === 'trial' ? t('config.trial') :
    company?.subscription_status === 'active' ? t('config.active') : t('config.expired');

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: theme.primary }} className="px-6 pt-8 pb-6">
          <Text className="text-white text-2xl font-bold">{t('config.title')}</Text>
        </View>

        <View className="px-4 py-4" style={{ gap: 12 }}>
          {/* Minha conta */}
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">{t('config.myAccount')}</Text>
            <Text className="text-gray-900 font-semibold">{member?.name ?? '—'}</Text>
            <Text className="text-gray-500 text-sm">
              {member?.role === 'admin' ? t('config.admin') : t('config.seller')}
            </Text>
          </View>

          {/* Empresa (admin) */}
          {isAdmin && (
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-xs font-semibold text-gray-400 uppercase mb-1">{t('config.company')}</Text>
              <NavRow
                label={company?.name ?? 'Minha empresa'}
                subtitle={subscriptionLabel}
                onPress={() => router.push('/(app)/configuracoes/empresa')}
              />
              <NavRow
                label={t('config.contractModel')}
                subtitle={t('config.contractSub')}
                onPress={() => router.push('/(app)/configuracoes/contrato')}
              />
            </View>
          )}

          {/* Tema */}
          {isAdmin && (
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">{t('config.colorTheme')}</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, th]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleThemeChange(key)}
                    className="flex-row items-center px-3 py-2 rounded-lg border"
                    style={{
                      backgroundColor: company?.theme === key ? th.primaryLight : '#F9FAFB',
                      borderColor: company?.theme === key ? th.primary : '#E5E7EB',
                    }}
                  >
                    <View className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: th.primary }} />
                    <Text
                      className="text-sm font-medium"
                      style={{ color: company?.theme === key ? th.primaryDark : '#374151' }}
                    >
                      {th.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Equipe */}
          {isAdmin && (
            <View className="bg-white rounded-2xl p-4 shadow-sm">
              <Text className="text-xs font-semibold text-gray-400 uppercase mb-3">{t('config.team')}</Text>
              <TouchableOpacity
                className="rounded-xl py-3 items-center"
                style={{ backgroundColor: theme.primary }}
                onPress={generateInviteCode}
              >
                <Text className="text-white font-semibold">{t('config.generateCode')}</Text>
              </TouchableOpacity>
              <Text className="text-gray-400 text-xs mt-2 text-center">{t('config.codeSub')}</Text>
            </View>
          )}

          {/* Logout */}
          <TouchableOpacity
            className="bg-red-50 border border-red-200 rounded-2xl p-4 items-center"
            onPress={() =>
              Alert.alert(t('config.logoutTitle'), t('config.logoutMsg'), [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('config.logoutConfirm'), style: 'destructive', onPress: signOut },
              ])
            }
          >
            <Text className="text-red-600 font-semibold">{t('config.logout')}</Text>
          </TouchableOpacity>

          {/* Excluir conta */}
          <TouchableOpacity
            className="items-center py-3"
            onPress={() =>
              Alert.alert(
                'Excluir conta',
                'Todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.',
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  {
                    text: 'Excluir minha conta',
                    style: 'destructive',
                    onPress: async () => {
                      const { error } = await deleteAccount();
                      if (error) Alert.alert(t('common.error'), error);
                    },
                  },
                ]
              )
            }
          >
            <Text className="text-gray-400 text-sm">Excluir conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

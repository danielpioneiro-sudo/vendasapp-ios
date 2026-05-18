import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { getOfferings, purchasePackage, restorePurchases, isSubscriptionActive } from '@/lib/purchases';

const BENEFIT_KEYS = [
  'paywall.benefit1',
  'paywall.benefit2',
  'paywall.benefit3',
  'paywall.benefit4',
  'paywall.benefit5',
  'paywall.benefit6',
];
const BENEFIT_EMOJIS = ['📋', '👥', '📦', '✍️', '📊', '🔔'];

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { refreshCompany } = useAuth();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    try {
      const offering = await getOfferings();
      if (offering?.availablePackages.length) {
        const pkgs = offering.availablePackages;
        setPackages(pkgs);
        const annual = pkgs.find(p => p.packageType === 'ANNUAL');
        setSelected(annual ?? pkgs[0]);
      }
    } catch (e) {
      console.warn('RevenueCat offerings error', e);
    } finally {
      setLoadingOfferings(false);
    }
  }

  async function handleSubscribe() {
    if (!selected) return;
    setPurchasing(true);
    const { customerInfo, error } = await purchasePackage(selected);
    setPurchasing(false);
    if (error === 'cancelled') return;
    if (error) {
      Alert.alert(t('paywall.errorTitle'), error);
      return;
    }
    if (customerInfo && isSubscriptionActive(customerInfo)) {
      await refreshCompany();
      router.replace('/(app)');
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    const { customerInfo, error } = await restorePurchases();
    setPurchasing(false);
    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }
    if (customerInfo && isSubscriptionActive(customerInfo)) {
      await refreshCompany();
      router.replace('/(app)');
    } else {
      Alert.alert(t('paywall.noSubscriptionTitle'), t('paywall.noSubscriptionMsg'));
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* Header */}
        <View className="items-center px-6 pt-12 pb-10 bg-blue-600">
          <Text className="text-white text-4xl font-bold tracking-tight">VendasApp</Text>
          <Text className="text-blue-100 text-base mt-3 text-center leading-6">
            {t('paywall.tagline')}
          </Text>
        </View>

        {/* Trial ended notice */}
        <View className="mx-6 mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Text className="text-amber-800 font-semibold text-sm">{t('paywall.trialEnded')}</Text>
          <Text className="text-amber-700 text-xs mt-1">{t('paywall.trialEndedSub')}</Text>
        </View>

        {/* Benefits */}
        <View className="px-6 py-6">
          <Text className="text-gray-900 text-lg font-bold mb-4">{t('paywall.whatsIncluded')}</Text>
          {BENEFIT_KEYS.map((key, i) => (
            <View key={key} className="flex-row items-center mb-3">
              <Text style={{ fontSize: 20 }}>{BENEFIT_EMOJIS[i]}</Text>
              <Text className="text-gray-700 text-sm ml-3 flex-1">{t(key)}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View className="px-6">
          <Text className="text-gray-900 text-lg font-bold mb-3">{t('paywall.choosePlan')}</Text>

          {loadingOfferings ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#2563EB" size="large" />
              <Text className="text-gray-400 text-sm mt-3">{t('paywall.loadingPlans')}</Text>
            </View>
          ) : packages.length === 0 ? (
            <View className="bg-gray-50 rounded-2xl p-6 items-center">
              <Text className="text-gray-400 text-sm text-center">{t('paywall.noPlans')}</Text>
            </View>
          ) : (
            packages.map(pkg => {
              const isSelected = selected?.identifier === pkg.identifier;
              const isAnnual = pkg.packageType === 'ANNUAL';
              const period = isAnnual ? t('paywall.annual') : t('paywall.monthly');
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  onPress={() => setSelected(pkg)}
                  className="rounded-2xl p-4 mb-3 border-2"
                  style={{
                    borderColor: isSelected ? '#2563EB' : '#E5E7EB',
                    backgroundColor: isSelected ? '#EFF6FF' : '#F9FAFB',
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="font-bold text-gray-900 text-base">{period}</Text>
                        {isAnnual && (
                          <View className="bg-green-100 rounded-lg px-2 py-0.5">
                            <Text className="text-green-700 text-xs font-bold">{t('paywall.save20')}</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-gray-500 text-sm mt-0.5">
                        {pkg.product.priceString}/{isAnnual ? 'ano' : 'mês'}
                      </Text>
                    </View>
                    <View
                      className="w-5 h-5 rounded-full border-2 items-center justify-center"
                      style={{ borderColor: isSelected ? '#2563EB' : '#9CA3AF' }}
                    >
                      {isSelected && (
                        <View className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Actions */}
        <View className="px-6 mt-2">
          <TouchableOpacity
            className="bg-blue-600 rounded-2xl py-4 items-center shadow-sm"
            onPress={handleSubscribe}
            disabled={purchasing || !selected || packages.length === 0}
            style={{ opacity: !selected || packages.length === 0 ? 0.5 : 1 }}
          >
            {purchasing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text className="text-white font-bold text-base">{t('paywall.subscribeBtn')}</Text>
                <Text className="text-blue-100 text-xs mt-0.5">{t('paywall.cancelAnytime')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-4"
            onPress={handleRestore}
            disabled={purchasing}
          >
            <Text className="text-blue-600 font-semibold text-sm">{t('paywall.restore')}</Text>
          </TouchableOpacity>

          <Text className="text-gray-400 text-xs text-center leading-4">
            {t('paywall.terms')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

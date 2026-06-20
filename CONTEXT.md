# CONTEXT.md — VendasApp

App de gestão de vendas com assinaturas (iOS + Android).

## Identidade
- **Nome:** VendasApp
- **Pasta local:** `/Volumes/dp/Projetos/vendasapp-ios/`
- **GitHub:** `danielpioneiro-sudo/vendasapp-ios`
- **Bundle ID iOS:** `com.dgppropaganda.vendasapp`
- **Package Android:** `com.dgppropaganda.vendasapp`

## Stack
- Expo (expo-router, expo-print, expo-sharing, expo-file-system)
- Supabase (`@supabase/supabase-js`)
- NativeWind (Tailwind para React Native)
- RevenueCat (assinaturas e IAP)
- i18next + react-i18next (internacionalização)
- expo-secure-store (armazenamento seguro)

## Builds
| Plataforma | Versão | Build |
|---|---|---|
| iOS | 1.0.0 | 13 |
| Android | 1.0.0 | — |

## Banco de dados
- **Supabase URL:** `https://ddgnxpzohzukjprqgzgr.supabase.co`
- **Conta Supabase:** principal (`danielpioneiro-sudo`)
- Edge Functions: webhook RevenueCat em `supabase/functions/revenuecat-webhook/`

## Monetização
- **RevenueCat:** configurado para gerenciar assinaturas iOS e Android
- Entitlements configurados no dashboard RevenueCat

## Status
- Play Store: criada ✅
- iOS: pendente submissão
- Site legal: pronto ✅

## Deploy iOS
- Xcode local → xcodebuild → Organizer → App Store Connect
- Nunca usar EAS Build para produção iOS

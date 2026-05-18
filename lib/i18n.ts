import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import ptBR from '../locales/pt-BR.json';
import en from '../locales/en.json';

const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'pt';
const lng = deviceLang.startsWith('pt') ? 'pt-BR' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      en: { translation: en },
    },
    lng,
    fallbackLng: 'pt-BR',
    interpolation: { escapeValue: false },
  });

export default i18n;

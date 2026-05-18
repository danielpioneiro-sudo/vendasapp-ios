export type ThemeKey = 'blue' | 'green' | 'gray' | 'wine' | 'indigo';

export const THEMES: Record<ThemeKey, { label: string; primary: string; primaryDark: string; primaryLight: string }> = {
  blue: {
    label: 'Azul Corporativo',
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryLight: '#DBEAFE',
  },
  green: {
    label: 'Verde',
    primary: '#16A34A',
    primaryDark: '#15803D',
    primaryLight: '#DCFCE7',
  },
  gray: {
    label: 'Cinza',
    primary: '#4B5563',
    primaryDark: '#374151',
    primaryLight: '#F3F4F6',
  },
  wine: {
    label: 'Vinho',
    primary: '#9F1239',
    primaryDark: '#881337',
    primaryLight: '#FFE4E6',
  },
  indigo: {
    label: 'Índigo',
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    primaryLight: '#E0E7FF',
  },
};

export const DEFAULT_THEME: ThemeKey = 'blue';

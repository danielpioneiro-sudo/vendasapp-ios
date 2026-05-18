import { Image, View } from 'react-native';

type Props = {
  variant?: 'icon' | 'full';
  size?: number;
};

export function VendasAppLogo({ variant = 'full', size }: Props) {
  if (variant === 'icon') {
    const s = size ?? 80;
    return (
      <Image
        source={require('@/assets/icon.png')}
        style={{ width: s, height: s, resizeMode: 'contain' }}
      />
    );
  }

  const h = size ?? 72;
  const w = h * (1400 / 400);
  return (
    <Image
      source={require('@/assets/splash-icon.png')}
      style={{ width: w, height: h, resizeMode: 'contain' }}
    />
  );
}

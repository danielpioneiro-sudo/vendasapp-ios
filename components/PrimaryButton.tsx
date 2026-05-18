import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';

type Props = TouchableOpacityProps & {
  title: string;
  loading?: boolean;
  color?: string;
};

export function PrimaryButton({ title, loading, color = '#2563EB', style, ...props }: Props) {
  return (
    <TouchableOpacity
      className="w-full rounded-xl py-4 items-center justify-center"
      style={[{ backgroundColor: color }, style as any]}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-white text-base font-semibold">{title}</Text>
      )}
    </TouchableOpacity>
  );
}

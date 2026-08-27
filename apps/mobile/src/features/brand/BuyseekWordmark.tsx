import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors } from '@/theme';

type Props = TextProps & {
  size?: 'lg' | 'md' | 'sm';
};

/**
 * App wordmark. MOBILE 1A never shows Plus — entitlement comes later via billing.
 */
export function BuyseekWordmark({ size = 'lg', style, ...props }: Props) {
  return (
    <Text
      accessibilityRole="header"
      style={[styles.base, sizeStyles[size], style]}
      {...props}
    >
      Buyseek
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontWeight: '700',
    letterSpacing: -1,
  },
});

const sizeStyles = StyleSheet.create({
  lg: { fontSize: 36 },
  md: { fontSize: 32 },
  sm: { fontSize: 28 },
});

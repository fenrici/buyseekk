import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

/**
 * Boot/loading visual inspired by web SplashVisual / PortalLoadingScreen.
 * RN-only — no web HTML/CSS. Brand is always plain "Buyseek" (no Plus) in 1A.
 */
export function BuyseekBootScreen() {
  return (
    <View style={styles.root} accessibilityLabel="Buyseek" accessibilityRole="progressbar">
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.center}>
        <Text style={styles.logoMark} accessibilityElementsHidden>
          ⇄
        </Text>
        <Text style={styles.brand}>Buyseek</Text>
        <ActivityIndicator style={styles.spinner} color="#818cf8" size="small" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060c1d',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
  },
  center: {
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 1,
  },
  logoMark: {
    color: '#818cf8',
    fontSize: 48,
    lineHeight: 52,
    textShadowColor: 'rgba(129, 140, 248, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  brand: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  spinner: {
    marginTop: spacing.sm,
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '@/lib/config';
import { PASSWORD_MIN_LENGTH } from '@/lib/shared';
import { colors, radius, spacing } from '@/theme';

/**
 * Foundation home — native RN only (no web DOM/CSS).
 * Shared import + API_URL kept for monorepo/env smoke; unused for UX yet.
 */
export default function HomeScreen() {
  void API_URL;
  void PASSWORD_MIN_LENGTH;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.root}>
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>Buyseek</Text>
            <Text style={styles.plus} accessibilityLabel="Plus">
              +
            </Text>
          </View>

          <Text style={styles.tagline}>
            Compra lo que buscas.{'\n'}Recibe ofertas reales.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.foundation}>Native app foundation</Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={() => {
              /* Navigation wired in a later phase */
            }}
          >
            <Text style={styles.ctaLabel}>Continuar</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  brand: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  plus: {
    marginLeft: 2,
    marginTop: 2,
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  tagline: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
    maxWidth: 320,
  },
  footer: {
    gap: spacing.md,
    alignItems: 'stretch',
  },
  foundation: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: 'center',
    opacity: 0.75,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primaryDark,
  },
  ctaPressed: {
    opacity: 0.88,
    backgroundColor: colors.primaryDark,
  },
  ctaLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

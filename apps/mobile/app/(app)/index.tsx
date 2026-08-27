import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BuyseekWordmark } from '@/features/brand/BuyseekWordmark';
import { AuthButton, AuthErrorBanner } from '@/features/auth/AuthForm';
import { userFacingMessage } from '@/lib/api/errors';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

/** Temporary authenticated home — validates real auth before Buyer/Seller UI. */
export default function AppHomeScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogout = async () => {
    setLoading(true);
    setError(null);
    try {
      await logout();
    } catch (err) {
      setError(userFacingMessage(err, 'No pudimos cerrar sesión.'));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.root}>
        <View style={styles.hero}>
          <BuyseekWordmark size="lg" style={styles.brand} />
          <Text style={styles.status}>Sesión iniciada</Text>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user && !user.emailVerified ? (
            <Text style={styles.verifyHint}>
              Verificá tu email cuando puedas — el enlace sigue llegando por correo.
            </Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <AuthErrorBanner message={error} />
          <AuthButton
            label="Cerrar sesión"
            variant="danger"
            loading={loading}
            onPress={() => {
              void onLogout();
            }}
          />
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
    gap: spacing.sm,
  },
  brand: {
    fontSize: 40,
  },
  status: {
    marginTop: spacing.md,
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
  },
  email: {
    color: colors.textMuted,
    fontSize: 15,
  },
  verifyHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 320,
  },
  footer: {
    gap: spacing.md,
  },
});

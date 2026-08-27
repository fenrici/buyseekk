import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButton, AuthErrorBanner, AuthField } from '@/features/auth/AuthForm';
import { BuyseekWordmark } from '@/features/brand/BuyseekWordmark';
import { userFacingMessage } from '@/lib/api/errors';
import { useAuth } from '@/providers/AuthProvider';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const { login, restoreError, retryRestore } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
    } catch (err) {
      setError(userFacingMessage(err, 'No pudimos iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <BuyseekWordmark size="lg" />
          <Text style={styles.subtitle}>Iniciá sesión para continuar</Text>

          <AuthErrorBanner message={error} />
          {restoreError ? (
            <View style={styles.restoreBox}>
              <Text style={styles.restoreText}>{restoreError}</Text>
              <AuthButton
                label="Reintentar sesión"
                variant="ghost"
                onPress={() => {
                  void retryRestore();
                }}
              />
            </View>
          ) : null}

          <View style={styles.form}>
            <AuthField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!loading}
            />
            <AuthField
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={() => {
                void onSubmit();
              }}
              editable={!loading}
            />

            <AuthButton
              label="Iniciar sesión"
              onPress={() => {
                void onSubmit();
              }}
              loading={loading}
              disabled={!canSubmit}
            />

            <Link href="/(auth)/register" style={styles.link}>
              Crear cuenta
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: -spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  restoreBox: {
    gap: spacing.xs,
  },
  restoreText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});

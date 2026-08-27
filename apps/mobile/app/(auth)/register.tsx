import {
  PASSWORD_REQUIREMENT_ORDER,
  checkPasswordRequirements,
  isPasswordValid,
  type PasswordRequirementKey,
} from '@buyseekk/shared';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BuyseekWordmark } from '@/features/brand/BuyseekWordmark';
import { AuthButton, AuthErrorBanner, AuthField } from '@/features/auth/AuthForm';
import { userFacingMessage } from '@/lib/api/errors';
import { getRegisterMarket } from '@/lib/auth/register-market';
import { useAuth } from '@/providers/AuthProvider';
import { colors, radius, spacing } from '@/theme';

const REQUIREMENT_LABELS: Record<PasswordRequirementKey, string> = {
  minLength: 'Mínimo 8 caracteres',
  uppercase: 'Una mayúscula',
  lowercase: 'Una minúscula',
  number: 'Un número',
};

type Role = 'BUYER' | 'SELLER';

export default function RegisterScreen() {
  const { register } = useAuth();
  const market = useMemo(() => getRegisterMarket(), []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('BUYER');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requirements = checkPasswordRequirements(password);
  const passwordOk = isPasswordValid(password);
  const canSubmit =
    name.trim().length >= 2 &&
    email.trim().length > 0 &&
    passwordOk &&
    acceptedTerms &&
    !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        country: market.country,
        currency: market.currency,
        acceptedTerms: true,
      });
    } catch (err) {
      setError(userFacingMessage(err, 'No pudimos crear la cuenta.'));
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
        >
          <BuyseekWordmark size="md" />
          <Text style={styles.subtitle}>Creá tu cuenta</Text>

          <AuthErrorBanner message={error} />

          <View style={styles.form}>
            <AuthField
              label="Nombre"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              textContentType="name"
              editable={!loading}
            />
            <AuthField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />
            <AuthField
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
              editable={!loading}
            />

            <View style={styles.requirements}>
              {PASSWORD_REQUIREMENT_ORDER.map((key) => (
                <Text
                  key={key}
                  style={[
                    styles.requirement,
                    requirements[key] && styles.requirementMet,
                  ]}
                >
                  {requirements[key] ? '✓' : '·'} {REQUIREMENT_LABELS[key]}
                </Text>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Quiero usar Buyseek como</Text>
            <View style={styles.roleRow}>
              {(
                [
                  { id: 'BUYER' as const, label: 'Comprador' },
                  { id: 'SELLER' as const, label: 'Vendedor' },
                ] as const
              ).map((option) => {
                const selected = role === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setRole(option.id)}
                    style={[styles.roleChip, selected && styles.roleChipSelected]}
                  >
                    <Text
                      style={[
                        styles.roleChipLabel,
                        selected && styles.roleChipLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
              onPress={() => setAcceptedTerms((v) => !v)}
              style={styles.termsRow}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}>
                {acceptedTerms ? <Text style={styles.checkboxMark}>✓</Text> : null}
              </View>
              <Text style={styles.termsText}>
                Acepto los términos y la política de privacidad
              </Text>
            </Pressable>

            <AuthButton
              label="Crear cuenta"
              onPress={() => {
                void onSubmit();
              }}
              loading={loading}
              disabled={!canSubmit}
            />

            <Link href="/(auth)/login" style={styles.link}>
              Ya tengo cuenta
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
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: -spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  requirements: {
    gap: 4,
    marginTop: -spacing.sm,
  },
  requirement: {
    color: colors.textMuted,
    fontSize: 12,
  },
  requirementMet: {
    color: colors.accent,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleChip: {
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    alignItems: 'center',
  },
  roleChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  roleChipLabel: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  roleChipLabelSelected: {
    color: colors.text,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxMark: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
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

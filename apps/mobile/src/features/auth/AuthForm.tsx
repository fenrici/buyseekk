import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radius, spacing } from '@/theme';

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthField({ label, error, style, ...props }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
};

export function AuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'ghost' && styles.buttonLabelGhost,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function AuthErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner} accessibilityRole="alert">
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  fieldError: {
    color: colors.destructive,
    fontSize: 12,
  },
  button: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDanger: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLabelGhost: {
    color: colors.accent,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive,
    padding: spacing.md,
  },
  errorBannerText: {
    color: colors.destructive,
    fontSize: 14,
    lineHeight: 20,
  },
});

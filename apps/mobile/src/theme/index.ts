/**
 * Buyseek native color / spacing / radius tokens.
 * StyleSheet-only — no CSS / NativeWind in this phase.
 */
export const colors = {
  background: '#050a18',
  surface: '#0b1224',
  surfaceElevated: '#121a2f',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  accent: '#22d3ee',
  destructive: '#f87171',
  border: '#1e293b',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
} as const;

export type Theme = typeof theme;

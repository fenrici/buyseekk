'use client';

import { AuthProvider } from './AuthProvider';
import { ModeSwitchProvider } from './ModeSwitchProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ModeSwitchProvider>{children}</ModeSwitchProvider>
    </AuthProvider>
  );
}

'use client';

import { AuthProvider } from './AuthProvider';
import { ModeSwitchProvider } from './ModeSwitchProvider';
import { NotificationsProvider } from './NotificationsProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <ModeSwitchProvider>{children}</ModeSwitchProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}

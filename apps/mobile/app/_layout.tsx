import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BuyseekBootScreen } from '@/features/brand/BuyseekBootScreen';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import { colors } from '@/theme';

function RootNavigator() {
  const { status } = useAuth();

  if (status === 'booting') {
    return <BuyseekBootScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </QueryProvider>
  );
}

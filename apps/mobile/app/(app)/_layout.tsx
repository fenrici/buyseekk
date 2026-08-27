import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function AppLayout() {
  const { status } = useAuth();

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

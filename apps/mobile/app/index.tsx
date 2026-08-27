import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

/** Entry redirect — avoids auth/app navigation loops. */
export default function Index() {
  const { status } = useAuth();

  if (status === 'booting') return null;
  if (status === 'authenticated') return <Redirect href="/(app)" />;
  return <Redirect href="/(auth)/login" />;
}

import { Platform } from 'react-native';
import type { RefreshClientType } from '@buyseekk/shared';

/** Native clientType for mobile auth endpoints — never WEB. */
export function getMobileClientType(): Extract<RefreshClientType, 'IOS' | 'ANDROID'> {
  return Platform.OS === 'android' ? 'ANDROID' : 'IOS';
}

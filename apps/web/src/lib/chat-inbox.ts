/** Clave estable para distinguir refetch inicial vs background en el inbox. */
export function chatInboxFetchKey(
  userId: string,
  activeMode: string | undefined,
  page: number,
): string {
  return `${userId}:${activeMode ?? ''}:${page}`;
}

/** Mantener la lista visible durante un refetch si ya hay datos del mismo contexto. */
export function isChatInboxBackgroundRefresh(
  previousKey: string | null,
  nextKey: string,
  chatCount: number,
): boolean {
  return previousKey === nextKey && chatCount > 0;
}

export function shouldShowChatInboxList(loading: boolean, chatCount: number): boolean {
  return chatCount > 0 || !loading;
}

export function shouldShowChatInboxInitialLoader(loading: boolean, chatCount: number): boolean {
  return loading && chatCount === 0;
}

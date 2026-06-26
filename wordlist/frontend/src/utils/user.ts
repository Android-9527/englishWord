const USER_ID_STORAGE_KEY = 'WORDLIST_USER_ID';
const USER_ID_CHANGED_EVENT = 'wordlist-user-id-changed';

export function normalizeUserId(value: string | null | undefined) {
  return String(value || '').trim() || 'default';
}

export function getStoredUserId() {
  if (typeof window === 'undefined') {
    return 'default';
  }

  return normalizeUserId(window.localStorage.getItem(USER_ID_STORAGE_KEY));
}

export function setStoredUserId(userId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = normalizeUserId(userId);
  window.localStorage.setItem(USER_ID_STORAGE_KEY, normalized);
  window.dispatchEvent(new CustomEvent(USER_ID_CHANGED_EVENT, { detail: normalized }));
}

export function subscribeUserIdChange(callback: (userId: string) => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<string>;
    callback(normalizeUserId(customEvent.detail));
  };

  window.addEventListener(USER_ID_CHANGED_EVENT, handler as EventListener);
  return () => {
    window.removeEventListener(USER_ID_CHANGED_EVENT, handler as EventListener);
  };
}

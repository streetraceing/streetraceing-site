import {
  isTempChatHistoryEntry,
  mergeTempChatHistoryEntry,
  pruneExpiredTempChatHistory,
  TEMP_CHAT_HISTORY_STORAGE_KEY,
  type TempChatHistoryEntry,
} from '../../utils/temp-chat';

export type StoredTempChatMember = {
  token: string;
  memberId: string;
  name: string;
};
const EMPTY_HISTORY: TempChatHistoryEntry[] = [];
const NAME_KEY = 'temp-chat-name';
const tokenKey = (code: string) => `temp-chat-token:${code}`;

export function createTempChatSessionStorage(
  getStorage: () =>
    Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined,
  now: () => number = Date.now,
) {
  const memory = new Map<string, string | null>();
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let snapshot = EMPTY_HISTORY;
  let nextExpiry = Infinity;

  function read(key: string) {
    if (memory.has(key)) return memory.get(key) ?? null;
    try {
      return getStorage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  function emit() {
    for (const listener of listeners) listener();
  }
  function write(key: string, value: string | null) {
    memory.set(key, value);
    try {
      const storage = getStorage();
      if (storage) {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      }
    } catch {
      /* Keep the successful session in memory when persistence fails. */
    }
    emit();
  }
  function getHistorySnapshot() {
    const raw = read(TEMP_CHAT_HISTORY_STORAGE_KEY);
    const time = now();
    if (raw === cachedRaw && time < nextExpiry) return snapshot;
    let parsed: unknown;
    try {
      parsed = raw ? JSON.parse(raw) : [];
    } catch {
      parsed = [];
    }
    const entries = Array.isArray(parsed)
      ? parsed.filter(isTempChatHistoryEntry)
      : [];
    const next = pruneExpiredTempChatHistory(entries, new Date(time));
    if (JSON.stringify(next) !== JSON.stringify(snapshot)) snapshot = next;
    cachedRaw = raw;
    nextExpiry = Math.min(...next.map((entry) => Date.parse(entry.expiresAt)));
    return snapshot;
  }
  return {
    getHistorySnapshot,
    getServerHistorySnapshot: () => EMPTY_HISTORY,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh: emit,
    onStorageChange(key: string | null) {
      if (key === null) memory.clear();
      else memory.delete(key);
      emit();
    },
    recordVisit(entry: TempChatHistoryEntry) {
      write(
        TEMP_CHAT_HISTORY_STORAGE_KEY,
        JSON.stringify(
          pruneExpiredTempChatHistory(
            mergeTempChatHistoryEntry(getHistorySnapshot(), entry),
            new Date(now()),
          ),
        ),
      );
    },
    readMember(code: string): StoredTempChatMember | undefined {
      try {
        const raw = read(tokenKey(code));
        const value: unknown = raw ? JSON.parse(raw) : null;
        if (
          value &&
          typeof value === 'object' &&
          'token' in value &&
          'memberId' in value &&
          'name' in value &&
          typeof value.token === 'string' &&
          value.token &&
          typeof value.memberId === 'string' &&
          typeof value.name === 'string'
        ) {
          return {
            token: value.token,
            memberId: value.memberId,
            name: value.name,
          };
        }
      } catch {
        /* Corrupt sessions behave as signed out. */
      }
      return undefined;
    },
    saveMember(code: string, member: StoredTempChatMember) {
      write(tokenKey(code), JSON.stringify(member));
    },
    clearMember(code: string) {
      write(tokenKey(code), null);
    },
    readName() {
      return read(NAME_KEY);
    },
    saveName(name: string) {
      write(NAME_KEY, name);
    },
    removeRoom(code: string) {
      write(tokenKey(code), null);
      write(
        TEMP_CHAT_HISTORY_STORAGE_KEY,
        JSON.stringify(
          getHistorySnapshot().filter((entry) => entry.code !== code),
        ),
      );
    },
  };
}

export const tempChatSessionStorage = createTempChatSessionStorage(() =>
  typeof window === 'undefined' ? undefined : window.localStorage,
);

export function subscribeToTempChatStorage(listener: () => void) {
  const unsubscribe = tempChatSessionStorage.subscribe(listener);
  const onStorage = (event: StorageEvent) =>
    tempChatSessionStorage.onStorageChange(event.key);
  const refresh = () => tempChatSessionStorage.refresh();
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  const timer = window.setInterval(refresh, 30_000);
  return () => {
    unsubscribe();
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', refresh);
    document.removeEventListener('visibilitychange', refresh);
    window.clearInterval(timer);
  };
}

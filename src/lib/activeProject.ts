const storageKey = (userId: string) => `msc_active_project_${userId}`;

const listeners = new Set<() => void>();

export function getStoredActiveProject(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function setStoredActiveProject(userId: string, homeId: string) {
  try {
    localStorage.setItem(storageKey(userId), homeId);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function clearStoredActiveProject(userId: string) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

export function subscribeActiveProject(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

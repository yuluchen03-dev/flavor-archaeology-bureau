const TOKEN_KEY = 'flavor_archaeology_token';
const USER_KEY = 'flavor_archaeology_user';

const storage = () => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
};

export function getAuthToken() {
  return storage()?.getItem(TOKEN_KEY) || '';
}

export function shouldLoadCurrentUser() {
  return Boolean(getAuthToken());
}

export function getStoredUser() {
  const raw = storage()?.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession({ token, user }) {
  const currentStorage = storage();
  if (!currentStorage) return;

  currentStorage.setItem(TOKEN_KEY, token || '');
  currentStorage.setItem(USER_KEY, JSON.stringify(user || null));
}

export function clearAuth() {
  const currentStorage = storage();
  if (!currentStorage) return;

  currentStorage.removeItem(TOKEN_KEY);
  currentStorage.removeItem(USER_KEY);
}

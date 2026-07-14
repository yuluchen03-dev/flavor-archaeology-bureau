import { getAuthToken } from './authStore';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || '请求失败');
  }

  return payload;
}

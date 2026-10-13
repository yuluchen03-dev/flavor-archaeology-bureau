// 统一 API 请求客户端
// 使用 credentials: 'include' 自动携带 httpOnly cookie，无需手动设置 Authorization header。
// 向后兼容：若响应中包含 token（旧客户端场景），也允许通过 options.headers 显式传递。

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

export async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || '请求失败');
  }

  return payload;
}

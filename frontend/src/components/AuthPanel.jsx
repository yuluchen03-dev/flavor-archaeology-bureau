import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import { clearAuth, getStoredUser, shouldLoadCurrentUser } from '../lib/authStore';

const emptyForm = { username: '', email: '', password: '' };

const AuthPanel = () => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [user, setUser] = useState(getStoredUser());
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!shouldLoadCurrentUser()) return;

    apiRequest('/auth/me')
      .then((payload) => {
        if (payload.success) setUser(payload.data.user);
      })
      .catch(() => {});
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setBusy(true);

    const body = mode === 'register'
      ? form
      : { email: form.email, password: form.password };

    try {
      const payload = await apiRequest(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setUser(payload.data.user);
      setForm(emptyForm);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // 登出接口失败不影响 UI 状态更新
    }
    clearAuth();
    setUser(null);
  };

  if (user) {
    return (
      <div className="archive-surface px-3 py-2 text-sm">
        <p className="text-[11px] leading-none tracking-[0.22em] text-tea-gold">已登录</p>
        <div className="mt-1 flex items-center justify-between gap-3 leading-tight">
          <p className="font-semibold text-ink truncate">{user.username || user.email}</p>
          <button type="button" onClick={logout} className="shrink-0 text-cinnabar hover:text-rouge">
            退出
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/auth relative flex justify-end">
      <button
        type="button"
        className="border border-cinnabar/25 bg-cinnabar/8 px-4 py-2 text-sm font-semibold tracking-wider text-cinnabar"
      >
        进入风味局
      </button>

      <form
        onSubmit={submit}
        className="archive-surface invisible absolute right-0 top-full z-50 mt-3 w-[260px] translate-y-2 px-3 py-2 text-sm opacity-0 transition-all duration-150 group-hover/auth:visible group-hover/auth:translate-y-0 group-hover/auth:opacity-100 group-focus-within/auth:visible group-focus-within/auth:translate-y-0 group-focus-within/auth:opacity-100"
      >
        <div className="mb-1.5 flex items-center gap-3 leading-tight">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={mode === 'login' ? 'font-semibold text-cinnabar' : 'text-smoke hover:text-cinnabar'}
          >
            登录
          </button>
          <span className="h-3 w-px bg-ink/20" />
          <button
            type="button"
            onClick={() => setMode('register')}
            className={mode === 'register' ? 'font-semibold text-cinnabar' : 'text-smoke hover:text-cinnabar'}
          >
            注册
          </button>
        </div>

        <div className="space-y-1.5">
          {mode === 'register' && (
          <input
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            placeholder="用户名"
            className="h-8 w-full border border-ink/10 bg-paper px-3 outline-none focus:border-cinnabar"
          />
          )}
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="邮箱"
            className="h-8 w-full border border-ink/10 bg-paper px-3 outline-none focus:border-cinnabar"
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            placeholder="密码"
            className="h-8 w-full border border-ink/10 bg-paper px-3 outline-none focus:border-cinnabar"
          />
        </div>

        {message && <p className="mt-2 text-rouge">{message}</p>}

        <button
          type="submit"
          disabled={busy || !form.email || !form.password || (mode === 'register' && !form.username)}
          className="mt-2 h-8 w-full bg-cinnabar px-4 text-paper transition-colors hover:bg-rouge disabled:opacity-40"
        >
          {busy ? '处理中...' : mode === 'register' ? '创建账号' : '进入风味局'}
        </button>
      </form>
    </div>
  );
};

export default AuthPanel;

// Cookie-aware 认证状态持久层
// 不再将 JWT 写入 localStorage（防 XSS），改为依赖 httpOnly cookie。
// getAuthToken() 与前端 fetch 的 credentials: 'include' 配合使用：
//   - 浏览器会自动携带 httpOnly cookie，无需手动设置 Authorization header
//   - 服务端 middleware/auth.js 优先读 cookie，回退 Authorization header
//
// 前端调用约定：
//   - 登录/注册后不再需要调用 setAuthSession() 持久化 token
//   - 登出调用 clearAuth() 后跳转首页即可（服务端会在下次请求时自动清除 cookie）

export function getAuthToken() {
  // 不再从 localStorage 读取（已迁移到 httpOnly cookie）
  // 若未来需要支持非浏览器环境（如 SSR），可在此处扩展
  return '';
}

export function shouldLoadCurrentUser() {
  // cookie 已存在时自动携带，无法在前端直接探测
  // 由 apiRequest 调用 /auth/me 来判断登录状态
  return true;
}

export function getStoredUser() {
  return null;
}

/**
 * @deprecated 保留此函数以便兼容旧调用方，实现为空（不再持久化到 localStorage）。
 * 前端应在收到登录/注册成功响应后直接更新组件状态，无需持久化 token。
 */
export function setAuthSession() {
  // 不再写入 localStorage，token 已通过 httpOnly cookie 下发
}

/**
 * @deprecated 保留此函数以便兼容旧调用方，实现为空。
 * 前端登出时应调用后端 /auth/logout 接口清除 cookie。
 */
export function clearAuth() {
  // 不再从 localStorage 清除（已迁移到 httpOnly cookie）
  // 实际登出应调用后端 API：POST /api/auth/logout
}

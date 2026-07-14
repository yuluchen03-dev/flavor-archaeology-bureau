// 离线进度持久化：优先使用 localStorage，捕获失败后回退到内存状态。
// 在 Node 测试环境（无 localStorage）下自动使用内存回退。

const STORAGE_KEY = 'fengwei_offline_progress_v2';

let memoryStore = null;
let memoryOnly = false;

function getStorage() {
  if (memoryOnly) return null;
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : null;
    if (!storage) {
      memoryOnly = true;
      return null;
    }
    return storage;
  } catch {
    memoryOnly = true;
    return null;
  }
}

export function saveProgress(state) {
  const storage = getStorage();
  if (!storage) {
    memoryStore = state || null;
    return 'memory';
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state || {}));
    return 'local';
  } catch {
    memoryOnly = true;
    memoryStore = state || null;
    return 'memory';
  }
}

export function loadProgress() {
  const storage = getStorage();
  if (!storage) {
    return memoryStore ? { ...memoryStore } : {};
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return memoryStore ? { ...memoryStore } : {};
  }
}

export function clearProgress() {
  const storage = getStorage();
  if (!storage) {
    memoryStore = null;
    return;
  }
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    memoryOnly = true;
    memoryStore = null;
  }
}

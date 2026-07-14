import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';

// 离线构建配置：产出一个自包含的单文件 HTML，不依赖服务器、CDN 或外部资源。
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-offline',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'offline.html'),
    },
  },
});

/**
 * 构建后处理：把 index.html 复制为 404.html，作为 SPA 兜底页。
 * GitHub Pages / 各类静态托管都会在找不到路径时返回 404.html。
 */
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const indexFile = join(distDir, 'index.html');
const notFoundFile = join(distDir, '404.html');

if (!existsSync(indexFile)) {
  console.error('[postbuild] 未找到 dist/index.html，请先执行 vite build');
  process.exit(1);
}

copyFileSync(indexFile, notFoundFile);
console.log('[postbuild] 已生成 dist/404.html');
console.log('[postbuild] dist 内容：' + readdirSync(distDir).join(', '));

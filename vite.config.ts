import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // 用相对路径：既能部署在域名根路径（如 WorkBuddy 托管），
  // 也能部署在子路径（如 GitHub Pages 的 /etf-dashboard/），无需改配置。
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // ECharts 体积较大且很少变动，拆成独立 chunk 便于浏览器长期缓存
        manualChunks: {
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
        },
      },
    },
  },
});

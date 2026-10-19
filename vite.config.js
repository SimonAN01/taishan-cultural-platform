import { defineConfig } from 'vite';
const backend = `http://127.0.0.1:${process.env.TAISHAN_PORT || 18605}`;

export default defineConfig({
  base: '/experience/',
  server: { proxy: { '/api': { target: backend, changeOrigin: false }, '/assets/photos': backend } },
  preview: { proxy: { '/api': { target: backend, changeOrigin: false }, '/assets/photos': backend } },
});

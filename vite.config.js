import { defineConfig } from 'vite';

export default defineConfig({
  base: '/experience/',
  server: { proxy: { '/api': 'http://127.0.0.1:18605' } },
});

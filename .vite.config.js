import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: [],
    force: true
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  server: {
    hmr: {
      protocol: 'ws'
    }
  }
}); 
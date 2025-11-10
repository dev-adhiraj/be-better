import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/extentionSettings/background.js'),
        content: resolve(__dirname, 'src/extentionSettings/content.js'),
        inject: resolve(__dirname, 'src/extentionSettings/inject.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  plugins: [react()],
  optimizeDeps: {
    include: ['antd']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    modules: {
      scopeBehaviour: 'global'   // ✅ sabhi .css files global treat hongi
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://demo.velvosoft.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
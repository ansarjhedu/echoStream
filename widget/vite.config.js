import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), cssInjectedByJsPlugin(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Force Vite to output a single file named "echo-widget.js"
        entryFileNames: 'echo-widget.js',
        assetFileNames: 'echo-widget.[ext]',
      },
    },
  },
})
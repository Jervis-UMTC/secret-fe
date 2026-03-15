import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // THIS IS THE FIX: Forces Vite to use esbuild instead of LightningCSS
  build: {
    cssMinify: 'esbuild',
  },
  plugins: [react(), tailwindcss()],
});
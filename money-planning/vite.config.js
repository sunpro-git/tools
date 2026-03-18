import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/money-planning/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
  },
});

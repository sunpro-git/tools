import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/zaiko/',
  build: {
    outDir: 'C:/Users/user117/claude_workspace/tools/zaiko/dist',
    emptyOutDir: true,
  },
});

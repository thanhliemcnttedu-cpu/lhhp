import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Ignore database files and git directories to prevent full page reloads when saving
      watch: {
        ignored: [
          '**/data/**',
          '**/data/classroom_database.json',
          '**/.git/**',
          '**/.agent/**',
          '**/dist/**',
          '**/*.json'
        ]
      },
    },
  };
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Polyfill process.env for the Google SDK to prevent build errors
    'process.env': {},
    '__APP_VERSION__': JSON.stringify(packageJson.version),
    '__BUILD_DATE__': JSON.stringify(new Date().toISOString()),
  }
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/hotel-breakdown-v1/',
  plugins: [react()],
});

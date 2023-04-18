import { join } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import renderer from 'vite-plugin-electron-renderer';
import checker from 'vite-plugin-checker';
import { svgInline } from './build/svg-inline';
import { svgrPlugin } from './build/vite-svgr-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 31521),
  },
  publicDir: join(__dirname, 'public'),
  resolve: {
    alias: {
      '~': join(__dirname, 'src'),
    },
  },
  define: {
    'process.env.BUILD_ENV': JSON.stringify(process.env.BUILD_ENV),
  },
  // base: prod ? './' : '/',
  build: {
    outDir: 'src/dist',
  },
  plugins: [
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint --ext ".js,.jsx,.ts,.tsx" ./src',
        dev: {
          // cwd provided by vite cannot be handled by eslint with forward slash on windows
          // https://github.com/eslint/eslint/issues/17042
          overrideConfig: {
            cwd: __dirname,
          },
        },
      },
      overlay: false,
    }),
    renderer({
      resolve: {
        'electron-store': { type: 'cjs' },
        'electron-log': { type: 'cjs' },
        'tar-stream': { type: 'cjs' },
      },
    }),
    react(),
    svgInline(),
    svgrPlugin(),
    !!process.env.analyze && visualizer({
      filename: join(__dirname, 'dist/stats.html'),
      open: true,
    }),
  ],
});

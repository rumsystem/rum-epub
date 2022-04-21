import { join } from 'path';
import { spawn } from 'child_process';
import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import commonjsExternalsPlugin from 'vite-plugin-commonjs-externals';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { svgInline } from './build/svg-inline';
import { svgrPlugin } from './build/vite-svgr-plugin';

// https://vitejs.dev/config/
export default async () => {
  const prod = process.env.NODE_ENV === 'production';
  const a = !!process.env.analyze;

  if (!prod) {
    const cp = spawn('node', [
      'node_modules/eslint-watch/bin/esw',
      '--color',
      '-w',
      'src',
    ]);
    cp.stdout.pipe(process.stdout);
    cp.stderr.pipe(process.stderr);
  }

  const ignores = [
    'electron',
    'electron-store',
    '@electron/remote',
    'fs-extra',
    'crypto',
    ...builtinModules.flatMap((p) => [p, `node:${p}`]),
  ];

  return defineConfig({
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
      'process.env.SSR': JSON.stringify(''),
      'process.env.IS_ELECTRON': JSON.stringify('true'),
    },
    base: prod ? './' : '/',

    build: {
      minify: false,
      outDir: 'src/dist',
      rollupOptions: {
        // external: ignores,
      },
      commonjsOptions: {
        ignore: ignores,
      },
    },
    optimizeDeps: {
      exclude: ignores,
    },
    plugins: [
      react(),
      a && visualizer({
        filename: join(__dirname, 'dist/stats.html'),
        open: true,
      }),
      svgInline(),
      svgrPlugin(),
      commonjsExternalsPlugin({
        externals: ignores,
      }),
    ],
  });
};

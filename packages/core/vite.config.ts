import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  resolve: {
    dedupe: ['lit', 'lit-html', 'reactive-element', '@open-wc/scoped-elements'],
    preserveSymlinks: false,
  },
  optimizeDeps: {
    include: ['lit', 'lit-html', 'reactive-element'],
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: pkg.name,
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^lit/, /^@lit/, /^@vydra-js/],
    },
    minify: false,
    sourcemap: true,
    // para mantener nombres de clases y funciones
    terserOptions: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
  plugins: [dts({ rollupTypes: true })],
});

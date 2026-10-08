import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  resolve: {
    dedupe: ['lit', 'lit-html', 'reactive-element', '@lit/context', '@open-wc/scoped-elements'],
    preserveSymlinks: false,
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: pkg.name,
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^lit/, /^@lit/, 'lit', /^@lit\/.*/,/^lit\/.*/, /^@vydra-js/],
    },
    minify: false,
    sourcemap: true,
  },
  plugins: [dts({ rollupTypes: true })],
});

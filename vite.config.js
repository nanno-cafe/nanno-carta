import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'./',build:{rollupOptions:{input:{menu:resolve('index.html'),admin:resolve('admin.html')}}}});

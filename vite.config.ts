import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import preact from '@preact/preset-vite';

function wmsProxyPlugin(): Plugin {
  let base = '/';

  const handler = async (req: any, res: any) => {
    try {
      const rawUrl = req.originalUrl || req.url || '';
      const requestUrl = new URL(rawUrl, 'http://localhost');
      const target = requestUrl.searchParams.get('target');

      if (!target) {
        res.statusCode = 400;
        res.setHeader('content-type', 'text/plain; charset=utf-8');
        res.end('Missing required query param: target');
        return;
      }

      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        res.statusCode = 400;
        res.setHeader('content-type', 'text/plain; charset=utf-8');
        res.end('Invalid target. Only http(s) URLs are allowed.');
        return;
      }

      const upstreamUrl = new URL(target);
      const forwardedParams = new URLSearchParams(requestUrl.search);
      forwardedParams.delete('target');
      forwardedParams.forEach((value, key) => {
        upstreamUrl.searchParams.append(key, value);
      });

      const method = req.method || 'GET';
      const headers: Record<string, string> = {};

      if (typeof req.headers?.accept === 'string') headers.accept = req.headers.accept;
      if (typeof req.headers?.['content-type'] === 'string') headers['content-type'] = req.headers['content-type'];
      headers['user-agent'] = 'hemswx-map-editor (vite wms-proxy)';

      let body: Buffer | undefined;
      if (method !== 'GET' && method !== 'HEAD') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        body = Buffer.concat(chunks);
      }

      const upstreamResponse = await fetch(upstreamUrl.toString(), {
        method,
        headers,
        body
      });

      res.statusCode = upstreamResponse.status;
      const contentType = upstreamResponse.headers.get('content-type');
      if (contentType) res.setHeader('content-type', contentType);

      const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
      res.end(buffer);
    } catch (error) {
      res.statusCode = 502;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end(`WMS proxy error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const applyMiddleware = (server: any) => {
    const prefix = base.endsWith('/') ? base : `${base}/`;
    server.middlewares.use(`${prefix}wms-proxy`, handler);
  };

  return {
    name: 'wms-proxy',
    configResolved(config) {
      base = config.base || '/';
      if (!base.startsWith('/')) base = `/${base}`;
    },
    configureServer(server) {
      applyMiddleware(server);
    },
    configurePreviewServer(server) {
      applyMiddleware(server);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [wmsProxyPlugin(), preact()],
  base: '/hemswx-map-editor/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    exclude: ['@arcgis/core']
  }
});

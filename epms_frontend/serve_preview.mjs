import { preview } from 'vite';

async function start() {
  try {
    const server = await preview({
      preview: {
        port: 5173,
        host: '0.0.0.0',
      }
    });
    server.printUrls();
    console.log('[Performax] Vite preview server is running on port 5173');
  } catch (err) {
    console.error('[Performax] Failed to start preview server:', err);
    process.exit(1);
  }
}

start();

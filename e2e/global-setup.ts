import { preview } from 'vite';

const previewUrl = 'http://127.0.0.1:4173';

async function previewIsAvailable(): Promise<boolean> {
  try {
    const response = await fetch(previewUrl, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  if (await previewIsAvailable()) return undefined;

  const server = await preview({
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  });

  return async () => {
    await new Promise<void>((resolve, reject) => {
      server.httpServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  };
}

import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const endpoints = [
  'api-src/integrations/google-drive/oauth/start.ts',
  'api-src/integrations/google-drive/oauth/callback.ts',
  'api-src/integrations/google-drive/status.ts',
  'api-src/integrations/google-drive/disconnect.ts',
  'api-src/integrations/google-drive/upload.ts',
  'api-src/integrations/google-drive/create-upload-session.ts',
  'api-src/integrations/google-drive/create-folders.ts',
  'api-src/integrations/google-drive/picker-token.ts',
  'api-src/integrations/google-drive/verify-folder.ts',
  'api-src/integrations/google-drive/file.ts',
];

async function buildAll() {
  console.log('⚡ Bundling serverless API endpoints for Vercel...');

  for (const entry of endpoints) {
    const entryPath = path.resolve(rootDir, entry);
    const outPath = path.resolve(rootDir, entry.replace(/^api-src\//, 'api/').replace(/\.ts$/, '.js'));

    await esbuild.build({
      entryPoints: [entryPath],
      outfile: outPath,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      minify: false,
      sourcemap: false,
    });

    console.log(`✓ Built ${entry} -> ${path.relative(rootDir, outPath)}`);
  }

  console.log('✨ Serverless API endpoints built successfully.');
}

buildAll().catch((err) => {
  console.error('Failed to build serverless endpoints:', err);
  process.exit(1);
});


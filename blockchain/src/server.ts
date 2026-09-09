import http from 'node:http';
import { createBlockchainAdapter } from './adapter/factory.js';
import { IBlockchainAdapter } from './adapter/IBlockchainAdapter.js';

export function createBlockchainServer(
  adapter: IBlockchainAdapter = createBlockchainAdapter()
): http.Server {
  const server = http.createServer(async (req, res) => {
    // Set CORS headers so Member 1 (ASP.NET) or local dev tools can call it freely
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Helper to send JSON
    const sendJson = (statusCode: number, data: unknown) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // Helper to read request body
    const readBody = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => resolve(body));
        req.on('error', (err) => reject(err));
      });
    };

    try {
      // 1. Health Check
      if (req.method === 'GET' && pathname === '/health') {
        const health = await adapter.isHealthy();
        sendJson(health.isConnected ? 200 : 503, health);
        return;
      }

      // 2. Anchor Evidence: POST /api/blockchain/anchor
      if (req.method === 'POST' && pathname === '/api/blockchain/anchor') {
        const rawBody = await readBody();
        const payload = JSON.parse(rawBody);

        const result = await adapter.anchorEvidence({
          evidenceId: payload.evidenceId,
          assetId: payload.assetId,
          evidenceHash: payload.evidenceHash,
          timestamp: payload.timestamp,
          signerReference: payload.signerReference || 'anonymous-signer',
        });

        const statusCode = result.status === 'ANCHORED' ? 201 : 400;
        sendJson(statusCode, result);
        return;
      }

      // 3. Verify Evidence: POST /api/blockchain/verify
      if (req.method === 'POST' && pathname === '/api/blockchain/verify') {
        const rawBody = await readBody();
        const payload = JSON.parse(rawBody);

        const result = await adapter.verifyEvidence({
          evidenceId: payload.evidenceId,
          calculatedHash: payload.calculatedHash,
        });

        sendJson(200, result);
        return;
      }

      // 4. Query Proof: GET /api/blockchain/proof/:evidenceId
      if (req.method === 'GET' && pathname.startsWith('/api/blockchain/proof/')) {
        const evidenceId = pathname.replace('/api/blockchain/proof/', '').trim();
        if (!evidenceId) {
          sendJson(400, { error: 'Missing evidenceId parameter' });
          return;
        }

        try {
          const proof = await adapter.getEvidenceProof(evidenceId);
          sendJson(200, proof);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          sendJson(404, { error: msg });
        }
        return;
      }

      // 404 Route Not Found
      sendJson(404, { error: `Route ${req.method} ${pathname} not found.` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sendJson(500, { error: 'Internal Blockchain Adapter Error', details: msg });
    }
  });

  return server;
}

// If executed directly as a script
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  const port = Number(process.env.BLOCKCHAIN_ADAPTER_PORT) || 5050;
  const server = createBlockchainServer();
  server.listen(port, () => {
    console.log(`[Industrial Evidence Chain] Blockchain Adapter Microservice running on http://localhost:${port}`);
    console.log(`- Health Check  : GET  http://localhost:${port}/health`);
    console.log(`- Anchor Proof  : POST http://localhost:${port}/api/blockchain/anchor`);
    console.log(`- Verify Hash   : POST http://localhost:${port}/api/blockchain/verify`);
    console.log(`- Query Proof   : GET  http://localhost:${port}/api/blockchain/proof/:id`);
  });
}

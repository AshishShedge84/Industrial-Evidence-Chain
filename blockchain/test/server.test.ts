import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createBlockchainServer } from '../src/server.js';
import { MockFabricAdapter } from '../src/adapter/mockAdapter.js';
import http from 'node:http';

describe('Blockchain HTTP REST Adapter Microservice (Member 1 Gateway)', () => {
  let server: http.Server;
  const TEST_PORT = 5099;
  const baseUrl = `http://localhost:${TEST_PORT}`;

  before(async () => {
    const adapter = new MockFabricAdapter();
    server = createBlockchainServer(adapter);
    await new Promise<void>((resolve) => server.listen(TEST_PORT, () => resolve()));
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /health returns 200 and network status', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = (await res.json()) as { isConnected: boolean; details: Record<string, unknown> };
    assert.strictEqual(body.isConnected, true);
    assert.strictEqual(body.details.channel, 'evidencechannel');
  });

  it('POST /api/blockchain/anchor successfully anchors a proof', async () => {
    const payload = {
      evidenceId: 'a82b7b51-4623-424a-9b4d-17849cb15d2a',
      assetId: 'a1111111-2222-3333-4444-555555555555',
      evidenceHash: 'cf78efa3bcbd9b887b944961237f76a31d8d88149f0533ace333fcb2f3aab11a',
      timestamp: '2026-09-02T14:30:00.000Z',
      signerReference: 'technician-alice',
    };

    const res = await fetch(`${baseUrl}/api/blockchain/anchor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 201);
    const body = (await res.json()) as { status: string; transactionId: string; proofReference: string };
    assert.strictEqual(body.status, 'ANCHORED');
    assert.ok(body.transactionId.startsWith('tx-fabric-'));
    assert.strictEqual(body.proofReference, `evidence:${payload.evidenceId}`);
  });

  it('POST /api/blockchain/verify returns VERIFIED on matching hash', async () => {
    const payload = {
      evidenceId: 'a82b7b51-4623-424a-9b4d-17849cb15d2a',
      calculatedHash: 'cf78efa3bcbd9b887b944961237f76a31d8d88149f0533ace333fcb2f3aab11a',
    };

    const res = await fetch(`${baseUrl}/api/blockchain/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as { isValid: boolean; status: string; trustedHash: string };
    assert.strictEqual(body.isValid, true);
    assert.strictEqual(body.status, 'VERIFIED');
    assert.strictEqual(body.trustedHash, payload.calculatedHash);
  });

  it('POST /api/blockchain/verify returns INTEGRITY_MISMATCH on modified hash', async () => {
    const payload = {
      evidenceId: 'a82b7b51-4623-424a-9b4d-17849cb15d2a',
      calculatedHash: '0000000000000000000000000000000000000000000000000000000000000000',
    };

    const res = await fetch(`${baseUrl}/api/blockchain/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as { isValid: boolean; status: string };
    assert.strictEqual(body.isValid, false);
    assert.strictEqual(body.status, 'INTEGRITY_MISMATCH');
  });

  it('GET /api/blockchain/proof/:id returns the on-ledger proof', async () => {
    const evidenceId = 'a82b7b51-4623-424a-9b4d-17849cb15d2a';
    const res = await fetch(`${baseUrl}/api/blockchain/proof/${evidenceId}`);

    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as { evidenceId: string; status: string };
    assert.strictEqual(body.evidenceId, evidenceId);
    assert.strictEqual(body.status, 'ANCHORED');
  });
});

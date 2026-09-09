import {
  IChaincodeContext,
  IChaincodeStub,
  IterationKV,
  StubIterator,
} from '../src/chaincode/types.js';

export class MockChaincodeStub implements IChaincodeStub {
  private state: Map<string, Uint8Array> = new Map();
  private txId = 'tx-mock-0001';
  private txTimestamp = { seconds: { low: Math.floor(Date.now() / 1000) }, nanos: 0 };

  public setTxID(txId: string): void {
    this.txId = txId;
  }

  public getTxID(): string {
    return this.txId;
  }

  public getTxTimestamp(): { seconds: { low: number; high?: number }; nanos: number } {
    return this.txTimestamp;
  }

  public async getState(key: string): Promise<Uint8Array | null> {
    return this.state.get(key) || null;
  }

  public async putState(key: string, value: Uint8Array): Promise<void> {
    this.state.set(key, value);
  }

  public async deleteState(key: string): Promise<void> {
    this.state.delete(key);
  }

  public createCompositeKey(objectType: string, attributes: string[]): string {
    return `\u0000${objectType}\u0000${attributes.join('\u0000')}\u0000`;
  }

  public splitCompositeKey(compositeKey: string): { objectType: string; attributes: string[] } {
    const parts = compositeKey.split('\u0000').filter((p) => p.length > 0);
    const objectType = parts[0];
    const attributes = parts.slice(1);
    return { objectType, attributes };
  }

  public async getStateByPartialCompositeKey(
    objectType: string,
    attributes: string[]
  ): Promise<StubIterator> {
    const prefix = `\u0000${objectType}\u0000${attributes.join('\u0000')}`;
    const matching: IterationKV[] = [];

    for (const [key, value] of this.state.entries()) {
      if (key.startsWith(prefix)) {
        matching.push({ key, value });
      }
    }

    let currentIndex = 0;
    return {
      next: async () => {
        if (currentIndex < matching.length) {
          const item = matching[currentIndex++];
          return { value: item, done: false };
        }
        return { done: true };
      },
      close: async () => {},
    };
  }

  public clear(): void {
    this.state.clear();
  }
}

export function createMockContext(txId = 'tx-mock-0001'): IChaincodeContext {
  const stub = new MockChaincodeStub();
  stub.setTxID(txId);
  return {
    stub,
    clientIdentity: {
      getMSPID: () => 'Org1MSP',
      getID: () => 'x509::/CN=TechnicianAdmin::/CN=FabricCA',
    },
  };
}

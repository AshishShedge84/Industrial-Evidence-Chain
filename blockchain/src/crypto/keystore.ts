import { generateEcdsaKeyPair } from './signer.js';
import { KeyPairPem } from './types.js';

export class DevKeyStore {
  private keys: Map<string, KeyPairPem> = new Map();

  constructor() {
    // Initialize default development identities
    this.registerIdentity('technician-alice');
    this.registerIdentity('inspector-bob');
    this.registerIdentity('manager-carol');
  }

  public registerIdentity(identityName: string): KeyPairPem {
    const keyPair = generateEcdsaKeyPair(identityName);
    this.keys.set(identityName, keyPair);
    return keyPair;
  }

  public getKeyPair(identityName: string): KeyPairPem | undefined {
    return this.keys.get(identityName);
  }

  public getPublicKey(identityName: string): string | undefined {
    return this.keys.get(identityName)?.publicKeyPem;
  }

  public listIdentities(): string[] {
    return Array.from(this.keys.keys());
  }
}

export const defaultDevKeyStore = new DevKeyStore();

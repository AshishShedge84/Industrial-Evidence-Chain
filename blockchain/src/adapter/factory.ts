import { IBlockchainAdapter } from './IBlockchainAdapter.js';
import { MockFabricAdapter } from './mockAdapter.js';

export function createBlockchainAdapter(mode?: string): IBlockchainAdapter {
  const selectedMode = mode || process.env.FABRIC_ADAPTER_MODE || 'mock';

  if (selectedMode === 'mock') {
    return new MockFabricAdapter();
  }

  // Live adapter will connect using connection profile when configured
  return new MockFabricAdapter();
}

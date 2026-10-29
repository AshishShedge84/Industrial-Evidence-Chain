/**
 * Industrial Evidence Chain - Cryptographic Integrity Utilities
 * High-performance SHA-256 hashing optimized for mobile browsers (iOS Safari & Chrome)
 * Supports chunked streaming to prevent high-memory allocations and UI thread freezing.
 */

// Initial SHA-256 state constants
const H_INIT = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

// SHA-256 round constants
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rightRotate(v: number, n: number): number {
  return (v >>> n) | (v << (32 - n));
}

class ChunkedSha256 {
  private h = new Uint32Array(H_INIT);
  private buffer = new Uint8Array(64);
  private bufferLength = 0;
  private totalBytes = 0;
  private w = new Uint32Array(64);

  update(chunk: Uint8Array) {
    let offset = 0;
    const len = chunk.length;
    this.totalBytes += len;

    while (offset < len) {
      const needed = 64 - this.bufferLength;
      const available = len - offset;
      const copyCount = Math.min(needed, available);

      this.buffer.set(chunk.subarray(offset, offset + copyCount), this.bufferLength);
      this.bufferLength += copyCount;
      offset += copyCount;

      if (this.bufferLength === 64) {
        this.processBlock(this.buffer);
        this.bufferLength = 0;
      }
    }
  }

  private processBlock(block: Uint8Array) {
    const w = this.w;
    const view = new DataView(block.buffer, block.byteOffset, 64);

    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = this.h[0];
    let b = this.h[1];
    let c = this.h[2];
    let d = this.h[3];
    let e = this.h[4];
    let f = this.h[5];
    let g = this.h[6];
    let h = this.h[7];

    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + K[i] + w[i]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    this.h[0] = (this.h[0] + a) | 0;
    this.h[1] = (this.h[1] + b) | 0;
    this.h[2] = (this.h[2] + c) | 0;
    this.h[3] = (this.h[3] + d) | 0;
    this.h[4] = (this.h[4] + e) | 0;
    this.h[5] = (this.h[5] + f) | 0;
    this.h[6] = (this.h[6] + g) | 0;
    this.h[7] = (this.h[7] + h) | 0;
  }

  digest(): string {
    // Pad message
    const pad = new Uint8Array(64);
    pad[0] = 0x80;

    const bitLength = BigInt(this.totalBytes) * 8n;
    const padLength = this.bufferLength < 56 ? 56 - this.bufferLength : 120 - this.bufferLength;

    const finalPadding = new Uint8Array(padLength + 8);
    finalPadding[0] = 0x80;

    const dataView = new DataView(finalPadding.buffer);
    dataView.setBigUint64(padLength, bitLength, false);

    this.update(finalPadding);

    let hex = '';
    for (let i = 0; i < 8; i++) {
      hex += this.h[i].toString(16).padStart(8, '0');
    }
    return hex;
  }
}

/**
 * Calculates SHA-256 hash of a file or Blob safely on any device.
 * Automatically switches to chunked processing for large files to avoid memory pressure on iOS Safari.
 */
export async function calculateFileSha256(
  file: File | Blob,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error('Cannot hash empty or invalid media file.');
  }

  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB slices for minimal memory footprint

  // For small files (< 16MB), native crypto.subtle is hardware-accelerated and fast
  if (file.size <= 16 * 1024 * 1024 && typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      if (onProgress) onProgress(100);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback to chunked hasher if WebCrypto fails or throws memory quota error
    }
  }

  // Chunked streaming hasher for large files or iOS memory constrained environments
  const hasher = new ChunkedSha256();
  let offset = 0;
  const total = file.size;

  while (offset < total) {
    const end = Math.min(offset + CHUNK_SIZE, total);
    const slice = file.slice(offset, end);
    const arrayBuffer = await slice.arrayBuffer();
    hasher.update(new Uint8Array(arrayBuffer));

    offset = end;
    if (onProgress) {
      onProgress(Math.round((offset / total) * 100));
    }

    // Yield control to the browser event loop every slice so UI never freezes
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return hasher.digest();
}

/**
 * Validates a captured media file for evidence submission
 */
export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No media file provided.' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'Media file is 0 bytes (empty capture).' };
  }
  const MAX_SIZE = 500 * 1024 * 1024; // 500MB maximum
  if (file.size > MAX_SIZE) {
    return { valid: false, error: `Media file exceeds 500MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).` };
  }
  return { valid: true };
}


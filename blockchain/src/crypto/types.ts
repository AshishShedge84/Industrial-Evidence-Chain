export interface KeyPairPem {
  publicKeyPem: string;
  privateKeyPem: string;
  keyId: string;
  algorithm: 'ECDSA-P256';
}

export interface SignatureResult {
  signatureHex: string;
  signerReference: string;
  algorithm: 'ECDSA-P256';
  payloadSigned: 'evidenceHash';
}

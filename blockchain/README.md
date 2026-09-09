# Industrial Evidence Chain — Blockchain & Integrity Subsystem

**Subsystem Owner**: Member 2 (Blockchain + Cryptography + Evidence Integrity)  
**Academic Year**: 2026–27 | Bharati Vidyapeeth Deemed to be University  

---

## 1. Overview

The Blockchain & Integrity Subsystem serves as the authoritative trust layer of the **Industrial Evidence Chain** platform. It provides:
1. **Deterministic Canonicalization**: RFC 8785 JSON Canonicalization Scheme (JCS) normalizing incoming evidence data across languages (.NET, TypeScript, Python).
2. **Authoritative SHA-256 Hashing**: Generates 64-character lowercase hexadecimal digests over normalized evidence payloads.
3. **Digital Signatures**: ECDSA NIST P-256 digital signature scheme for technician and device attribution.
4. **Hyperledger Fabric Smart Contract**: An immutable evidence proof chaincode (`EvidenceProofContract`) that stores cryptographic proofs, enforces duplicate rejection, and enables independent verification.
5. **Decoupled Blockchain Adapter**: A clean interface (`IBlockchainAdapter`) exposing `AnchorEvidence` and `VerifyEvidence` so Member 1 (.NET Web API) can integrate with the ledger without knowing Hyperledger Fabric internals.
6. **Integrity Verification**: Compares reconstructed off-chain hashes against on-ledger proofs to return `VERIFIED` or `INTEGRITY MISMATCH`.

---

## 2. Directory Layout

```
blockchain/
├── src/
│   ├── canonicalizer/       # RFC 8785 canonicalization engine & types
│   ├── hashing/             # SHA-256 hashing module
│   ├── crypto/              # ECDSA P-256 signatures & keystore
│   ├── chaincode/           # Hyperledger Fabric EvidenceProofContract
│   ├── adapter/             # IBlockchainAdapter, mock and gateway adapters
│   ├── verification/        # Verification pipeline & report generator
│   └── index.ts             # Primary library exports
├── test/                    # Automated unit, security, and contract test suites
├── scripts/
│   └── tamper-demonstration.ts  # 10-step mandatory tamper demonstration
├── experiments/
│   └── run-all-benchmarks.ts    # Hardware research measurement framework
├── network/                 # Hyperledger Fabric 2.5 LTS Docker compose & config
├── package.json
└── tsconfig.json
```

---

## 3. Quick Start & Execution Commands

### Run All Automated Tests (44 Tests Passing)
```bash
npm run test:ts
```

### Run Mandatory Tamper Demonstration (Step 1 to Step 10)
```bash
npm run demo:tamper
```

### Execute Empirical Research Benchmarks
```bash
npm run experiment:all
```

### Build TypeScript to JavaScript
```bash
npm run build
```

---

## 4. Architectural Rules & Security Guarantees

1. **No Large Files On-Chain**: Images, videos, and PDFs remain strictly off-chain in object storage; only the 64-character SHA-256 hash and metadata are stored on the ledger.
2. **Immutable Proofs**: Once an evidence proof is anchored, the chaincode permanently rejects any attempts to overwrite or modify it.
3. **No False ANCHORED Results**: Transactions report `ANCHORED` only upon confirmation. Failures safely transition to `FAILED`.
4. **Zero Secrets in Git**: Keystore secrets and private keys are never committed, logged, or stored on-ledger.

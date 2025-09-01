import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha256.js';
import { randomBytes } from 'crypto';

// STH (Signed Tree Head) structure
export interface STH {
  root: string;
  timestamp: number;
  signatures: {
    sig1?: string;
    sig2?: string;
    sig3?: string;
  };
}

// Get cosigner keys from environment or generate dev keys
function getCosignerKeys(): { privateKeys: string[]; publicKeys: string[] } {
  const privateKeys: string[] = [];
  const publicKeys: string[] = [];
  
  for (let i = 1; i <= 3; i++) {
    const envKey = process.env[`COSIGN_SK${i}`];
    if (envKey) {
      privateKeys.push(envKey);
      const pubKey = ed25519.getPublicKey(Buffer.from(envKey, 'hex'));
      publicKeys.push(Buffer.from(pubKey).toString('hex'));
    } else {
      // Generate dev key if not provided
      const privKey = ed25519.utils.randomPrivateKey();
      const pubKey = ed25519.getPublicKey(privKey);
      privateKeys.push(Buffer.from(privKey).toString('hex'));
      publicKeys.push(Buffer.from(pubKey).toString('hex'));
      console.log(`[Cosign] Generated dev key for cosigner ${i}`);
    }
  }
  
  return { privateKeys, publicKeys };
}

// Sign STH with multiple cosigners
export function signSTH(root: string, timestamp: number): STH {
  const { privateKeys } = getCosignerKeys();
  
  // Create canonical STH message
  const sthMessage = Buffer.concat([
    Buffer.from(root, 'hex'),
    Buffer.from(timestamp.toString())
  ]);
  
  const sthHash = sha256(sthMessage);
  
  // Sign with each cosigner
  const signatures: STH['signatures'] = {};
  
  if (privateKeys[0]) {
    const sig = ed25519.sign(sthHash, Buffer.from(privateKeys[0], 'hex'));
    signatures.sig1 = Buffer.from(sig).toString('hex');
  }
  
  if (privateKeys[1]) {
    const sig = ed25519.sign(sthHash, Buffer.from(privateKeys[1], 'hex'));
    signatures.sig2 = Buffer.from(sig).toString('hex');
  }
  
  if (privateKeys[2]) {
    const sig = ed25519.sign(sthHash, Buffer.from(privateKeys[2], 'hex'));
    signatures.sig3 = Buffer.from(sig).toString('hex');
  }
  
  return {
    root,
    timestamp,
    signatures
  };
}

// Verify STH signatures (2-of-3 policy)
export function verifySTH(sth: STH): boolean {
  const { publicKeys } = getCosignerKeys();
  
  // Create canonical STH message
  const sthMessage = Buffer.concat([
    Buffer.from(sth.root, 'hex'),
    Buffer.from(sth.timestamp.toString())
  ]);
  
  const sthHash = sha256(sthMessage);
  
  let validSignatures = 0;
  
  // Verify each signature
  if (sth.signatures.sig1 && publicKeys[0]) {
    try {
      const valid = ed25519.verify(
        Buffer.from(sth.signatures.sig1, 'hex'),
        sthHash,
        Buffer.from(publicKeys[0], 'hex')
      );
      if (valid) validSignatures++;
    } catch {}
  }
  
  if (sth.signatures.sig2 && publicKeys[1]) {
    try {
      const valid = ed25519.verify(
        Buffer.from(sth.signatures.sig2, 'hex'),
        sthHash,
        Buffer.from(publicKeys[1], 'hex')
      );
      if (valid) validSignatures++;
    } catch {}
  }
  
  if (sth.signatures.sig3 && publicKeys[2]) {
    try {
      const valid = ed25519.verify(
        Buffer.from(sth.signatures.sig3, 'hex'),
        sthHash,
        Buffer.from(publicKeys[2], 'hex')
      );
      if (valid) validSignatures++;
    } catch {}
  }
  
  // Require at least 2 valid signatures
  return validSignatures >= 2;
}

// Get cosigner public keys for client verification
export function getCosignerPublicKeys(): string[] {
  const { publicKeys } = getCosignerKeys();
  return publicKeys;
}
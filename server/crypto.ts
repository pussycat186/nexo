import crypto from 'crypto';
import nacl from 'tweetnacl';
import * as util from 'tweetnacl-util';

const encodeBase64 = util.encodeBase64;
const decodeBase64 = util.decodeBase64;

// Ed25519 signature verification
export function verifyEd25519Signature(message: string, signature: string, publicKey: string): boolean {
  try {
    const messageBytes = Buffer.from(message, 'utf-8');
    const signatureBytes = decodeBase64(signature);
    const publicKeyBytes = decodeBase64(publicKey);
    
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Ed25519 to X25519 conversion
export function ed25519ToX25519(ed25519PublicKey: string): string {
  try {
    const ed25519Bytes = decodeBase64(ed25519PublicKey);
    // For server-side, we'll store the X25519 key directly from client
    // Real conversion would use nacl.box.keyPair.fromSecretKey
    return ed25519PublicKey; // Placeholder - client will provide X25519 key
  } catch (error) {
    console.error('Key conversion error:', error);
    return '';
  }
}

// HKDF implementation
export function hkdfExtract(salt: Buffer, ikm: Buffer): Buffer {
  return crypto.createHmac('sha256', salt).update(ikm).digest();
}

export function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  const n = Math.ceil(length / 32);
  let okm = Buffer.alloc(0);
  let t = Buffer.alloc(0);
  
  for (let i = 1; i <= n; i++) {
    t = crypto.createHmac('sha256', prk)
      .update(Buffer.concat([t, info, Buffer.from([i])]))
      .digest();
    okm = Buffer.concat([okm, t]);
  }
  
  return okm.slice(0, length);
}

export function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, length: number): Buffer {
  const prk = hkdfExtract(salt, ikm);
  return hkdfExpand(prk, info, length);
}

// Simple STH chain implementation with proper leaf storage
export class STHChain {
  private idx = 0;
  private root = Buffer.alloc(32);
  private leaves: Map<number, Buffer> = new Map();

  append(leaf: Buffer): { idx: number; root: Buffer; leaf: Buffer } {
    this.idx++;
    const hash = crypto.createHash('sha256');
    hash.update(this.root);
    hash.update(leaf);
    this.root = hash.digest();
    this.leaves.set(this.idx, leaf);
    return { idx: this.idx, root: this.root, leaf };
  }

  getRoot(): Buffer {
    return this.root;
  }

  getLeaf(idx: number): Buffer | undefined {
    return this.leaves.get(idx);
  }

  getIndex(): number {
    return this.idx;
  }

  // Generate inclusion proof (simplified - real implementation would use Merkle tree)
  getInclusionProof(leafIndex: number): { leaf: string; root: string; index: number } | null {
    const leaf = this.leaves.get(leafIndex);
    if (!leaf) return null;
    
    return {
      leaf: leaf.toString('base64'),
      root: this.root.toString('base64'),
      index: leafIndex
    };
  }
}

// Generate secure random tokens
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Generate challenge nonce
export function generateChallenge(): string {
  return crypto.randomBytes(32).toString('base64url');
}
import { ed25519 } from '@noble/curves/ed25519.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha256.js';
import { randomBytes } from 'crypto';

// Generate Ed25519 keypair for signing
export function generateSigningKeypair() {
  const privKey = ed25519.utils.randomPrivateKey();
  const pubKey = ed25519.getPublicKey(privKey);
  return {
    privateKey: Buffer.from(privKey).toString('hex'),
    publicKey: Buffer.from(pubKey).toString('hex')
  };
}

// Generate X25519 keypair for encryption
export function generateEncryptionKeypair() {
  const privKey = x25519.utils.randomPrivateKey();
  const pubKey = x25519.getPublicKey(privKey);
  return {
    privateKey: Buffer.from(privKey).toString('hex'),
    publicKey: Buffer.from(pubKey).toString('hex')
  };
}

// Sign data with Ed25519
export function sign(data: Buffer | string, privateKey: string): string {
  const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
  const privKey = Buffer.from(privateKey, 'hex');
  const signature = ed25519.sign(dataBuffer, privKey);
  return Buffer.from(signature).toString('hex');
}

// Verify Ed25519 signature
export function verify(data: Buffer | string, signature: string, publicKey: string): boolean {
  try {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
    const sig = Buffer.from(signature, 'hex');
    const pubKey = Buffer.from(publicKey, 'hex');
    return ed25519.verify(sig, dataBuffer, pubKey);
  } catch {
    return false;
  }
}

// Perform X25519 ECDH key exchange
export function deriveSharedSecret(privateKey: string, publicKey: string): Buffer {
  const privKey = Buffer.from(privateKey, 'hex');
  const pubKey = Buffer.from(publicKey, 'hex');
  const shared = x25519.getSharedSecret(privKey, pubKey);
  return Buffer.from(shared);
}

// Derive session key using HKDF
export function deriveSessionKey(
  sharedSecret: Buffer,
  salt?: Buffer,
  info: string = 'nexo-session-v1'
): Buffer {
  const actualSalt = salt || randomBytes(32);
  const derived = hkdf(sha256, sharedSecret, actualSalt, Buffer.from(info), 32);
  return Buffer.from(derived);
}

// Generate device identifier
export function generateDeviceId(): string {
  return randomBytes(16).toString('hex');
}

// Generate message ID
export function generateMessageId(): string {
  return randomBytes(16).toString('hex');
}

// Hash data with SHA-256
export function hash(data: Buffer | string): string {
  const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
  return Buffer.from(sha256(dataBuffer)).toString('hex');
}
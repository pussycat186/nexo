import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// AEAD encryption using AES-256-GCM
export function encrypt(
  plaintext: Buffer | string,
  key: Buffer,
  aad?: Buffer
): { ciphertext: Buffer; nonce: Buffer; tag: Buffer } {
  const nonce = randomBytes(12); // 96-bit nonce for GCM
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  
  if (aad) {
    cipher.setAAD(aad);
  }
  
  const plaintextBuffer = typeof plaintext === 'string' ? Buffer.from(plaintext) : plaintext;
  const ciphertext = Buffer.concat([
    cipher.update(plaintextBuffer),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  return { ciphertext, nonce, tag };
}

// AEAD decryption using AES-256-GCM
export function decrypt(
  ciphertext: Buffer,
  key: Buffer,
  nonce: Buffer,
  tag: Buffer,
  aad?: Buffer
): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  
  if (aad) {
    decipher.setAAD(aad);
  }
  
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);
  
  return plaintext;
}

// Pack encrypted message for transport
export function packEncrypted(
  ciphertext: Buffer,
  nonce: Buffer,
  tag: Buffer
): Buffer {
  // Format: [1 byte nonce length][nonce][1 byte tag length][tag][ciphertext]
  const nonceLen = Buffer.from([nonce.length]);
  const tagLen = Buffer.from([tag.length]);
  return Buffer.concat([nonceLen, nonce, tagLen, tag, ciphertext]);
}

// Unpack encrypted message from transport
export function unpackEncrypted(packed: Buffer): {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
} {
  let offset = 0;
  
  const nonceLen = packed[offset];
  offset += 1;
  
  const nonce = packed.slice(offset, offset + nonceLen);
  offset += nonceLen;
  
  const tagLen = packed[offset];
  offset += 1;
  
  const tag = packed.slice(offset, offset + tagLen);
  offset += tagLen;
  
  const ciphertext = packed.slice(offset);
  
  return { ciphertext, nonce, tag };
}
import sodium from 'libsodium-wrappers';

export interface CryptoInterface {
  generateKeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  generateX25519KeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  ed25519ToCurve25519Public(ed25519PublicKey: string): Promise<string>;
  ed25519ToCurve25519Private(ed25519PrivateKey: string): Promise<string>;
  sign(message: string, privateKey: string): Promise<string>;
  sealMessage(message: string, key: Uint8Array, aad: Uint8Array): Promise<{ cipher: string; nonce: string }>;
  openMessage(cipher: string, nonce: string, key: Uint8Array, aad: Uint8Array): Promise<string>;
  deriveSessionKey(sharedSecret: Uint8Array, salt: string, keyIndex?: number): Promise<Uint8Array>;
  computeSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array>;
  generateNonce(): string;
  verifySTHInclusion(leaf: string, root: string, index: number): boolean;
}

class RealCrypto implements CryptoInterface {
  private ready: Promise<void>;

  constructor() {
    this.ready = sodium.ready;
  }

  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    await this.ready;
    const keypair = sodium.crypto_sign_keypair();
    return {
      publicKey: sodium.to_base64(keypair.publicKey),
      privateKey: sodium.to_base64(keypair.privateKey)
    };
  }

  async generateX25519KeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    await this.ready;
    const keypair = sodium.crypto_box_keypair();
    return {
      publicKey: sodium.to_base64(keypair.publicKey),
      privateKey: sodium.to_base64(keypair.privateKey)
    };
  }

  async ed25519ToCurve25519Public(ed25519PublicKey: string): Promise<string> {
    await this.ready;
    const ed25519Bytes = sodium.from_base64(ed25519PublicKey);
    const x25519Bytes = sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519Bytes);
    return sodium.to_base64(x25519Bytes);
  }

  async ed25519ToCurve25519Private(ed25519PrivateKey: string): Promise<string> {
    await this.ready;
    const ed25519Bytes = sodium.from_base64(ed25519PrivateKey);
    const x25519Bytes = sodium.crypto_sign_ed25519_sk_to_curve25519(ed25519Bytes);
    return sodium.to_base64(x25519Bytes);
  }

  async sign(message: string, privateKey: string): Promise<string> {
    await this.ready;
    const messageBytes = sodium.from_string(message);
    const privateKeyBytes = sodium.from_base64(privateKey);
    const signature = sodium.crypto_sign_detached(messageBytes, privateKeyBytes);
    return sodium.to_base64(signature);
  }

  async sealMessage(message: string, key: Uint8Array, aad: Uint8Array): Promise<{ cipher: string; nonce: string }> {
    await this.ready;
    const messageBytes = sodium.from_string(message);
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
    
    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      messageBytes,
      aad,
      null,
      nonce,
      key
    );
    
    return {
      cipher: sodium.to_base64(ciphertext),
      nonce: sodium.to_base64(nonce)
    };
  }

  async openMessage(cipher: string, nonce: string, key: Uint8Array, aad: Uint8Array): Promise<string> {
    await this.ready;
    const cipherBytes = sodium.from_base64(cipher);
    const nonceBytes = sodium.from_base64(nonce);
    
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      cipherBytes,
      aad,
      nonceBytes,
      key
    );
    
    return sodium.to_string(plaintext);
  }

  async deriveSessionKey(sharedSecret: Uint8Array, salt: string, keyIndex: number = 0): Promise<Uint8Array> {
    await this.ready;
    
    // HKDF implementation using sodium
    const saltBytes = sodium.from_string(salt);
    const info = sodium.from_string(`nexo-session-${keyIndex}`);
    
    // Extract phase (HKDF-Extract)
    const prk = sodium.crypto_auth(sharedSecret, saltBytes);
    
    // Expand phase (HKDF-Expand)
    const keyLength = 32; // 256 bits for XChaCha20-Poly1305
    const key = new Uint8Array(keyLength);
    
    let okm = new Uint8Array(0);
    let t = new Uint8Array(0);
    
    for (let i = 1; okm.length < keyLength; i++) {
      const input = new Uint8Array(t.length + info.length + 1);
      input.set(t);
      input.set(info, t.length);
      input[t.length + info.length] = i;
      
      t = sodium.crypto_auth(input, prk);
      const newOkm = new Uint8Array(okm.length + t.length);
      newOkm.set(okm);
      newOkm.set(t, okm.length);
      okm = newOkm;
    }
    
    key.set(okm.slice(0, keyLength));
    return key;
  }

  async computeSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array> {
    await this.ready;
    const privateKeyBytes = sodium.from_base64(privateKey);
    const publicKeyBytes = sodium.from_base64(publicKey);
    
    // Perform X25519 ECDH
    const sharedSecret = sodium.crypto_scalarmult(privateKeyBytes, publicKeyBytes);
    return sharedSecret;
  }

  generateNonce(): string {
    return sodium.to_base64(sodium.randombytes_buf(24));
  }

  verifySTHInclusion(leaf: string, root: string, index: number): boolean {
    // Simplified verification - in production would verify Merkle proof
    // For MVP, just check that leaf and root are present
    return leaf.length > 0 && root.length > 0 && index > 0;
  }
}

export const cryptoService: CryptoInterface = new RealCrypto();

// Device key storage with session key rotation
export class DeviceKeys {
  private ed25519Keys: { publicKey: string; privateKey: string } | null = null;
  private x25519Keys: { publicKey: string; privateKey: string } | null = null;
  private sessionKeys: Map<string, { key: Uint8Array; index: number; messageCount: number }> = new Map();

  async generateKeys() {
    this.ed25519Keys = await cryptoService.generateKeyPair();
    
    // Derive X25519 keys from Ed25519
    const x25519PublicKey = await cryptoService.ed25519ToCurve25519Public(this.ed25519Keys.publicKey);
    const x25519PrivateKey = await cryptoService.ed25519ToCurve25519Private(this.ed25519Keys.privateKey);
    
    this.x25519Keys = {
      publicKey: x25519PublicKey,
      privateKey: x25519PrivateKey
    };
    
    // Store in localStorage
    localStorage.setItem('nexo:ed25519', JSON.stringify(this.ed25519Keys));
    localStorage.setItem('nexo:x25519', JSON.stringify(this.x25519Keys));
  }

  loadKeys() {
    const ed25519Stored = localStorage.getItem('nexo:ed25519');
    const x25519Stored = localStorage.getItem('nexo:x25519');
    
    if (ed25519Stored) this.ed25519Keys = JSON.parse(ed25519Stored);
    if (x25519Stored) this.x25519Keys = JSON.parse(x25519Stored);
  }

  getEd25519PublicKey(): string | null {
    return this.ed25519Keys?.publicKey || null;
  }

  getX25519PublicKey(): string | null {
    return this.x25519Keys?.publicKey || null;
  }

  getEd25519PrivateKey(): string | null {
    return this.ed25519Keys?.privateKey || null;
  }

  getX25519PrivateKey(): string | null {
    return this.x25519Keys?.privateKey || null;
  }

  async sign(message: string): Promise<string> {
    if (!this.ed25519Keys) throw new Error('No Ed25519 keys available');
    return cryptoService.sign(message, this.ed25519Keys.privateKey);
  }

  async computeSharedSecret(peerPublicKey: string): Promise<Uint8Array> {
    if (!this.x25519Keys) throw new Error('No X25519 keys available');
    return cryptoService.computeSharedSecret(this.x25519Keys.privateKey, peerPublicKey);
  }

  async getOrCreateSessionKey(conversationId: string, peerPublicKey: string): Promise<{ key: Uint8Array; index: number; shouldRotate: boolean }> {
    const existing = this.sessionKeys.get(conversationId);
    
    // Check if rotation needed (every 20 messages)
    if (existing && existing.messageCount >= 20) {
      // Rotate key
      const sharedSecret = await this.computeSharedSecret(peerPublicKey);
      const newIndex = existing.index + 1;
      const newKey = await cryptoService.deriveSessionKey(sharedSecret, conversationId, newIndex);
      
      this.sessionKeys.set(conversationId, {
        key: newKey,
        index: newIndex,
        messageCount: 0
      });
      
      return { key: newKey, index: newIndex, shouldRotate: true };
    }
    
    if (existing) {
      // Increment message count
      existing.messageCount++;
      return { key: existing.key, index: existing.index, shouldRotate: false };
    }
    
    // Create new session key
    const sharedSecret = await this.computeSharedSecret(peerPublicKey);
    const key = await cryptoService.deriveSessionKey(sharedSecret, conversationId, 0);
    
    this.sessionKeys.set(conversationId, {
      key,
      index: 0,
      messageCount: 1
    });
    
    return { key, index: 0, shouldRotate: false };
  }

  clearSessionKey(conversationId: string) {
    this.sessionKeys.delete(conversationId);
  }

  clearAllKeys() {
    this.ed25519Keys = null;
    this.x25519Keys = null;
    this.sessionKeys.clear();
    localStorage.removeItem('nexo:ed25519');
    localStorage.removeItem('nexo:x25519');
    localStorage.removeItem('nexo:device_id');
    localStorage.removeItem('nexo:tokens');
  }
}

export const deviceKeys = new DeviceKeys();
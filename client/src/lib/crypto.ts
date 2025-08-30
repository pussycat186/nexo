// Note: libsodium-wrappers would need to be installed via package manager
// For now, we'll create a mock implementation that follows the interface

export interface CryptoInterface {
  generateKeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  generateX25519KeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  ed25519ToCurve25519(ed25519PublicKey: string): Promise<string>;
  sign(message: string, privateKey: string): Promise<string>;
  sealMessage(message: string, key: Uint8Array, aad: Uint8Array): Promise<{ cipher: string; nonce: string }>;
  openMessage(cipher: string, nonce: string, key: Uint8Array, aad: Uint8Array): Promise<string>;
  deriveSessionKey(sharedSecret: Uint8Array, salt: string): Promise<Uint8Array>;
  computeSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array>;
}

class MockCrypto implements CryptoInterface {
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    // Mock implementation - in production this would use libsodium
    const publicKey = btoa(crypto.getRandomValues(new Uint8Array(32)).join(','));
    const privateKey = btoa(crypto.getRandomValues(new Uint8Array(64)).join(','));
    return { publicKey, privateKey };
  }

  async generateX25519KeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const publicKey = btoa(crypto.getRandomValues(new Uint8Array(32)).join(','));
    const privateKey = btoa(crypto.getRandomValues(new Uint8Array(32)).join(','));
    return { publicKey, privateKey };
  }

  async ed25519ToCurve25519(ed25519PublicKey: string): Promise<string> {
    // Mock conversion
    return btoa(crypto.getRandomValues(new Uint8Array(32)).join(','));
  }

  async sign(message: string, privateKey: string): Promise<string> {
    // Mock signature
    return btoa(crypto.getRandomValues(new Uint8Array(64)).join(','));
  }

  async sealMessage(message: string, key: Uint8Array, aad: Uint8Array): Promise<{ cipher: string; nonce: string }> {
    // Mock encryption
    const nonce = btoa(crypto.getRandomValues(new Uint8Array(24)).join(','));
    const cipher = btoa(message + '_encrypted_' + Math.random());
    return { cipher, nonce };
  }

  async openMessage(cipher: string, nonce: string, key: Uint8Array, aad: Uint8Array): Promise<string> {
    // Mock decryption
    const decoded = atob(cipher);
    return decoded.replace(/_encrypted_.*$/, '');
  }

  async deriveSessionKey(sharedSecret: Uint8Array, salt: string): Promise<Uint8Array> {
    // Mock key derivation
    return crypto.getRandomValues(new Uint8Array(32));
  }

  async computeSharedSecret(privateKey: string, publicKey: string): Promise<Uint8Array> {
    // Mock shared secret computation
    return crypto.getRandomValues(new Uint8Array(32));
  }
}

export const cryptoService: CryptoInterface = new MockCrypto();

// Device key storage
export class DeviceKeys {
  private ed25519Keys: { publicKey: string; privateKey: string } | null = null;
  private x25519Keys: { publicKey: string; privateKey: string } | null = null;

  async generateKeys() {
    this.ed25519Keys = await cryptoService.generateKeyPair();
    this.x25519Keys = await cryptoService.generateX25519KeyPair();
    
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

  async sign(message: string): Promise<string> {
    if (!this.ed25519Keys) throw new Error('No Ed25519 keys available');
    return cryptoService.sign(message, this.ed25519Keys.privateKey);
  }

  async computeSharedSecret(peerPublicKey: string): Promise<Uint8Array> {
    if (!this.x25519Keys) throw new Error('No X25519 keys available');
    return cryptoService.computeSharedSecret(this.x25519Keys.privateKey, peerPublicKey);
  }
}

export const deviceKeys = new DeviceKeys();

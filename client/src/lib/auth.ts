import { apiRequest } from "./queryClient";
import { deviceKeys } from "./crypto";

export interface AuthTokens {
  access: string;
  refresh: string;
}

export class AuthManager {
  private tokens: AuthTokens | null = null;

  constructor() {
    this.loadTokens();
  }

  private loadTokens() {
    const stored = localStorage.getItem('nexo:tokens');
    if (stored) {
      this.tokens = JSON.parse(stored);
    }
  }

  private saveTokens(tokens: AuthTokens) {
    this.tokens = tokens;
    localStorage.setItem('nexo:tokens', JSON.stringify(tokens));
  }

  async register(handle: string): Promise<{ nonce: string; exp: number }> {
    // Generate device keys if not already done
    if (!deviceKeys.getEd25519PublicKey()) {
      await deviceKeys.generateKeys();
    }

    const deviceId = crypto.randomUUID();
    const ed25519Pub = deviceKeys.getEd25519PublicKey()!;

    const response = await apiRequest('POST', '/api/auth/register', {
      handle,
      device_id: deviceId,
      ed25519_pub: ed25519Pub
    });

    const result = await response.json();
    
    // Store device ID for verification
    localStorage.setItem('nexo:device_id', deviceId);
    
    return result;
  }

  async verify(nonce: string): Promise<void> {
    const deviceId = localStorage.getItem('nexo:device_id');
    if (!deviceId) throw new Error('No device ID found');

    // Sign the nonce
    const signature = await deviceKeys.sign(nonce);

    const response = await apiRequest('POST', '/api/auth/verify', {
      device_id: deviceId,
      signature
    });

    const tokens = await response.json();
    this.saveTokens(tokens);
  }

  getAccessToken(): string | null {
    return this.tokens?.access || null;
  }

  isAuthenticated(): boolean {
    return !!this.tokens?.access;
  }

  logout() {
    this.tokens = null;
    localStorage.removeItem('nexo:tokens');
    localStorage.removeItem('nexo:device_id');
    localStorage.removeItem('nexo:ed25519');
    localStorage.removeItem('nexo:x25519');
  }

  getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export const authManager = new AuthManager();

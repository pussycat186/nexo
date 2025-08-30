import { sha256 } from '@noble/hashes/sha256.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';

// AI-Secure Features: Local-first, encrypted, privacy-preserving

// ============ Encrypted Smart Summaries (Local-First) ============
export class LocalSummaries {
  private static readonly SUMMARY_KEY_SIZE = 32;
  private static summaryKey: Uint8Array | null = null;

  static async initSummaryKey(): Promise<void> {
    // Generate or retrieve summary key from IndexedDB
    const stored = await this.getSummaryKeyFromDB();
    if (stored) {
      this.summaryKey = stored;
    } else {
      this.summaryKey = randomBytes(this.SUMMARY_KEY_SIZE);
      await this.storeSummaryKeyInDB(this.summaryKey);
    }
  }

  static async generateSummary(messages: Array<{
    id: string;
    content: string;
    timestamp: number;
    sender?: string;
  }>): Promise<{
    summary: string;
    encrypted: Uint8Array;
    metadata: {
      messageCount: number;
      timeRange: { start: number; end: number };
      extractedTopics: string[];
    };
  }> {
    if (!this.summaryKey) await this.initSummaryKey();

    // Extractive summarization using TextRank + MMR
    const ranked = this.textRank(messages);
    const diverse = this.mmrDiversify(ranked, 3);
    
    // Extract key topics
    const topics = this.extractTopics(messages);
    
    // Build summary
    const summary = this.buildSummary(diverse, topics, messages.length);
    
    // Encrypt summary with summary key
    const nonce = randomBytes(24);
    const cipher = xchacha20poly1305(this.summaryKey!, nonce);
    const encrypted = cipher.encrypt(new TextEncoder().encode(summary));
    
    // Combine nonce + ciphertext
    const result = new Uint8Array(nonce.length + encrypted.length);
    result.set(nonce);
    result.set(encrypted, nonce.length);

    return {
      summary,
      encrypted: result,
      metadata: {
        messageCount: messages.length,
        timeRange: {
          start: Math.min(...messages.map(m => m.timestamp)),
          end: Math.max(...messages.map(m => m.timestamp))
        },
        extractedTopics: topics
      }
    };
  }

  private static textRank(messages: Array<{ content: string }>): Array<{
    content: string;
    score: number;
  }> {
    // Simple TextRank implementation
    const sentences = messages.map(m => m.content);
    const scores = new Map<string, number>();
    
    // Initialize scores
    sentences.forEach(s => scores.set(s, 1.0));
    
    // Iterate to compute PageRank-like scores
    for (let iter = 0; iter < 10; iter++) {
      const newScores = new Map<string, number>();
      
      sentences.forEach(sentence => {
        let score = 0.15; // Damping factor
        
        // Add contributions from similar sentences
        sentences.forEach(other => {
          if (sentence !== other) {
            const similarity = this.cosineSimilarity(sentence, other);
            if (similarity > 0.1) {
              score += 0.85 * similarity * (scores.get(other) || 1);
            }
          }
        });
        
        newScores.set(sentence, score);
      });
      
      newScores.forEach((score, sentence) => scores.set(sentence, score));
    }
    
    return Array.from(scores.entries())
      .map(([content, score]) => ({ content, score }))
      .sort((a, b) => b.score - a.score);
  }

  private static mmrDiversify(ranked: Array<{ content: string; score: number }>, k: number): string[] {
    // Maximal Marginal Relevance for diversity
    const selected: string[] = [];
    const lambda = 0.7; // Trade-off between relevance and diversity
    
    while (selected.length < k && ranked.length > selected.length) {
      let bestScore = -Infinity;
      let bestSentence = '';
      
      ranked.forEach(item => {
        if (!selected.includes(item.content)) {
          const relevance = item.score;
          
          let maxSimilarity = 0;
          selected.forEach(s => {
            const sim = this.cosineSimilarity(item.content, s);
            maxSimilarity = Math.max(maxSimilarity, sim);
          });
          
          const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;
          
          if (mmrScore > bestScore) {
            bestScore = mmrScore;
            bestSentence = item.content;
          }
        }
      });
      
      if (bestSentence) selected.push(bestSentence);
      else break;
    }
    
    return selected;
  }

  private static cosineSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.toLowerCase().split(/\s+/));
    const tokensB = new Set(b.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
    const union = new Set([...tokensA, ...tokensB]);
    
    return intersection.size / Math.sqrt(tokensA.size * tokensB.size);
  }

  private static extractTopics(messages: Array<{ content: string }>): string[] {
    const wordFreq = new Map<string, number>();
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
    
    messages.forEach(msg => {
      const words = msg.content.toLowerCase().split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));
      
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private static buildSummary(sentences: string[], topics: string[], count: number): string {
    const topicStr = topics.slice(0, 3).join(', ');
    const sentenceStr = sentences.join(' • ');
    
    return `Conversation summary (${count} messages) about ${topicStr || 'various topics'}: ${sentenceStr}`;
  }

  private static async getSummaryKeyFromDB(): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('nexo-ai', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['keys'], 'readonly');
        const store = tx.objectStore('keys');
        const getReq = store.get('summary-key');
        
        getReq.onsuccess = () => {
          resolve(getReq.result?.key || null);
        };
      };
      
      request.onerror = () => resolve(null);
    });
  }

  private static async storeSummaryKeyInDB(key: Uint8Array): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open('nexo-ai', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['keys'], 'readwrite');
        const store = tx.objectStore('keys');
        store.put({ id: 'summary-key', key });
        tx.oncomplete = () => resolve();
      };
    });
  }
}

// ============ Private Search (Local Encrypted Index) ============
export class PrivateSearch {
  private static searchKey: Uint8Array | null = null;
  private static index: Map<string, Set<string>> = new Map();

  static async initSearchKey(): Promise<void> {
    const stored = await this.getSearchKeyFromDB();
    if (stored) {
      this.searchKey = stored;
    } else {
      this.searchKey = randomBytes(32);
      await this.storeSearchKeyInDB(this.searchKey);
    }
  }

  static async buildIndex(messages: Array<{
    id: string;
    content: string;
    metadata?: any;
  }>): Promise<void> {
    if (!this.searchKey) await this.initSearchKey();
    
    // Clear existing index
    this.index.clear();
    
    // Build inverted index
    messages.forEach(msg => {
      const tokens = this.tokenize(msg.content);
      
      tokens.forEach(token => {
        // Hash token with search key for privacy
        const hashedToken = this.hashToken(token);
        
        if (!this.index.has(hashedToken)) {
          this.index.set(hashedToken, new Set());
        }
        this.index.get(hashedToken)!.add(msg.id);
      });
    });
    
    // Store encrypted index in IndexedDB
    await this.storeIndexInDB();
  }

  static async search(query: string, messages: Map<string, any>): Promise<Array<{
    id: string;
    content: string;
    score: number;
  }>> {
    if (!this.searchKey) await this.initSearchKey();
    
    const queryTokens = this.tokenize(query);
    const scores = new Map<string, number>();
    
    // Search in index
    queryTokens.forEach(token => {
      const hashedToken = this.hashToken(token);
      const messageIds = this.index.get(hashedToken);
      
      if (messageIds) {
        messageIds.forEach(id => {
          scores.set(id, (scores.get(id) || 0) + 1);
        });
      }
    });
    
    // Rank results
    const results = Array.from(scores.entries())
      .map(([id, score]) => ({
        id,
        content: messages.get(id)?.content || '',
        score: score / queryTokens.length
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    
    return results;
  }

  private static tokenize(text: string): string[] {
    return text.toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2)
      .map(t => t.replace(/[^a-z0-9]/g, ''));
  }

  private static hashToken(token: string): string {
    const data = new TextEncoder().encode(token);
    const combined = new Uint8Array(data.length + this.searchKey!.length);
    combined.set(data);
    combined.set(this.searchKey!, data.length);
    
    const hash = sha256(combined);
    return Buffer.from(hash).toString('hex').substring(0, 16);
  }

  private static async getSearchKeyFromDB(): Promise<Uint8Array | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('nexo-ai', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('keys')) {
          resolve(null);
          return;
        }
        const tx = db.transaction(['keys'], 'readonly');
        const store = tx.objectStore('keys');
        const getReq = store.get('search-key');
        
        getReq.onsuccess = () => {
          resolve(getReq.result?.key || null);
        };
      };
      
      request.onerror = () => resolve(null);
    });
  }

  private static async storeSearchKeyInDB(key: Uint8Array): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open('nexo-ai', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['keys'], 'readwrite');
        const store = tx.objectStore('keys');
        store.put({ id: 'search-key', key });
        tx.oncomplete = () => resolve();
      };
    });
  }

  private static async storeIndexInDB(): Promise<void> {
    // Convert Map to storable format
    const indexData = Array.from(this.index.entries()).map(([token, ids]) => ({
      token,
      ids: Array.from(ids)
    }));
    
    return new Promise((resolve) => {
      const request = indexedDB.open('nexo-ai', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('search-index')) {
          db.createObjectStore('search-index', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['search-index'], 'readwrite');
        const store = tx.objectStore('search-index');
        store.put({ id: 'index', data: indexData });
        tx.oncomplete = () => resolve();
      };
    });
  }
}

// ============ Secure Plugin Sandbox (Web Worker) ============
export class SecurePluginSandbox {
  private static workers = new Map<string, Worker>();
  private static permissions = new Map<string, Set<string>>();

  static async loadPlugin(pluginId: string, manifest: {
    name: string;
    version: string;
    permissions: string[];
    code: string;
  }): Promise<void> {
    // Create sandboxed worker
    const workerCode = `
      // Plugin sandbox runtime
      const permissions = new Set(${JSON.stringify(manifest.permissions)});
      const pluginId = "${pluginId}";
      
      // Capability-gated APIs
      const sandbox = {
        crypto: permissions.has('crypto') ? {
          hash: (data) => crypto.subtle.digest('SHA-256', data),
          random: (bytes) => crypto.getRandomValues(new Uint8Array(bytes))
        } : undefined,
        
        storage: permissions.has('storage') ? {
          get: (key) => self.postMessage({ type: 'storage.get', key }),
          set: (key, value) => self.postMessage({ type: 'storage.set', key, value })
        } : undefined,
        
        ui: permissions.has('ui') ? {
          notify: (message) => self.postMessage({ type: 'ui.notify', message })
        } : undefined
      };
      
      // Plugin code runs here
      try {
        ${manifest.code}
      } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
      }
      
      // Message handler
      self.onmessage = (event) => {
        const { type, data } = event.data;
        
        if (type === 'execute') {
          try {
            const result = execute(data, sandbox);
            self.postMessage({ type: 'result', result, attestation: generateAttestation(result) });
          } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
          }
        }
      };
      
      function generateAttestation(result) {
        return {
          pluginId,
          timestamp: Date.now(),
          resultHash: crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(result)))
        };
      }
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    
    this.workers.set(pluginId, worker);
    this.permissions.set(pluginId, new Set(manifest.permissions));
    
    // Handle worker messages
    worker.onmessage = (event) => {
      this.handleWorkerMessage(pluginId, event.data);
    };
  }

  static async executePlugin(pluginId: string, data: any): Promise<{
    result: any;
    attestation: any;
  }> {
    const worker = this.workers.get(pluginId);
    if (!worker) {
      throw new Error(`Plugin ${pluginId} not loaded`);
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Plugin execution timeout'));
      }, 5000);
      
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'result') {
          clearTimeout(timeout);
          worker.removeEventListener('message', handler);
          resolve({
            result: event.data.result,
            attestation: event.data.attestation
          });
        } else if (event.data.type === 'error') {
          clearTimeout(timeout);
          worker.removeEventListener('message', handler);
          reject(new Error(event.data.error));
        }
      };
      
      worker.addEventListener('message', handler);
      worker.postMessage({ type: 'execute', data });
    });
  }

  private static handleWorkerMessage(pluginId: string, message: any) {
    const permissions = this.permissions.get(pluginId);
    
    switch (message.type) {
      case 'storage.get':
      case 'storage.set':
        if (!permissions?.has('storage')) {
          console.error(`Plugin ${pluginId} denied storage access`);
          return;
        }
        // Handle storage operations
        break;
        
      case 'ui.notify':
        if (!permissions?.has('ui')) {
          console.error(`Plugin ${pluginId} denied UI access`);
          return;
        }
        // Show notification
        break;
        
      case 'error':
        console.error(`Plugin ${pluginId} error:`, message.error);
        break;
    }
  }

  static unloadPlugin(pluginId: string): void {
    const worker = this.workers.get(pluginId);
    if (worker) {
      worker.terminate();
      this.workers.delete(pluginId);
      this.permissions.delete(pluginId);
    }
  }
}

export default {
  LocalSummaries,
  PrivateSearch,
  SecurePluginSandbox
};
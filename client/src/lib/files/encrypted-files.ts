import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils';

// Encrypted File Handling System
export class EncryptedFiles {
  private static readonly CHUNK_SIZE = 64 * 1024; // 64KB chunks
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
  
  static async encryptFile(file: File, fileKey?: Uint8Array): Promise<{
    chunks: Array<{
      index: number;
      encrypted: Uint8Array;
      hash: string;
    }>;
    manifest: {
      name: string;
      size: number;
      type: string;
      chunks: number;
      hashes: string[];
      nonce: Uint8Array;
    };
    key: Uint8Array;
  }> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    // Generate or use provided key
    const key = fileKey || randomBytes(32);
    const nonce = randomBytes(24);
    
    // Read file
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    
    // Split into chunks
    const chunks: Array<{ index: number; encrypted: Uint8Array; hash: string }> = [];
    const hashes: string[] = [];
    
    for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
      const chunk = data.slice(i, Math.min(i + this.CHUNK_SIZE, data.length));
      const chunkIndex = Math.floor(i / this.CHUNK_SIZE);
      
      // Create chunk-specific nonce
      const chunkNonce = new Uint8Array(24);
      chunkNonce.set(nonce);
      chunkNonce[0] = chunkIndex; // Vary nonce per chunk
      
      // Encrypt chunk
      const cipher = xchacha20poly1305(key, chunkNonce);
      const encrypted = cipher.encrypt(chunk);
      
      // Hash encrypted chunk
      const hash = Buffer.from(sha256(encrypted)).toString('hex');
      
      chunks.push({
        index: chunkIndex,
        encrypted,
        hash
      });
      
      hashes.push(hash);
    }
    
    return {
      chunks,
      manifest: {
        name: file.name,
        size: file.size,
        type: file.type,
        chunks: chunks.length,
        hashes,
        nonce
      },
      key
    };
  }
  
  static async decryptFile(
    chunks: Array<{ encrypted: Uint8Array; index: number }>,
    manifest: {
      name: string;
      size: number;
      type: string;
      chunks: number;
      hashes: string[];
      nonce: Uint8Array;
    },
    key: Uint8Array
  ): Promise<File> {
    // Verify chunks
    if (chunks.length !== manifest.chunks) {
      throw new Error('Invalid number of chunks');
    }
    
    // Sort chunks by index
    const sortedChunks = chunks.sort((a, b) => a.index - b.index);
    
    // Decrypt and verify each chunk
    const decryptedChunks: Uint8Array[] = [];
    
    for (const chunk of sortedChunks) {
      // Verify hash
      const hash = Buffer.from(sha256(chunk.encrypted)).toString('hex');
      if (hash !== manifest.hashes[chunk.index]) {
        throw new Error(`Chunk ${chunk.index} hash mismatch`);
      }
      
      // Create chunk-specific nonce
      const chunkNonce = new Uint8Array(24);
      chunkNonce.set(manifest.nonce);
      chunkNonce[0] = chunk.index;
      
      // Decrypt chunk
      const cipher = xchacha20poly1305(key, chunkNonce);
      const decrypted = cipher.decrypt(chunk.encrypted);
      
      decryptedChunks.push(decrypted);
    }
    
    // Combine chunks
    const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of decryptedChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Create File object
    return new File([combined], manifest.name, { type: manifest.type });
  }
  
  static async uploadEncryptedFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{
    fileId: string;
    manifest: any;
    key: Uint8Array;
  }> {
    // Encrypt file
    const { chunks, manifest, key } = await this.encryptFile(file);
    
    // Generate file ID
    const fileId = this.generateFileId();
    
    // Store chunks in IndexedDB (for demo, in production would upload to server)
    await this.storeChunksInDB(fileId, chunks, manifest);
    
    // Simulate upload progress
    if (onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        onProgress(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    return { fileId, manifest, key };
  }
  
  static async downloadEncryptedFile(
    fileId: string,
    key: Uint8Array,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    // Retrieve chunks from IndexedDB (in production would download from server)
    const { chunks, manifest } = await this.getChunksFromDB(fileId);
    
    // Simulate download progress
    if (onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        onProgress(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Decrypt file
    return this.decryptFile(chunks, manifest, key);
  }
  
  private static generateFileId(): string {
    return Buffer.from(randomBytes(16)).toString('hex');
  }
  
  private static async storeChunksInDB(
    fileId: string,
    chunks: Array<{ index: number; encrypted: Uint8Array; hash: string }>,
    manifest: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nexo-files', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: ['fileId', 'index'] });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['files', 'chunks'], 'readwrite');
        
        // Store manifest
        tx.objectStore('files').put({
          id: fileId,
          manifest,
          timestamp: Date.now()
        });
        
        // Store chunks
        const chunkStore = tx.objectStore('chunks');
        chunks.forEach(chunk => {
          chunkStore.put({
            fileId,
            index: chunk.index,
            encrypted: chunk.encrypted,
            hash: chunk.hash
          });
        });
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  private static async getChunksFromDB(fileId: string): Promise<{
    chunks: Array<{ encrypted: Uint8Array; index: number }>;
    manifest: any;
  }> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nexo-files', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['files', 'chunks'], 'readonly');
        
        // Get manifest
        const fileReq = tx.objectStore('files').get(fileId);
        
        fileReq.onsuccess = () => {
          const file = fileReq.result;
          if (!file) {
            reject(new Error('File not found'));
            return;
          }
          
          // Get chunks
          const chunks: Array<{ encrypted: Uint8Array; index: number }> = [];
          const chunkStore = tx.objectStore('chunks');
          const range = IDBKeyRange.bound([fileId, 0], [fileId, Number.MAX_VALUE]);
          const cursorReq = chunkStore.openCursor(range);
          
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              chunks.push({
                encrypted: cursor.value.encrypted,
                index: cursor.value.index
              });
              cursor.continue();
            } else {
              resolve({
                chunks,
                manifest: file.manifest
              });
            }
          };
        };
        
        tx.onerror = () => reject(tx.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  static async deleteFile(fileId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nexo-files', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['files', 'chunks'], 'readwrite');
        
        // Delete manifest
        tx.objectStore('files').delete(fileId);
        
        // Delete chunks
        const chunkStore = tx.objectStore('chunks');
        const range = IDBKeyRange.bound([fileId, 0], [fileId, Number.MAX_VALUE]);
        const cursorReq = chunkStore.openCursor(range);
        
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}

// File Attachment Component Helper
export class FileAttachmentHelper {
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  
  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('text') || mimeType.includes('document')) return '📝';
    return '📎';
  }
  
  static async generateThumbnail(file: File): Promise<string | null> {
    if (!file.type.startsWith('image/')) return null;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          
          // Generate 150x150 thumbnail
          const size = 150;
          canvas.width = size;
          canvas.height = size;
          
          // Scale and center image
          const scale = Math.min(size / img.width, size / img.height);
          const x = (size - img.width * scale) / 2;
          const y = (size - img.height * scale) / 2;
          
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }
}

export default {
  EncryptedFiles,
  FileAttachmentHelper
};
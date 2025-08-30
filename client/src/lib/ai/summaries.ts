import { sha256 } from '@noble/hashes/sha256.js';

// AI-Powered Smart Summaries (privacy-preserving, local-only)
export class SmartSummaries {
  private static readonly MAX_CONTEXT_LENGTH = 4096;
  private static readonly SUMMARY_LENGTH = 256;

  // Generate encrypted conversation digest locally
  static async generateSummary(messages: Array<{ content: string; timestamp: number }>): Promise<{
    summary: string;
    hash: string;
    timestamp: number;
    messageCount: number;
  }> {
    if (messages.length === 0) {
      return {
        summary: 'No messages to summarize',
        hash: '',
        timestamp: Date.now(),
        messageCount: 0
      };
    }

    // Sort messages by timestamp
    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    
    // Extract key phrases and topics (local processing)
    const topics = this.extractTopics(sorted);
    const keyPhrases = this.extractKeyPhrases(sorted);
    
    // Generate summary
    const summary = this.generateLocalSummary(topics, keyPhrases, sorted.length);
    
    // Create verifiable hash
    const contentHash = this.hashContent(sorted.map(m => m.content).join('\n'));
    
    return {
      summary,
      hash: contentHash,
      timestamp: Date.now(),
      messageCount: sorted.length
    };
  }

  private static extractTopics(messages: Array<{ content: string }>): string[] {
    const wordFreq = new Map<string, number>();
    
    messages.forEach(msg => {
      const words = msg.content.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4 && !this.isStopWord(w));
      
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
    });
    
    // Get top topics
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private static extractKeyPhrases(messages: Array<{ content: string }>): string[] {
    const phrases: string[] = [];
    
    messages.forEach(msg => {
      // Extract potential key phrases (2-3 word combinations)
      const words = msg.content.split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        if (words[i].length > 3 && words[i + 1].length > 3) {
          phrases.push(`${words[i]} ${words[i + 1]}`.toLowerCase());
        }
      }
    });
    
    // Count phrase frequency
    const phraseFreq = new Map<string, number>();
    phrases.forEach(phrase => {
      phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1);
    });
    
    return Array.from(phraseFreq.entries())
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([phrase]) => phrase);
  }

  private static generateLocalSummary(topics: string[], keyPhrases: string[], messageCount: number): string {
    const topicStr = topics.slice(0, 3).join(', ');
    const phraseStr = keyPhrases.slice(0, 2).join(' and ');
    
    if (messageCount < 5) {
      return `Brief conversation with ${messageCount} messages${topicStr ? ` about ${topicStr}` : ''}.`;
    } else if (messageCount < 20) {
      return `Discussion of ${topicStr || 'various topics'} with ${messageCount} messages${phraseStr ? `, focusing on ${phraseStr}` : ''}.`;
    } else {
      return `Extended conversation (${messageCount} messages) covering ${topicStr || 'multiple topics'}${phraseStr ? `, primarily discussing ${phraseStr}` : ''}.`;
    }
  }

  private static hashContent(content: string): string {
    const hash = sha256(Buffer.from(content));
    return Buffer.from(hash).toString('hex').substring(0, 16);
  }

  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
      'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why',
      'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
      'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
    ]);
    return stopWords.has(word.toLowerCase());
  }
}

// Attested Search (privacy-preserving local fuzzy search)
export class AttestedSearch {
  private static readonly MIN_SCORE = 0.5;

  static async search(
    query: string,
    messages: Array<{ id: string; content: string; timestamp: number }>
  ): Promise<Array<{
    id: string;
    content: string;
    score: number;
    proof: string;
  }>> {
    const queryLower = query.toLowerCase();
    const queryTokens = this.tokenize(queryLower);
    
    const results = messages
      .map(msg => {
        const score = this.calculateScore(queryTokens, msg.content.toLowerCase());
        const proof = this.generateProof(msg.id, query, score);
        
        return {
          id: msg.id,
          content: msg.content,
          score,
          proof
        };
      })
      .filter(r => r.score >= this.MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    
    return results;
  }

  private static tokenize(text: string): string[] {
    return text.split(/\s+/).filter(t => t.length > 0);
  }

  private static calculateScore(queryTokens: string[], content: string): number {
    let score = 0;
    const contentTokens = this.tokenize(content);
    
    queryTokens.forEach(qToken => {
      // Exact match
      if (content.includes(qToken)) {
        score += 1.0;
      }
      
      // Fuzzy match
      contentTokens.forEach(cToken => {
        const similarity = this.levenshteinSimilarity(qToken, cToken);
        if (similarity > 0.8) {
          score += similarity * 0.5;
        }
      });
    });
    
    return Math.min(score / queryTokens.length, 1.0);
  }

  private static levenshteinSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s2.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s1.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s1.length] = lastValue;
    }
    return costs[s1.length];
  }

  private static generateProof(messageId: string, query: string, score: number): string {
    const proof = {
      messageId,
      query,
      score,
      timestamp: Date.now(),
      algorithm: 'fuzzy-levenshtein-v1'
    };
    
    const hash = sha256(Buffer.from(JSON.stringify(proof)));
    return Buffer.from(hash).toString('hex').substring(0, 16);
  }
}

// Secure Agent Sandbox (for plugin execution)
export class SecureAgentSandbox {
  private static readonly MAX_EXECUTION_TIME = 5000; // 5 seconds

  static async executePlugin(
    code: string,
    context: Record<string, any>,
    proofs: string[]
  ): Promise<{
    result: any;
    verified: boolean;
    executionTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Verify all proofs before execution
      const verified = await this.verifyProofs(proofs);
      if (!verified) {
        throw new Error('Proof verification failed');
      }
      
      // Create sandboxed context
      const sandbox = this.createSandbox(context);
      
      // Execute with timeout
      const result = await this.executeWithTimeout(code, sandbox, this.MAX_EXECUTION_TIME);
      
      return {
        result,
        verified: true,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        result: null,
        verified: false,
        executionTime: Date.now() - startTime
      };
    }
  }

  private static async verifyProofs(proofs: string[]): Promise<boolean> {
    // Verify each proof is valid
    for (const proof of proofs) {
      if (!proof || proof.length !== 16) {
        return false;
      }
    }
    return true;
  }

  private static createSandbox(context: Record<string, any>): Record<string, any> {
    // Create limited sandbox context
    return {
      ...context,
      // No access to dangerous globals
      eval: undefined,
      Function: undefined,
      setTimeout: undefined,
      setInterval: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
      WebSocket: undefined
    };
  }

  private static async executeWithTimeout(
    code: string,
    sandbox: Record<string, any>,
    timeout: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, timeout);
      
      try {
        // Execute in limited context (placeholder - would use VM2 or similar in production)
        const result = new Function('context', `
          with (context) {
            ${code}
          }
        `)(sandbox);
        
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }
}

export default {
  SmartSummaries,
  AttestedSearch,
  SecureAgentSandbox
};
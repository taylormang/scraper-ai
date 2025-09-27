import { Page } from 'puppeteer';

export interface NavigationPattern {
  selector: string;
  domain: string;
  navigationPrompt: string;
  successCount: number;
  lastUsed: Date;
  created: Date;
  metadata?: {
    elementText?: string;
    elementTag?: string;
    elementClasses?: string[];
  };
}

export interface CacheStats {
  totalPatterns: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
}

export class NavigationPatternCache {
  private patterns: Map<string, NavigationPattern> = new Map();
  private stats = {
    hits: 0,
    misses: 0
  };

  private getCacheKey(domain: string, navigationPrompt: string): string {
    // Normalize domain (remove protocol, www, trailing slashes)
    const normalizedDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');

    // Normalize prompt (lowercase, trim)
    const normalizedPrompt = navigationPrompt.toLowerCase().trim();

    return `${normalizedDomain}:${normalizedPrompt}`;
  }

  /**
   * Try to find a cached navigation pattern for the given domain and prompt
   */
  async getCachedPattern(page: Page, domain: string, navigationPrompt: string): Promise<NavigationPattern | null> {
    const cacheKey = this.getCacheKey(domain, navigationPrompt);
    const cachedPattern = this.patterns.get(cacheKey);

    if (!cachedPattern) {
      this.stats.misses++;
      return null;
    }

    // Validate that the cached selector still exists on the page
    const isValid = await this.validatePattern(page, cachedPattern);

    if (isValid) {
      // Update usage stats
      cachedPattern.lastUsed = new Date();
      cachedPattern.successCount++;
      this.patterns.set(cacheKey, cachedPattern);
      this.stats.hits++;

      console.log(`🎯 Using cached navigation pattern: ${cachedPattern.selector} (used ${cachedPattern.successCount} times)`);
      return cachedPattern;
    } else {
      // Remove invalid pattern
      console.log(`🗑️  Removing invalid cached pattern: ${cachedPattern.selector}`);
      this.patterns.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Store a successful navigation pattern for future use
   */
  async storePattern(page: Page, domain: string, navigationPrompt: string, selector: string): Promise<void> {
    const cacheKey = this.getCacheKey(domain, navigationPrompt);

    // Extract metadata about the element for better debugging
    const metadata = await this.extractElementMetadata(page, selector);

    const pattern: NavigationPattern = {
      selector,
      domain: this.normalizeDomain(domain),
      navigationPrompt: navigationPrompt.toLowerCase().trim(),
      successCount: 1,
      lastUsed: new Date(),
      created: new Date(),
      metadata
    };

    this.patterns.set(cacheKey, pattern);

    console.log(`💾 Cached navigation pattern: ${selector} for "${navigationPrompt}" on ${pattern.domain}`);
    if (metadata?.elementText) {
      console.log(`   Element text: "${metadata.elementText}"`);
    }
  }

  /**
   * Validate that a cached pattern still works on the current page
   */
  private async validatePattern(page: Page, pattern: NavigationPattern): Promise<boolean> {
    try {
      // Check if element exists
      const element = await page.$(pattern.selector);
      if (!element) {
        return false;
      }

      // Check if element is visible and clickable
      const isVisible = await element.isIntersectingViewport();
      if (!isVisible) {
        // Element exists but not visible - still might be valid (could be scrolled to)
        const boundingBox = await element.boundingBox();
        if (!boundingBox) {
          return false;
        }
      }

      // Additional validation: check if element text/content roughly matches
      if (pattern.metadata?.elementText) {
        const currentText = await element.evaluate(el => el.textContent?.trim() || '');
        const cachedText = pattern.metadata.elementText;

        // Flexible text matching - allow for minor variations
        if (currentText && cachedText) {
          const similarity = this.calculateTextSimilarity(currentText, cachedText);
          if (similarity < 0.5) { // Less than 50% similarity
            console.log(`⚠️  Pattern text mismatch: expected "${cachedText}", found "${currentText}"`);
            return false;
          }
        }
      }

      return true;

    } catch (error) {
      console.log(`❌ Pattern validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Extract metadata about an element for pattern validation
   */
  private async extractElementMetadata(page: Page, selector: string): Promise<NavigationPattern['metadata']> {
    try {
      const element = await page.$(selector);
      if (!element) return undefined;

      const metadata = await element.evaluate(el => ({
        elementText: el.textContent?.trim() || '',
        elementTag: el.tagName.toLowerCase(),
        elementClasses: Array.from(el.classList)
      }));

      return metadata;

    } catch (error) {
      console.log(`⚠️  Could not extract element metadata: ${error}`);
      return undefined;
    }
  }

  /**
   * Calculate text similarity between two strings (simple approach)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;
    if (!text1 || !text2) return 0.0;

    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) return 1.0;

    // Simple edit distance approximation
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize domain for consistent caching
   */
  private normalizeDomain(domain: string): string {
    return domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      totalPatterns: this.patterns.size,
      cacheHits: this.stats.hits,
      cacheMisses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0
    };
  }

  /**
   * Clear all cached patterns (useful for testing or debugging)
   */
  clearCache(): void {
    this.patterns.clear();
    this.stats = { hits: 0, misses: 0 };
    console.log('🗑️  Navigation pattern cache cleared');
  }

  /**
   * Remove expired patterns (older than specified days)
   */
  cleanupExpiredPatterns(maxAgeInDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

    let removedCount = 0;

    for (const [key, pattern] of this.patterns.entries()) {
      if (pattern.lastUsed < cutoffDate) {
        this.patterns.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired navigation patterns`);
    }

    return removedCount;
  }

  /**
   * Get all cached patterns for debugging
   */
  getAllPatterns(): NavigationPattern[] {
    return Array.from(this.patterns.values()).sort((a, b) =>
      b.lastUsed.getTime() - a.lastUsed.getTime()
    );
  }
}
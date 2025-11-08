// Source type - Domain characteristics only
// Aligned with /docs/architecture_v1.md

export interface Source {
  id: string;
  domain: string; // 'news.ycombinator.com'
  baseUrl: string; // 'https://news.ycombinator.com'

  // Rendering characteristics (AI-determined)
  rendering: 'static' | 'spa' | 'hybrid';
  antiBot: 'none' | 'cloudflare' | 'recaptcha' | 'perimeter_x';

  // URL patterns (AI-determined)
  urlPatterns: {
    list: string[]; // ['/', '/news?p=*']
    item: string[]; // ['/item?id=*']
    exclude: string[]; // ['/user?id=*', '/login', '/submit']
  };

  // Performance metadata
  metadata: {
    lastAnalyzed: Date;
    analysisVersion: string; // Track analysis model version
    successRate: number; // 0-1, across all recipes using this source
    avgResponseTime: number; // milliseconds
    totalExecutions: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

// For AI analysis results
export interface SourceAnalysisResult {
  rendering: Source['rendering'];
  antiBot: Source['antiBot'];
  urlPatterns: Source['urlPatterns'];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

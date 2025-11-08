import cheerio from 'cheerio';
import type { Cheerio, CheerioAPI, Element } from 'cheerio';
import type {
  PaginationSummaryInput,
  PaginationSummary,
  PaginationSummaryAnchor,
  PaginationSummaryButton,
  PaginationSummaryStats,
  InfiniteScrollHints,
  ContentContainer,
} from '../types/pagination.js';

const KEYWORD_RE = /(next|prev|previous|more|older|newer|page|pager|pagination|load|weiter|suivant|following)/i;
const HREF_HINT_RE = /(page|offset|cursor|start|index|p=|page=|paged=|pg=|\/(page|p)\/?\d+)/i;

export function buildPaginationSummary(input: PaginationSummaryInput): PaginationSummary {
  const html = input.html ?? '';
  const markdown = input.markdown ?? '';
  const $ = cheerio.load(html, { decodeEntities: false });

  $('script, style, noscript').remove();

  const title = $('title').first().text().trim() || $('h1').first().text().trim() || undefined;
  const headings = $('h1, h2, h3')
    .slice(0, 6)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const anchorElements = $('a').toArray();
  const anchorSample: PaginationSummaryAnchor[] = anchorElements
    .map((element) => {
      const el = $(element);
      const text = el.text().trim().replace(/\s+/g, ' ');
      const href = el.attr('href') ?? null;
      const classes = (el.attr('class') ?? '')
        .split(/\s+/)
        .map((cls: string) => cls.trim())
        .filter(Boolean);
      const rel = el.attr('rel') ?? null;
      const score = computeScore({ text, classes, href, rel });

      return {
        text: truncateText(text, 140),
        href,
        rel,
        classes,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  const buttonElements = $('button, [role="button"], .button, .btn').toArray();
  const buttonSample: PaginationSummaryButton[] = buttonElements
    .map((element) => {
      const el = $(element);
      const text = el.text().trim().replace(/\s+/g, ' ');
      const classes = (el.attr('class') ?? '')
        .split(/\s+/)
        .map((cls: string) => cls.trim())
        .filter(Boolean);
      const selector = buildSelector(el);
      const score = computeScore({ text, classes });

      return {
        text: truncateText(text, 140),
        selector,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  const navigationFragments = collectNavigationFragments($);

  const textContent = $.root().text().replace(/\s+/g, ' ').trim();
  const markdownText = markdown.replace(/\s+/g, ' ').trim();
  const textSource = textContent || markdownText;
  const textExcerpt = truncateMiddle(textSource, 2000);

  // Detect infinite scroll hints
  const infiniteScrollHints = detectInfiniteScrollHints($, html);

  // Detect repeating content container
  const contentContainer = detectContentContainer($);

  return {
    url: input.url,
    title,
    headings,
    anchorSample,
    buttonSample,
    navigationFragments,
    textHead: textExcerpt.head,
    textTail: textExcerpt.tail,
    stats: {
      totalAnchors: anchorElements.length,
      totalButtons: buttonElements.length,
      textLength: textSource.length,
    } as PaginationSummaryStats,
    infiniteScrollHints,
    contentContainer,
  };
}

function computeScore(params: { text?: string; classes?: string[]; href?: string | null; rel?: string | null }): number {
  let score = 0;
  const { text, classes = [], href, rel } = params;

  if (text && KEYWORD_RE.test(text)) score += 2;
  if (classes.some((cls) => KEYWORD_RE.test(cls))) score += 1.5;
  if (href && KEYWORD_RE.test(href)) score += 1.5;
  if (href && HREF_HINT_RE.test(href)) score += 1;
  if (rel && /next|prev|previous/i.test(rel)) score += 2;

  return score;
}

function buildSelector(el: Cheerio<Element>): string {
  const tag = el[0]?.tagName ?? 'button';
  const id = el.attr('id');
  const classes = (el.attr('class') ?? '')
    .split(/\s+/)
    .map((cls) => cls.trim())
    .filter(Boolean);

  if (id) {
    return `#${id}`;
  }

  if (classes.length) {
    return `${tag}.${classes.join('.')}`;
  }

  const role = el.attr('role');
  if (role) {
    return `${tag}[role="${role}"]`;
  }

  return tag;
}

function collectNavigationFragments($: CheerioAPI): string[] {
  const fragments: string[] = [];
  const seen = new Set<Element>();

  $('nav, [role="navigation"]').each((_, el) => {
    seen.add(el);
  });
  $('[class*="pagination"], [id*="pagination"], [class*="pager"], [id*="pager"], [class*="paginator"], [id*="paginator"], [class*="load-more"], [id*="load-more"]').each(
    (_, el) => {
      seen.add(el);
    }
  );

  Array.from(seen)
    .slice(0, 12)
    .forEach((el) => {
      const html = cheerio(el).html();
      if (html) {
        fragments.push(truncateMiddle(html, 2000).combined);
      }
    });

  return fragments;
}

function truncateText(value: string, max: number): string {
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function truncateMiddle(value: string, max: number): { combined: string; head: string; tail: string } {
  if (!value) {
    return { combined: '', head: '', tail: '' };
  }
  if (value.length <= max) {
    return { combined: value, head: value, tail: value };
  }
  const half = Math.floor(max / 2);
  const head = value.slice(0, half);
  const tail = value.slice(-half);
  const combined = `${head}\n… [content truncated, total ${value.length} chars] …\n${tail}`;
  return { combined, head, tail };
}

/**
 * Detect signals that indicate infinite scroll pagination
 */
function detectInfiniteScrollHints($: CheerioAPI, html: string): InfiniteScrollHints {
  const reasoning: string[] = [];

  // Check for Intersection Observer in script tags
  const hasIntersectionObserver = html.includes('IntersectionObserver') || html.includes('intersection-observer');
  if (hasIntersectionObserver) {
    reasoning.push('Found IntersectionObserver API usage in scripts');
  }

  // Check for lazy loading attributes
  const lazyElements = $('[loading="lazy"], [data-src], [data-lazy], [data-lazy-src]');
  const hasLazyLoadingAttributes = lazyElements.length;
  if (hasLazyLoadingAttributes > 5) {
    reasoning.push(`Found ${hasLazyLoadingAttributes} elements with lazy loading attributes`);
  }

  // Check for sentinel/loader elements
  const sentinelSelectors = [
    '[id*="infinite"]',
    '[class*="infinite"]',
    '[id*="loader"]',
    '[class*="loader"]',
    '[id*="spinner"]',
    '[class*="spinner"]',
    '[class*="loading"]',
    '[id*="loading"]',
    '[class*="sentinel"]',
  ].join(',');
  const sentinelElements = $(sentinelSelectors);
  const hasSentinelElements = sentinelElements.length;
  if (hasSentinelElements > 0) {
    reasoning.push(`Found ${hasSentinelElements} sentinel/loader elements`);
  }

  // Check for infinite scroll keywords in classes/IDs
  const infiniteScrollKeywords = /infinite|endless|auto-load|lazy-load|scroll-load/i;
  const hasInfiniteScrollKeywords = $('*').toArray().some((el) => {
    const classes = $(el).attr('class') || '';
    const id = $(el).attr('id') || '';
    return infiniteScrollKeywords.test(classes) || infiniteScrollKeywords.test(id);
  });
  if (hasInfiniteScrollKeywords) {
    reasoning.push('Found elements with infinite scroll-related keywords in class/id');
  }

  return {
    hasIntersectionObserver,
    hasLazyLoadingAttributes,
    hasSentinelElements,
    hasInfiniteScrollKeywords,
    reasoning,
  };
}

/**
 * Detect the main content container with repeating items
 */
function detectContentContainer($: CheerioAPI): ContentContainer | undefined {
  // Common container patterns for listings/grids
  const containerCandidates = [
    { selector: '[class*="search-results"]', weight: 3 },
    { selector: '[class*="results"]', weight: 2 },
    { selector: '[class*="listing"]', weight: 2 },
    { selector: '[class*="grid"]', weight: 1 },
    { selector: '[class*="list"]', weight: 1 },
    { selector: '[class*="items"]', weight: 1 },
    { selector: '[class*="cards"]', weight: 1 },
    { selector: '[class*="feed"]', weight: 1 },
    { selector: '[role="list"]', weight: 2 },
    { selector: 'ul[class*="product"], ul[class*="item"], ul[class*="card"]', weight: 2 },
  ];

  interface ContainerMatch {
    selector: string;
    itemCount: number;
    score: number;
    itemClasses: string[];
  }

  const matches: ContainerMatch[] = [];

  for (const candidate of containerCandidates) {
    const containers = $(candidate.selector);

    containers.each((_, container) => {
      const $container = $(container);

      // Look for repeating child patterns (articles, divs with similar classes, list items)
      const children = $container.children();
      const articleChildren = $container.find('article, [class*="card"], [class*="item"], [class*="product"], li');

      const itemCount = Math.max(children.length, articleChildren.length);

      // Only consider if there are many items (suggests a list)
      if (itemCount >= 10) {
        // Collect sample of class names from items
        const itemClasses: string[] = [];
        articleChildren.slice(0, 5).each((_, item) => {
          const classes = $(item).attr('class');
          if (classes) itemClasses.push(classes);
        });

        matches.push({
          selector: candidate.selector,
          itemCount,
          score: candidate.weight * (itemCount > 20 ? 2 : 1),
          itemClasses,
        });
      }
    });
  }

  // Find best match
  if (matches.length === 0) return undefined;

  matches.sort((a, b) => b.score - a.score);
  const best = matches[0];

  return {
    selector: best.selector,
    itemCount: best.itemCount,
    sampleItemClasses: best.itemClasses.slice(0, 3),
    reasoning: `Found ${best.itemCount} repeating items in container matching ${best.selector}`,
  };
}

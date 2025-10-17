import cheerio from 'cheerio';
import type { Cheerio, CheerioAPI, Element } from 'cheerio';
import type {
  PaginationSummaryInput,
  PaginationSummary,
  PaginationSummaryAnchor,
  PaginationSummaryButton,
  PaginationSummaryStats,
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

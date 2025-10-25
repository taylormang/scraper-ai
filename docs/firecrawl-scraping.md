# Firecrawl Web Scraping Workflow Design

Based on Firecrawl's documentation, here's an efficient workflow design for building a scraper tool that compiles powerful datasets.

## High-Level Architecture

**Two-Phase Pattern:**

1. **List Phase**: Scrape paginated list pages to collect item URLs
2. **Detail Phase** (optional): Batch scrape individual items

## Core Workflow Components

### Phase 1: List Scraping with Actions

Firecrawl's `scrape` endpoint with `actions` handles all navigation complexity:

```python
# Handle any pagination style with actions
firecrawl.scrape(
    url="https://amazon.com/search?q=laptop",
    formats=["markdown"],
    actions=[
        {"type": "wait", "milliseconds": 2000},
        # Extract URLs from current page
        {"type": "scrape"},
        # Click "Next" button
        {"type": "click", "selector": "a.s-pagination-next"},
        {"type": "wait", "milliseconds": 2000},
        {"type": "scrape"},
        # Repeat for N pages
    ]
)
```

**For infinite scroll:**

```python
actions=[
    {"type": "wait", "milliseconds": 2000},
    {"type": "scrape"},
    {"type": "scroll", "direction": "down"},
    {"type": "wait", "milliseconds": 1500},
    {"type": "scrape"},
    # Repeat scroll pattern N times
]
```

**For SPAs with hash routing:**

```python
actions=[
    {"type": "wait", "milliseconds": 3000},  # Wait for JS
    {"type": "click", "selector": "#apps-tab"},
    {"type": "wait", "milliseconds": 2000},
    {"type": "scrape"},
]
```

### Phase 2: Batch Detail Scraping

Once you have URLs from Phase 1, use `batch_scrape`:

```python
# Scrape up to thousands of URLs efficiently
result = firecrawl.batch_scrape(
    urls=collected_urls,
    formats=["markdown", "json"],
    poll_interval=2
)
```

## Recommended Implementation Pattern

```python
class FirecrawlDatasetBuilder:
    def __init__(self, firecrawl_api_key):
        self.fc = Firecrawl(api_key=firecrawl_api_key)

    def scrape_list_pages(self, config):
        """
        config = {
            "base_url": "...",
            "pagination_strategy": "click_next" | "infinite_scroll" | "url_pattern",
            "pages": 5,
            "selector": "a.s-pagination-next",  # if click_next
            "item_selector": "a.product-link"  # Extract these links
        }
        """
        actions = self._build_actions(config)
        result = self.fc.scrape(
            url=config["base_url"],
            formats=["links"],
            actions=actions
        )
        return self._extract_item_urls(result, config["item_selector"])

    def scrape_details(self, urls, schema=None):
        """Batch scrape detail pages"""
        if schema:
            # Use structured extraction
            return self.fc.batch_scrape(
                urls=urls,
                formats=[{"type": "json", "schema": schema}]
            )
        else:
            return self.fc.batch_scrape(urls=urls, formats=["markdown"])
```

## Key Advantages

1. **Single API call per list page** - Actions sequence handles all interactions
2. **No URL pattern guessing** - Works with any pagination style (SPAs, infinite scroll, click-based)
3. **Parallel detail scraping** - Batch endpoint handles rate limiting automatically
4. **JavaScript-native** - Built-in wait times and dynamic content handling

## User Configuration

Allow users to specify:

- **List config**: Base URL, pages to scrape, pagination type, action selectors
- **Detail config**: Whether to scrape details, extraction schema (optional)
- **Action sequences**: Custom actions for complex navigation

This keeps it simple - users just configure the navigation pattern once, and Firecrawl handles the execution complexity. The actions array is the key differentiator that solves SPA/infinite-scroll requirements without custom code per site.

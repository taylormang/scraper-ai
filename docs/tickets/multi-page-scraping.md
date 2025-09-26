# Multi-page Scraping

The user can specify a "navigtation prompt" that informs us hwo to proceed. we can require the user to specify if its a button or a scroll
The navigation prompt can even be optional, as it probably isn't that hard to determine what to click 

Scraper Config
```
hackernews: {
    name: 'hackernews-scraper',
    baseUrl: 'https://news.ycombinator.com',
    extractionPrompt: 'Extract each article as an object with: title, link URL, points/score, author, and comment count. Return an array of article objects.',
+    navigationType: 'button', // 'button' | 'scroll' | 'none'
+    navigationPrompt: 'click "More"',
+    maxPages: 2
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    timeout: 10000
    }
```

Update the scraping process to be multi-page capable 
Default maxPages to 2 if not specified

Rough scrape process

load URL
scrape contents --> parse with extraction prompt --> store (ideally not in memory)
if 'button':
    scrape page structure elements
    Identify the button the user described
    Click on it
scrape new page contents --> parse --> store


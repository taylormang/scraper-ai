export const SUGGESTED_PROMPTS = [
  {
    label: 'Hacker News · 10 pages',
    prompt:
      'Scrape the first 10 pages of Hacker News, capturing title, score, author, and link.',
  },
  {
    label: 'Zendesk Apps · 3 pages',
    prompt:
      'Scrape the first 3 pages of https://www.zendesk.com/marketplace/apps/, capturing app name, description, type, ratings.',
  },
  {
    label: 'Amazon joggers · 2 pages',
    prompt:
      'Get the first 2 pages on Amazon for mens jogger pants, extracting product name, rating, price.',
  },
  {
    label: 'Acquire.com · SaaS listings',
    prompt:
      'Find the SaaS listings on https://www.acquire.com/marketplace, extracting name, ARR, revenue multiple, and asking price.',
  },
  {
    label: 'Product Hunt · Today',
    prompt:
      'Scrape today’s featured launches on https://www.producthunt.com/, capturing product name, tagline, vote count, maker names, and product URL.',
  },
  {
    label: 'Indeed · Remote SWE roles',
    prompt:
      'Gather the first 3 pages of https://www.indeed.com/jobs?q=remote+software+engineer&l=, capturing job title, company, location, posted date, and job URL.',
  },
  {
    label: 'Etsy · Handmade jewelry',
    prompt:
      'Scrape the first 2 pages of https://www.etsy.com/search?q=handmade+jewelry, capturing listing title, price, seller, review count, and listing URL.',
  },
  {
    label: 'Yelp · Seattle coffee',
    prompt:
      'Collect the top Seattle coffee shops from https://www.yelp.com/search?find_desc=Coffee&find_loc=Seattle,+WA, capturing business name, rating, review count, neighborhood, and profile URL.',
  },
  {
    label: 'arXiv · ML recent',
    prompt:
      'Scrape the recent submissions at https://arxiv.org/list/cs.LG/recent, capturing paper title, authors, submission date, abstract link, and PDF link.',
  },
  {
    label: 'Reuters · Markets feed',
    prompt:
      'Pull the latest market updates from https://www.reuters.com/markets/, capturing headline, summary, timestamp, author (if available), and article link.',
  },
];

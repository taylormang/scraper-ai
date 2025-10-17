# @scraper/web

Web application for visualizing and managing scraped datasets.

## Overview

Modern web interface built with Next.js 14 that provides a visual dashboard for managing scraped data, viewing datasets, and configuring scraping preferences.

## Features

- **Current:**
- 🏠 Dashboard home page with overview
- 🕸️ Scrapes history and detail pages with live API, JSON output, and pagination insights
- 🚀 Homepage action to trigger new scrapes with optional JSON prompt and pagination controls
- 🧠 Planner playground to test prompt-to-plan translations
- 📜 LLM trace viewer for audit/debugging
- 📊 Datasets page for viewing scraped data
- ⚙️ Settings page for configuration
- 🎨 Responsive design with Tailwind CSS
- 🌓 Dark mode support

**Coming Soon:**
- Real-time scraping status
- Data visualization charts
- Advanced filtering and search
- Dataset export functionality
- User authentication

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

Dependencies are managed at the monorepo level:

```bash
# From repo root
npm install
```

### Development

```bash
# Run web app only
npm run dev:web

# Run both MCP server and web app
npm run dev:all

# From apps/web directory
npm run dev
```

Access the app at [http://localhost:3000](http://localhost:3000)

### Build

```bash
# Build for production
npm run build -w apps/web

# Start production server
npm start -w apps/web
```

## Project Structure

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx      # Home page
│   │   ├── layout.tsx    # Root layout with navigation
│   │   ├── globals.css   # Global styles
│   │   ├── scrapes/      # Scrape history page
│   │   ├── datasets/     # Datasets page
│   │   └── settings/     # Settings page
│   ├── components/       # React components
│   │   ├── layout/      # Layout components (Navigation)
│   │   └── ui/          # UI components (future)
│   └── lib/             # Utilities (future)
├── public/              # Static assets
├── package.json
├── tsconfig.json
├── next.config.mjs
└── tailwind.config.ts
```

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Fonts**: Inter (Google Fonts)
- **Monorepo**: npm workspaces

## Integration

### Shared Packages

```typescript
import { MCPToolDefinition } from '@scraper/shared-types';
```

The web app imports shared TypeScript types from `@scraper/shared-types` for consistency with the MCP server.

### Future Integrations

- Direct database access (`@scraper/storage`)
- Shared utilities (`@scraper/ai-utils`)
- REST API from MCP server
- WebSocket for real-time updates

## Pages

### Home (`/`)
Dashboard overview with quick stats, navigation cards, and a form to kick off new scrapes through the API.

### Datasets (`/datasets`)
List and manage scraped datasets. Currently shows empty state with getting started guide.

### Scrapes (`/scrapes`)
Fetches scrape history from the API and renders status, prompts, pagination settings, and timestamps. Each row links to a detail view with per-page outputs (markdown, HTML, JSON) aggregated from the crawl.

### Planner (`/planner`)
Interactive test page for the prompt-to-plan endpoint. Submit natural-language instructions and inspect the structured plan JSON returned by the API.

### Traces (`/traces`)
Lists all recorded LLM traces. Use it to audit planner calls and future LLM-assisted features.

### Settings (`/settings`)
Configure API keys and scraping preferences. Currently read-only with placeholders for environment variable configuration.

## Development Tips

### Hot Reload
Next.js dev server watches for file changes and hot reloads automatically. No build step needed during development.

### TypeScript
All pages and components are TypeScript. Use `npm run typecheck` to verify types without building.

### Tailwind CSS
Utility-first CSS with dark mode support. See `tailwind.config.ts` for configuration.

### Adding New Pages
1. Create new directory in `src/app/your-page/`
2. Add `page.tsx` file
3. Navigation will automatically work via Next.js routing

## Environment Variables

Create `.env.local` in `apps/web/` for environment-specific configuration:

```env
# API base used by the scrapes page (falls back to http://localhost:3001)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/web
vercel
```

### Docker

```dockerfile
# Dockerfile (example for future use)
FROM node:20-alpine
WORKDIR /app
COPY apps/web ./apps/web
COPY package*.json ./
RUN npm install
RUN npm run build -w apps/web
EXPOSE 3000
CMD ["npm", "start", "-w", "apps/web"]
```

## See Also

- `/docs/technical_architecture.md` - Overall architecture
- `/apps/mcp-server/README.md` - MCP server documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

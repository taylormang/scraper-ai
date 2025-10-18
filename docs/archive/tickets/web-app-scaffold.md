# Ticket: Web App Scaffold

**Status**: 🔵 Ready
**Priority**: Medium
**Estimated Time**: 1-2 hours
**Created**: 2025-10-13

## Objective

Add a web application to the monorepo for visualizing and managing scraped datasets. Users need a visual interface to see their data, manage scraping jobs, and interact with the system beyond conversational AI.

## Success Criteria

- ✅ Web app scaffolded in `apps/web`
- ✅ Next.js 14+ with App Router
- ✅ TypeScript configured
- ✅ Shared types integration (`@scraper/shared-types`)
- ✅ Basic pages: Home, Datasets, Settings
- ✅ Responsive layout with modern UI
- ✅ Development server running
- ✅ Documented in README

## Architecture

**Framework**: Next.js 14 with App Router
- Modern React framework with excellent developer experience
- Built-in routing, API routes, server components
- TypeScript support out of the box
- Easy deployment (Vercel, etc.)

**UI Library**: Tailwind CSS
- Utility-first CSS framework
- Rapid development
- Responsive design built-in
- Small bundle size

**Structure:**
```
apps/web/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── src/
│   ├── app/              # App Router pages
│   │   ├── page.tsx      # Home page
│   │   ├── layout.tsx    # Root layout
│   │   ├── datasets/
│   │   │   └── page.tsx  # Datasets list
│   │   └── settings/
│   │       └── page.tsx  # Settings
│   ├── components/       # React components
│   │   ├── ui/          # Base UI components
│   │   └── layout/      # Layout components
│   └── lib/             # Utilities
└── public/              # Static assets
```

## Key Features (Initial)

**Home Page:**
- Dashboard overview
- Recent scraping activity
- Quick stats (total scrapes, data points, etc.)
- Quick actions (start new scrape, view data)

**Datasets Page:**
- List of all scraped datasets
- Filter by date, source, status
- Search functionality
- View/download individual datasets
- Delete datasets

**Settings Page:**
- API keys configuration
- Scraping preferences
- Export settings
- Account settings

## Implementation Tasks

### 1. Create Next.js App

```bash
npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir --import-alias "@/*"
```

### 2. Configure for Monorepo

**Update `package.json`:**
```json
{
  "name": "@scraper/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@scraper/shared-types": "*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "*",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "*",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

**Update `tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 3. Create Basic Pages

**Home Page (`src/app/page.tsx`):**
```typescript
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold mb-8">Scraper Dashboard</h1>
      <p className="text-xl text-gray-600">
        AI-Native Web Intelligence Platform
      </p>
    </main>
  );
}
```

**Layout (`src/app/layout.tsx`):**
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Scraper - AI-Native Web Intelligence',
  description: 'Manage your scraped data and intelligence workflows',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### 4. Add Navigation Component

**Navigation (`src/components/layout/Navigation.tsx`):**
```typescript
import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            <Link href="/" className="flex items-center text-gray-900 font-semibold">
              Scraper
            </Link>
            <Link href="/datasets" className="flex items-center text-gray-600 hover:text-gray-900">
              Datasets
            </Link>
            <Link href="/settings" className="flex items-center text-gray-600 hover:text-gray-900">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

### 5. Update Root Scripts

Add web app to root `package.json` scripts:
```json
{
  "scripts": {
    "dev": "npm run dev --workspace=apps/mcp-server",
    "dev:web": "npm run dev --workspace=apps/web",
    "dev:all": "npm run dev --workspaces --if-present"
  }
}
```

### 6. Documentation

**Add to main README.md:**
```markdown
## Web Application

Visual interface for managing scraped data:

```bash
# Run web app
npm run dev:web

# Access at http://localhost:3000
```

**Features:**
- View and manage datasets
- Scraping job configuration
- Data visualization
- Export and download data
```

## Future Enhancements (Post-MVP)

**Phase 2:**
- Real-time scraping status updates (WebSocket)
- Data visualization charts (Chart.js, Recharts)
- Advanced filtering and search
- Batch operations
- Dataset comparison

**Phase 3:**
- Collaborative features (sharing datasets)
- Scheduled scraping UI
- Custom data transformations
- API key management
- User authentication

**Phase 4:**
- Data analysis tools
- Export to various formats (CSV, JSON, Excel)
- Integration with external services
- Webhook configuration
- Monitoring dashboard

## Integration Points

**With MCP Server:**
- Share `@scraper/shared-types` for type consistency
- Eventually share `@scraper/storage` for data access
- Could expose REST API from MCP server for web consumption

**With Storage Layer:**
- Direct database access (PostgreSQL)
- Redis for caching
- Vector store for semantic search

**With Scraping Engine:**
- View scraping status
- Trigger scrapes manually
- Configure scraping parameters

## Technical Considerations

**State Management:**
- Start with React Server Components (no client-side state lib needed)
- Add Zustand or Context API if needed later

**Data Fetching:**
- Server Components for initial data
- API routes for mutations
- React Query for client-side caching (if needed)

**Authentication (Future):**
- NextAuth.js for authentication
- Support multiple providers (GitHub, Google, Email)

**Deployment:**
- Vercel (recommended for Next.js)
- Or Docker container for self-hosting
- Environment variables via .env.local

## Development Workflow

```bash
# Install dependencies
npm install

# Run web app
npm run dev:web

# Run both MCP server and web app
npm run dev:all

# Build for production
npm run build -w apps/web

# Start production server
npm start -w apps/web
```

## See Also

- `/docs/technical_architecture.md` - Overall system architecture
- `/apps/mcp-server/README.md` - MCP server documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

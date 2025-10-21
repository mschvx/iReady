# Overview

This is a full-stack web application built with React, Express, and PostgreSQL. The application provides user authentication functionality with login and signup capabilities. It uses a modern TypeScript-based stack with Vite for frontend bundling, Express for the backend API, and Drizzle ORM for database operations. The UI is built using shadcn/ui components with Tailwind CSS for styling.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework Choice: React with TypeScript**
- Uses React 18 with TypeScript for type safety
- Vite as the build tool for fast development and optimized production builds
- Client code is organized in the `client/` directory with a clear separation of concerns

**Routing Strategy: Wouter**
- Lightweight client-side routing using wouter instead of React Router
- Routes defined in `client/src/App.tsx` with three main pages: login (`/`), signup (`/signup`), and home (`/home`)
- Simple path-based routing suitable for single-page applications

**State Management: TanStack Query**
- Uses @tanstack/react-query for server state management and API data fetching
- Custom query client configured in `client/src/lib/queryClient.ts`
- API requests handled through a centralized `apiRequest` helper function
- Query configuration includes credential inclusion for session-based auth

**UI Component System: shadcn/ui**
- Extensive use of Radix UI primitives wrapped with shadcn/ui styling
- Tailwind CSS for utility-first styling with custom CSS variables for theming
- Component library configured in `components.json` with New York style variant
- All UI components are TypeScript-based and located in `client/src/components/ui/`

**Design Tokens: CSS Variables**
- Theme system based on CSS custom properties (HSL color format)
- Supports semantic color tokens (primary, secondary, destructive, muted, accent, etc.)
- Configured for potential dark mode support through CSS variable overrides

## Backend Architecture

**Server Framework: Express.js**
- RESTful API using Express with TypeScript
- ESM modules throughout the codebase
- API routes prefixed with `/api`
- Custom logging middleware for request/response tracking

**Authentication Strategy: Session-based**
- express-session with cookie-based authentication
- Session secret required via environment variable (SESSION_SECRET)
- Secure cookie settings with httpOnly, sameSite strict, and production-only secure flag
- Password hashing using bcrypt (cost factor 10)
- Session persists for 7 days (maxAge: 1000 * 60 * 60 * 24 * 7)

**API Structure**
- Authentication endpoints: `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Input validation using Zod schemas derived from Drizzle schema
- RESTful error responses with appropriate HTTP status codes
- Session data stored in `req.session.userId`

**Development vs Production**
- Development: Vite middleware integrated for HMR and SSR
- Production: Static file serving from `dist/public`
- Environment-based configuration using NODE_ENV
- Replit-specific plugins for development environment

## Data Storage

**Database: PostgreSQL via Neon**
- Serverless PostgreSQL using @neondatabase/serverless
- Connection pooling with pg Pool
- WebSocket support configured for serverless environments (neonConfig.webSocketConstructor = ws)
- Database URL required via environment variable (DATABASE_URL)

**ORM: Drizzle**
- Type-safe database queries using drizzle-orm
- Schema definition in `shared/schema.ts` for code sharing between client and server
- Drizzle Kit for migrations with output to `./migrations` directory
- PostgreSQL dialect configuration

**Database Schema**
- Users table with UUID primary keys (using gen_random_uuid())
- Columns: id (varchar primary key), username (text unique not null), password (text not null)
- Zod validation schemas generated from Drizzle schema using drizzle-zod

**Storage Abstraction Layer**
- `IStorage` interface defined in `server/storage.ts`
- `DatabaseStorage` implementation using Drizzle ORM
- CRUD methods: getUser(id), getUserByUsername(username), createUser(user)
- Allows for easy testing and alternative storage implementations

## Build and Deployment

**Build Process**
- Frontend: Vite builds to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js`
- Single build command creates both client and server bundles
- ESM format throughout for modern JavaScript features

**Scripts**
- `dev`: Development server with tsx and NODE_ENV=development
- `build`: Production build for both frontend and backend
- `start`: Production server running compiled code
- `check`: TypeScript type checking
- `db:push`: Push Drizzle schema changes to database

**Module Resolution**
- Path aliases configured in tsconfig.json: `@/` for client src, `@shared/` for shared code
- Vite aliases configured to match TypeScript paths
- Bundler module resolution for modern import syntax

# External Dependencies

## Third-party UI Libraries
- **Radix UI**: Headless UI component primitives (accordion, dialog, dropdown, select, toast, tooltip, etc.)
- **shadcn/ui**: Pre-styled component system built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: CSS class variant management
- **cmdk**: Command menu component
- **Lucide React**: Icon library

## Database and ORM
- **Neon Database**: Serverless PostgreSQL provider (@neondatabase/serverless)
- **Drizzle ORM**: Type-safe SQL ORM (drizzle-orm, drizzle-kit)
- **ws**: WebSocket library for Neon serverless connections

## Authentication and Security
- **bcrypt**: Password hashing library
- **express-session**: Session middleware for Express
- **connect-pg-simple**: PostgreSQL session store (dependency present but not actively used in current implementation)

## Form Handling and Validation
- **React Hook Form**: Form state management (@hookform/resolvers)
- **Zod**: Schema validation library (used with drizzle-zod)

## Development Tools
- **Vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **Replit Plugins**: Development tooling for Replit environment (@replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner)

## Routing and Data Fetching
- **wouter**: Lightweight client-side routing
- **@tanstack/react-query**: Async state management and data fetching

## Additional Utilities
- **date-fns**: Date manipulation library
- **clsx** and **tailwind-merge**: Utility for conditional CSS classes
- **nanoid**: Unique ID generation
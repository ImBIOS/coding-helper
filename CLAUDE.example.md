# `projectName`'s Claude Code Guidelines

## Project Intelligence File

### Project Overview
This is a React TypeScript application for project management with a Node.js backend.
We follow Domain-Driven Design principles and use a microservices architecture.

### Technology Stack
- Frontend: React 19, TypeScript 5.9, Vite, TailwindCSS 4
- Backend: Bun, Elysia, TypeScript, oRPC, Drizzle ORM
- Database: PostgreSQL 18
- Testing: Bun, happy-dom, React Testing Library, Playwright
- Infrastructure: Docker, Coolify

### Commands & Scripts
- `npm run dev`: Start development server (frontend on :3000, backend on :3001)
- `npm run build`: Production build with optimization
- `npm run typecheck`: Full TypeScript validation
- `npm test`: Run unit tests with coverage
- `npm run test:e2e`: Playwright end-to-end tests
- `npm run db:migrate`: Apply database migrations
- `npm run db:seed`: Seed development data

### Code Style & Standards
- Use functional components with hooks (no class components)
- Prefer composition over inheritance
- Follow compound component patterns for complex UI
- Use custom hooks for shared logic
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Conventional commits (feat:, fix:, docs:, etc.)

### Architecture Patterns
- Feature-based folder structure (not type-based)
- Barrel exports from index.ts files (if it cause linter error, disable for the file)
- Custom hooks pattern: `useFeatureName`
- API layer: `packages/api/src/routers/featureName.ts`
- State management: Zustand for global state, React state for local
- Error boundaries for component error handling

### Testing Philosophy
- Write tests before implementing features (TDD)
- Focus on user behavior, not implementation details
- Use `data-testid` for element selection
- Mock external dependencies, test integration at boundaries
- Aim for 80%+ code coverage

### Database Patterns
- Use Drizzle schema-first approach
- Soft deletes with `deletedAt` timestamps
- UUID primary keys for public-facing entities
- Created/updated timestamp tracking
- Database migrations in version control

### Security Considerations
- All API endpoints require authentication except `/health`
- Use `helmet.js` for security headers
- Input validation with Zod schemas
- Rate limiting on public endpoints
- CORS configured for production domains only

### Deployment & Infrastructure
- Blue-green deployment strategy
- Environment-specific configs in `.env` files
- Docker multi-stage builds for optimization
- Secrets managed through Infisical

### Team Conventions
- Feature branch workflow with PR reviews
- Squash commits before merging
- Deploy to staging automatically on main branch
- Production deploys require manual approval
- Breaking changes require RFC discussion

### Common Pitfalls to Avoid
- Don't use any dependencies in database migrations
- Avoid defaultProps in TypeScript components (use default parameters)
- Don't commit `.env` files (use `.env.example` instead)
- Always handle loading and error states in components
- Don't use `any` or `unknown` types without good reason

### Performance Guidelines
- Lazy load route components
- Use `React.memo` for expensive components
- Debounce search inputs and API calls
- Optimize bundle size with `webpack-bundle-analyzer`
- Use CDN for static assets

### Debugging & Development
- Use React DevTools and Redux DevTools
- Enable source maps in development
- Use VS Code debugger with `launch.json` configuration
- Log structured data for easier parsing
- Use error tracking (Sentry) in production

### External Dependencies
- Avoid adding new dependencies without team discussion
- Prefer utilities from lodash over custom implementations
- Use `date-fns` instead of `moment.js` (bundle size)
- UI components from our custom design system only

### Documentation Standards
- All public functions must have JSDoc comments
- README files for each major feature
- API documentation with OpenAPI/Scalar
- Architecture Decision Records (ADRs) for major decisions

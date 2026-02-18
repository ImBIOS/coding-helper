# `@imbios/coding-helper`'s Claude Code Guidelines

## Project Intelligence File

### Project Overview
CLI tool and Claude Code plugin for switching between Z.AI (GLM) and MiniMax API providers.
Built with oclif framework and Ink (React for CLI UI), providing multi-account management, MCP server control, and auto-rotation capabilities.

### Terminology

**cohe** - This project's CLI tool name (short for "coding helper"). When referring to the CLI command in this codebase, it's always written as `cohe` (e.g., `cohe init`, `cohe account add`). Do not confuse with Cohere (the AI company).

### Technology Stack
- Runtime: Bun
- CLI Framework: oclif with Ink (React for CLI)
- Language: TypeScript 5.9
- Validation: Zod 4
- Testing: Bun, happy-dom, React Testing Library
- SDK: @anthropic-ai/sdk, @anthropic-ai/claude-agent-sdk
- Linting: Biome via Ultracite preset

### Commands & Scripts
- `bun run dev`: Start development server with HMR
- `bun run build`: Bundle CLI with `bun build`
- `bun run typecheck`: Full TypeScript validation
- `bun test`: Run unit tests
- `bun test:watch`: Run tests in watch mode
- `bun run test:coverage`: Run tests with coverage report

### Code Style & Standards
- Use functional components with hooks (no class components)
- Prefer composition over inheritance
- Use custom hooks for shared logic
- TypeScript strict mode enabled
- Biome for formatting and linting (`bun x ultracite fix`)
- Conventional commits (feat:, fix:, docs:, etc.)

### Architecture Patterns
- Feature-based folder structure under `src/commands/`
- oclif flexible taxonomy with `.tsx` command files
- Provider pattern for API abstraction (`src/providers/`)
- Configuration with Zod schemas in `src/config/`
- Ink React components for CLI UI
- Barrel exports from `index.ts` files (disable linter for barrel files if needed)

### Testing Philosophy
- Write tests before implementing features (TDD)
- Focus on user behavior, not implementation details
- Mock external dependencies, test integration at boundaries
- Use happy-dom for React component testing
- Aim for meaningful coverage of core logic

### Common Pitfalls to Avoid
- Avoid defaultProps in TypeScript components (use default parameters)
- Don't commit `.env` files (use `.env.example` instead)
- Always handle loading and error states in CLI components
- Don't use `any` or `unknown` types without good reason
- Don't use `--no-verify` when committing (bypasses pre-commit hooks)

### Performance Guidelines
- Use `React.memo` for expensive Ink components
- Debounce user input prompts
- Minimize bundle size with `bun build` tree-shaking
- Lazy load commands when possible

### Debugging & Development
- Use React DevTools for Ink components
- Enable source maps in development
- Use VS Code debugger with `launch.json` configuration
- Log structured data for easier parsing

### External Dependencies
- Avoid adding new dependencies without consideration
- Prefer built-in Bun APIs over external packages
- Use Zod for validation instead of custom schemas
- UI components from `@inkjs/ui` when possible

### Documentation Standards
- All public functions should have JSDoc comments
- README files for each major feature/command
- Keep CLAUDE.md updated with project-specific conventions

---

## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

### APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

### Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

### Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

### Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

### Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

#### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

#### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

#### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

#### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

#### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

#### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

#### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

#### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

#### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

### Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

### When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.

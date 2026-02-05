# Lean Monorepo AI Instructions

You are an expert AI assistant specialized in this high-performance, low-overhead Bun monorepo. Every line of code must adhere to the **Lean Philosophy**.

## 🚀 Core Principles (Must-Have)
- **Minimal Footprint**: Every component and dependency must be resource-efficient. Avoid runtime overhead.
- **Single-Process Hosting**: All apps run within ONE Bun backend process. Use subdomain routing in `apps/backend/src/index.ts` based on the `Host` header.
- **Zero-Magic DX**: Use direct code paths. No GraphQL, no tRPC, no complex abstractions. Use **Hono RPC** for end-to-end type safety.
- **Hardware Target**: Optimized for 1GB RAM, 1 vCPU.
- **Storage Smartness**: Use a single SQLite (libSQL) instance. All tables MUST use the `createTableName(appName, tableName)` helper from `@repo/db` for logical separation.
- **Zero External Dependencies**: Self-host everything (fonts, scripts). No CDNs, no Google Fonts.
- **No Edge / No Admin UI**: Do not suggest Edge functions or complex admin interfaces. Focus on the core app functionality and VPS performance.

## 🛠 Tech Stack
- **Runtime**: Bun + Bun Workspaces
- **Backend**: Hono + Hono RPC
- **Frontend**: Preact + Vite + Tailwind CSS 4 (No Jotai, No heavy state libs)
- **Database**: Drizzle ORM + libSQL (SQLite)
- **Validation**: Zod (Shared in `@repo/shared`)
- **Tooling**: Biome (Linting/Formatting), TypeScript (Strict)
- **Auth**: Simple Session-Cookies (httpOnly, Lax), no complex JWT logic.

## 📂 Project Structure
- `apps/backend/`: The central dispatcher and API.
- `apps/[app-name]/`: Preact frontends.
- `packages/db/`: Centralized database client and schemas with table prefixes.
- `packages/shared/`: Zod schemas and shared types.
- `packages/auth/`: Shared session handling logic.

## 📝 Coding Rules
1. **Naming**: Use `@repo/` workspace scope for local packages.
2. **Type Safety**: Propagate Zod schemas from `@repo/shared` to both Backend (validation) and Frontend (types).
3. **Optimistic UX**: Implement immediate UI feedback using Preact hooks to mask backend latency.
4. **Formatting**: Always follow Biome rules. Do not use ESLint or Prettier.
5. **Simplicity**: If a standard Hono middleware or native Fetch can do it, don't add a library.

# Property Studio V3

Property Studio — Property Intelligence, Real Estate Marketplace,
Community, CRM, Media and AI Platform.

## Phase 1 status

Phase 1 delivers the production monorepo skeleton only:

- pnpm + Turborepo workspaces
- NestJS API with `/health` and `/ready`
- Next.js web placeholder that displays API health
- Prisma 7 (no business tables)
- Docker Compose for PostgreSQL, Redis, and MinIO
- Shared packages, linting, tests, CI, and ADRs

Business domains, auth, payments, and product UI are intentionally deferred.

## Stack

| Layer | Choice |
| --- | --- |
| Web | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| API | NestJS 11, TypeScript |
| Data | PostgreSQL 18, Prisma ORM 7 |
| Cache | Redis 7 |
| Objects | MinIO (S3-compatible) |
| Tooling | pnpm, Turborepo, Vitest, ESLint, Prettier |

## Market defaults

- Market: India (`IN`)
- Currency: `INR`
- Timezone: `Asia/Kolkata`
- Locale: `en-IN`
- Payments provider (later): Razorpay behind a provider interface

## Repository layout

```text
apps/
  api/                 NestJS system of record
  web/                 Next.js client
packages/
  api-client/          Typed fetch client
  contracts/           Shared Zod schemas
  permissions/         Role/permission catalogs
  public-id/           PS-{PREFIX}-{n} helpers
  tsconfig/            Shared TypeScript presets
  ui/                  shadcn/ui foundation
infra/
  docker-compose.yml   PostgreSQL, Redis, MinIO
docs/adr/              Architecture Decision Records
```

## Prerequisites

- Node.js 24.11+
- pnpm 10+
- Docker + Docker Compose

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure
pnpm infra:up

# 3. Configure API environment
cp .env.example apps/api/.env

# 4. Generate Prisma client and apply foundation migration
pnpm --filter @property-studio/api prisma:generate
pnpm --filter @property-studio/api prisma:migrate:deploy

# 5. Run API and web
pnpm dev
```

- Web: http://localhost:3000
- API health: http://localhost:3001/health
- API ready: http://localhost:3001/ready
- MinIO console: http://localhost:9001 (`minioadmin` / `minioadmin`)

> Note: Compose uses `insectai/minio` because the official `minio/minio`
> image is currently unavailable on Docker Hub in some environments.
> The service remains S3-compatible with the same ports and credentials.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start API and web in parallel |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | ESLint across the workspace |
| `pnpm typecheck` | TypeScript checks |
| `pnpm test` | Unit tests |
| `pnpm format:check` | Prettier check |
| `pnpm infra:up` | Start Postgres, Redis, MinIO |
| `pnpm infra:down` | Stop infrastructure |

## Architecture docs

See `docs/adr/` for approved decisions. Do not change architecture without an ADR and explicit approval.

## Security notes

- Never commit `.env` files or secrets
- `.env.example` contains local development placeholders only
- Frontend route checks are not authorization; the API enforces access

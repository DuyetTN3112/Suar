# Route Surface Layout

Purpose:

- keep canonical route families easy to read
- isolate compatibility debt from primary route modules
- make future NestJS migration boundary easier to reason about

## Rules

- primary route families stay at `start/routes/*.ts`
- deprecated compatibility aliases live only under `start/routes/deprecated/*.ts`
- canonical public JSON surface stays under `/api/v1/*`
- legacy `/api/*` business aliases stay deprecated and must not own unique behavior

## Reading Order

When auditing route quality, read in this order:

1. `start/routes/api_v1.ts`
2. canonical business families:
   `users.ts`, `tasks.ts`, `organizations_current.ts`, `reviews.ts`, `skills.ts`
3. `start/routes/deprecated/*.ts`

Interpretation:

- root route files = current contract-of-record
- `deprecated/` = transitional compatibility surface only

## Current Expectation

- deprecated aliases may exist at runtime for compatibility
- internal runtime code under `app/` and `inertia/` must not call those deprecated paths

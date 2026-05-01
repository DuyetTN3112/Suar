# API Governance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock current API standardization work behind automated route-governance checks without breaking AdonisJS + Inertia runtime behavior.

**Architecture:** Keep existing AdonisJS route files and HTTP transport seam in place, but add CI-grade governance scripts that classify runtime routes, detect canonical drift, and fail fast when public API shape or namespace rules regress. This keeps current Inertia flows stable while making future NestJS migration mostly a transport rewrite over a governed contract.

**Tech Stack:** AdonisJS, TypeScript, Node.js ESM scripts, Japa tests, GitNexus route-impact workflow

## Global Constraints

- Preserve current page and Inertia routes.
- Treat `/api/v1/*` as canonical public JSON surface.
- Treat legacy `/api/*` as compatibility aliases only.
- Do not introduce new business logic behind legacy-only `/api/*`.
- Do not break existing API response-boundary or org-context boundary checks.

---

### Task 1: Add Route Governance Check

**Files:**
- Create: `scripts/check_api_route_governance.mjs`
- Modify: `package.json`
- Test: `scripts/audit_api_route_inventory.mjs`

**Interfaces:**
- Consumes: `node ace list:routes --json`
- Produces: `pnpm run check:api:route-governance`

- [ ] **Step 1: Define runtime route rules to enforce**

```js
const FORBIDDEN_CANONICAL_TOKENS = ['_v1', 'legacy', 'compat']
const CANONICAL_PREFIX = '/api/v1/'
const LEGACY_PREFIX = '/api/'
```

- [ ] **Step 2: Implement route loader and bucket classifier**

```js
function classifyRoute(route) {
  const pattern = route.pattern ?? ''

  if (pattern.startsWith('/api/v1/')) return 'canonical'
  if (pattern.startsWith('/api/admin/')) return 'admin'
  if (pattern.startsWith('/api/public/')) return 'public-callback'
  if (
    pattern.startsWith('/api/dev/') ||
    pattern.startsWith('/api/redis') ||
    pattern.startsWith('/api/testing/') ||
    pattern.startsWith('/api/search') ||
    pattern.startsWith('/api/telemetry')
  ) {
    return 'ops'
  }
  if (pattern.startsWith('/api/')) return 'compat'
  return 'page'
}
```

- [ ] **Step 3: Fail on canonical drift and missing canonical mirrors for critical compat families**

```js
if (name.includes('_v1') || name.includes('legacy') || name.includes('compat')) {
  violations.push('canonical route name leaks transitional token')
}

if (pattern.includes('/legacy/')) {
  violations.push('canonical route path leaks legacy marker')
}
```

- [ ] **Step 4: Wire package script**

Run: `pnpm run check:api:route-governance`
Expected: route-governance summary or explicit violations with failing exit code

- [ ] **Step 5: Keep existing inventory audit script aligned**

Run: `pnpm run audit:api:routes`
Expected: readable inventory report with same bucket language as governance check

### Task 2: Document Execution Guardrail

**Files:**
- Modify: `docs/api-migration-roadmap-2026-07-06.md`
- Modify: `docs/api-standardization-audit-2026-07-06.md`

**Interfaces:**
- Consumes: current docs, new `pnpm run check:api:route-governance`
- Produces: explicit CI/runtime governance note for maintainers

- [ ] **Step 1: Add governance check to next-step execution sequence**

```md
- `pnpm run check:api:route-governance`
- `pnpm run check:api:context-boundary`
- `pnpm run check:api:response-boundary`
```

- [ ] **Step 2: Record what this new guardrail does not solve**

```md
- does not remove URL-prefix classification yet
- does not replace route metadata contract yet
- does prevent new namespace and naming drift from entering CI
```

- [ ] **Step 3: Verify docs stay aligned with runtime**

Run: `pnpm run audit:api:routes`
Expected: no contradiction between route-governance wording and runtime inventory wording

### Task 3: Verify Non-Breaking Outcome

**Files:**
- Test: `package.json`
- Test: `scripts/check_api_route_governance.mjs`
- Test: `scripts/check_api_context_boundary.mjs`
- Test: `scripts/check_api_response_boundary.mjs`

**Interfaces:**
- Consumes: current route files and controllers
- Produces: verification evidence for this pass

- [ ] **Step 1: Run route governance check**

Run: `pnpm run check:api:route-governance`
Expected: PASS or concrete violations we intentionally address in same pass

- [ ] **Step 2: Run existing API boundary checks**

Run: `pnpm run check:api:context-boundary`
Expected: `API context boundary: OK`

Run: `pnpm run check:api:response-boundary`
Expected: `API response boundary: OK`

- [ ] **Step 3: Run focused contract coverage if route/controller changes were required**

Run: `pnpm run test:integration -- --files app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts`
Expected: PASS for wrapped contract and canonical/legacy parity assertions

- [ ] **Step 4: Commit**

```bash
git add package.json scripts/check_api_route_governance.mjs docs/api-migration-roadmap-2026-07-06.md docs/api-standardization-audit-2026-07-06.md
git commit -m "chore: add API route governance guardrail"
```

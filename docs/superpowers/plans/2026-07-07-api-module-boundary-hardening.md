# API + Module Boundary Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Suar around one canonical public API boundary and one strict runtime module boundary so current AdonisJS + Inertia behavior stays stable while future NestJS migration inherits clean contracts instead of transport and coupling drift.

**Architecture:** Keep existing route families, transport binding, and Inertia pages in place, but align documentation, broaden runtime guardrails, and refactor the first cross-module runtime violations onto explicit ports or thin public contracts. The first execution pass freezes new drift, fixes a focused set of high-value runtime violations, and leaves the repo ready for later family-by-family API canonicalization.

**Tech Stack:** AdonisJS, TypeScript, Node.js ESM guard scripts, Japa, existing API governance scripts, existing `application/ports/*` and `public_contracts/*` seams

## Global Constraints

- Keep `/api/v1/*` as the canonical public business API namespace.
- Keep current Inertia page behavior stable; do not route backend module communication through HTTP.
- Treat `/api/*` business routes as compatibility aliases only.
- Treat `admin`, `ops/testing`, and `public callback` surfaces as separate route classes.
- Runtime cross-module communication must prefer `application/ports/*` and thin `public_contracts/*`.
- Runtime code under `app/modules` and `start` must not import another module’s `actions/*`, `controllers/*`, `infra/*`, `domain/*`, or internal support helpers.
- Use TDD or guard-first verification for every behavior-changing task.

---

### Task 1: Align standards docs with the approved API and module boundary model

**Files:**
- Modify: `docs/API_STANDARD.md`
- Modify: `docs/api-standardization-audit-2026-07-06.md`
- Modify: `docs/api-migration-roadmap-2026-07-06.md`
- Reference: `docs/superpowers/specs/2026-07-07-api-and-module-boundary-design.md`

**Interfaces:**
- Consumes:
  - approved design spec
  - current API governance language
- Produces:
  - explicit “public business API” taxonomy
  - explicit “module-to-module via ports/contracts, not HTTP” rule
  - explicit runtime import-ban policy for cross-module internals

- [ ] **Step 1: Add module-boundary rule to `docs/API_STANDARD.md`**

```md
### 11. Module-to-module communication is port-first, not HTTP-first

Rules:

- backend modules do not call local `/api/*` or `/api/v1/*` routes to talk to each other
- consumer module defines required seam in `application/ports/*` when capability is not already a stable public contract
- provider module may expose only thin `public_contracts/*` for stable DTOs, events, rules, and intentionally supported facades
- runtime code must not import another module's `actions/*`, `controllers/*`, `infra/*`, `domain/*`, or internal support helpers

Reason:

- lowers coupling
- avoids transport leakage inside monolith
- maps cleanly to future NestJS providers and guards
```

- [ ] **Step 2: Update audit doc so current risk language matches new rule**

```md
Additional architectural risk still open:

- runtime cross-module imports into another module's `infra/*`
- runtime cross-module imports into another module's `actions/*` and controller helpers
- accidental use of HTTP routes as an internal integration seam

Required direction:

- runtime module seams move to `application/ports/*` or thin `public_contracts/*`
- public business API remains transport boundary, not module integration boundary
```

- [ ] **Step 3: Update roadmap to add “module boundary hardening” to Phase 0/1**

```md
Phase 0 — Freeze Drift Immediately

- reject new cross-module runtime imports into another module's internals
- reject new backend self-calls through local HTTP API routes

Phase 1 — Standardize Shared Boundaries

- shared HTTP transport/auth boundary
- shared runtime module-boundary guard
- first batch of port-first refactors for current runtime violations
```

- [ ] **Step 4: Run docs smoke search**

Run: `rg -n "public business API|module-to-module communication|port-first|compatibility aliases" docs/API_STANDARD.md docs/api-standardization-audit-2026-07-06.md docs/api-migration-roadmap-2026-07-06.md`

Expected: all three docs contain the new boundary language with no contradictory wording.

- [ ] **Step 5: Commit**

```bash
git add docs/API_STANDARD.md docs/api-standardization-audit-2026-07-06.md docs/api-migration-roadmap-2026-07-06.md
git commit -m "docs: align api and module boundary rules"
```

### Task 2: Replace the narrow module-domain guard with a runtime module-boundary guard

**Files:**
- Modify: `scripts/check_module_domain_boundary.mjs`
- Modify: `package.json`
- Create: `scripts/module_boundary_runtime_allowlist.json`

**Interfaces:**
- Consumes:
  - current `check_module_domain_boundary.mjs`
  - runtime TypeScript files under `app/modules` and `start`
- Produces:
  - stricter runtime guard under existing script entrypoint
  - temporary allowlist for audited exceptions
  - package script wording aligned with broader policy

- [ ] **Step 1: Expand the script’s blocked import classes**

```js
const BLOCKED_SEGMENTS = [
  '/actions/',
  '/controllers/',
  '/infra/',
  '/domain/',
  '/support/',
]

const ALLOWED_CROSS_MODULE_SEGMENTS = [
  '/public_contracts/',
  '/application/ports/',
]
```

- [ ] **Step 2: Teach the script to ignore same-module imports and read a runtime allowlist**

```js
function getOwningModule(file) {
  return file.startsWith('app/modules/') ? file.split('/')[2] : 'start'
}

function isAllowedCrossModuleImport(importPath, owner, importedModule, allowlist) {
  if (owner === importedModule) return true
  if (ALLOWED_CROSS_MODULE_SEGMENTS.some((segment) => importPath.includes(segment))) return true
  return allowlist.includes(`${owner} -> ${importPath}`)
}
```

- [ ] **Step 3: Seed a narrow audited allowlist file**

```json
[
  "users -> #modules/reviews/infra/repositories/read/review_metrics_repository",
  "http -> #modules/organizations/controllers/mappers/response/organization_response_mapper",
  "http -> #modules/organizations/actions/queries/get_all_organizations_query",
  "http -> #modules/projects/actions/queries/get_projects_list_query",
  "http -> #modules/skills/actions/queries/list_active_skills_catalog_query",
  "http -> #modules/tasks/actions/queries/get_public_tasks_query",
  "http -> #modules/users/actions/queries/search_talents_query",
  "reviews -> #modules/skills/controllers/support/build_proficiency_framework_descriptor"
]
```

- [ ] **Step 4: Update package script name or description without breaking CI calls**

```json
"check:arch:backend:module-domain-boundary": "node ./scripts/check_module_domain_boundary.mjs"
```

Keep script key stable for now, but update console output inside the script to say `module-boundary` rather than only `domain-boundary`.

- [ ] **Step 5: Run the guard to capture real violation inventory**

Run: `node ./scripts/check_module_domain_boundary.mjs`

Expected: either PASS with current allowlist, or a concrete runtime violation list we fix in Task 3/4.

- [ ] **Step 6: Commit**

```bash
git add scripts/check_module_domain_boundary.mjs scripts/module_boundary_runtime_allowlist.json package.json
git commit -m "chore: harden runtime module boundary guard"
```

### Task 3: Remove high-value runtime violations in the `users` and `reviews` seams

**Files:**
- Create: `app/modules/reviews/public_contracts/review_metrics_reader.ts`
- Modify: `app/modules/users/actions/ports/user_external_dependencies_impl.ts`
- Modify: `app/modules/reviews/actions/services/review_public_api.ts`
- Modify: `app/modules/reviews/actions/commands/submit_skill_review_command.ts`
- Modify: `app/modules/reviews/actions/dtos/request/review_dtos.ts`
- Create: `app/modules/skills/public_contracts/proficiency_framework.ts`
- Test: `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`
- Test: `app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts`

**Interfaces:**
- Consumes:
  - `ReviewMetricsRepository`
  - current reviews skill/proficiency helpers
- Produces:
  - thin review metrics contract consumed by `users`
  - thin proficiency contract consumed by `reviews`
  - removal of cross-module `infra/*` and `controllers/support/*` imports in runtime

- [ ] **Step 1: Add a thin public contract for review metrics read operations**

```ts
export interface ReviewMetricsReader {
  listLatestConfidenceSignalsBySkill(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<Array<{ skill_id: string; confidence: string | null }>>

  listActiveDisputedSkillIdsByReviewee(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<Array<{ skill_id: string }>>
}

export const reviewMetricsReader: ReviewMetricsReader = {
  listLatestConfidenceSignalsBySkill: (...args) =>
    ReviewMetricsRepository.listLatestConfidenceSignalsBySkill(...args),
  listActiveDisputedSkillIdsByReviewee: (...args) =>
    ReviewMetricsRepository.listActiveDisputedSkillIdsByReviewee(...args),
}
```

- [ ] **Step 2: Refactor `users` runtime dependency impl to consume the public contract**

```ts
import { reviewMetricsReader } from '#modules/reviews/public_contracts/review_metrics_reader'

const [userSkills, rawConfidenceRows, rawActiveDisputeRows] = await Promise.all([
  skillPublicApi.findUserSkillsWithSkill(userId),
  reviewMetricsReader.listLatestConfidenceSignalsBySkill(userId, trx),
  reviewMetricsReader.listActiveDisputedSkillIdsByReviewee(userId, trx),
])
```

- [ ] **Step 3: Add a thin skills public contract for proficiency-framework lookups**

```ts
export {
  buildProficiencyFrameworkDescriptor,
  getCanonicalProficiencyLevelValue,
  isCanonicalProficiencyLevelCode,
} from '#modules/skills/public_contracts/proficiency_framework_impl'
```

Implementation file may still delegate to current local helpers inside the `skills` module, but consumers import only from `public_contracts/*`.

- [ ] **Step 4: Refactor `reviews` runtime imports off `skills/controllers/support/*`**

```ts
import {
  buildProficiencyFrameworkDescriptor,
  getCanonicalProficiencyLevelValue,
  isCanonicalProficiencyLevelCode,
} from '#modules/skills/public_contracts/proficiency_framework'
```

- [ ] **Step 5: Run focused tests**

Run: `npm run test:integration -- --files app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`

Expected: PASS

Run: `npm run test:integration -- --files app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/modules/reviews/public_contracts/review_metrics_reader.ts app/modules/users/actions/ports/user_external_dependencies_impl.ts app/modules/reviews/actions/services/review_public_api.ts app/modules/reviews/actions/commands/submit_skill_review_command.ts app/modules/reviews/actions/dtos/request/review_dtos.ts app/modules/skills/public_contracts/proficiency_framework.ts
git commit -m "refactor: move users and reviews seams onto public contracts"
```

### Task 4: Remove high-value runtime violations in the `http` cross-module orchestration seam

**Files:**
- Create: `app/modules/http/application/ports/http_global_search_dependencies.ts`
- Create: `app/modules/http/application/ports/http_global_search_dependencies_impl.ts`
- Modify: `app/modules/http/actions/queries/global_search_query.ts`
- Modify: `app/modules/http/controllers/get_organization_members_api_controller.ts`
- Create: `app/modules/organizations/public_contracts/organization_response_contracts.ts`
- Test: `app/modules/http/tests/backend/unit/http_transport_response.spec.ts`
- Test: `tests/integration/search/global_search.spec.ts`

**Interfaces:**
- Consumes:
  - current organization response mapping
  - current global search orchestration
- Produces:
  - consumer-owned HTTP search dependency port
  - removal of direct `http -> other-module actions/controllers` runtime imports
  - thin organization response contract for HTTP API presenter reuse

- [ ] **Step 1: Define the HTTP-owned dependency port**

```ts
export interface HttpGlobalSearchDependencies {
  searchOrganizations(input: SearchInput): Promise<SearchResultSection>
  searchProjects(input: SearchInput): Promise<SearchResultSection>
  searchSkills(input: SearchInput): Promise<SearchResultSection>
  searchPublicTasks(input: SearchInput): Promise<SearchResultSection>
  searchTalents(input: SearchInput): Promise<SearchResultSection>
}
```

- [ ] **Step 2: Move provider wiring into the HTTP adapter implementation**

```ts
import GetAllOrganizationsQuery from '#modules/organizations/actions/queries/get_all_organizations_query'
import GetProjectsListQuery from '#modules/projects/actions/queries/get_projects_list_query'
import ListActiveSkillsCatalogQuery from '#modules/skills/actions/queries/list_active_skills_catalog_query'
import GetPublicTasksQuery from '#modules/tasks/actions/queries/get_public_tasks_query'
import SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'

export const httpGlobalSearchDependencies: HttpGlobalSearchDependencies = {
  async searchOrganizations(input) { /* delegate */ },
  async searchProjects(input) { /* delegate */ },
  async searchSkills(input) { /* delegate */ },
  async searchPublicTasks(input) { /* delegate */ },
  async searchTalents(input) { /* delegate */ },
}
```

Only the adapter implementation owns those imports; `global_search_query.ts` consumes the interface.

- [ ] **Step 3: Move cross-module organization API response mapping into a thin public contract**

```ts
export interface OrganizationMemberApiResponse {
  id: string
  username: string
  email: string | null
  role: string | null
}

export function mapOrganizationMemberApiResponse(
  input: OrganizationMembershipView
): OrganizationMemberApiResponse { /* provider-owned mapper */ }
```

- [ ] **Step 4: Refactor HTTP query/controller usage**

```ts
import { httpGlobalSearchDependencies } from '#modules/http/application/ports/http_global_search_dependencies_impl'

const organizations = await httpGlobalSearchDependencies.searchOrganizations(input)
```

```ts
import {
  mapOrganizationMemberApiResponse,
} from '#modules/organizations/public_contracts/organization_response_contracts'
```

- [ ] **Step 5: Run focused tests**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/http_transport_response.spec.ts`

Expected: PASS

Run: `npm run test:integration -- --files tests/integration/search/global_search.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/modules/http/application/ports/http_global_search_dependencies.ts app/modules/http/application/ports/http_global_search_dependencies_impl.ts app/modules/http/actions/queries/global_search_query.ts app/modules/http/controllers/get_organization_members_api_controller.ts app/modules/organizations/public_contracts/organization_response_contracts.ts
git commit -m "refactor: move http orchestration onto owned ports"
```

### Task 5: Verify the boundary-hardening pass and record remaining runtime debt

**Files:**
- Modify: `docs/api-standardization-audit-2026-07-06.md`
- Modify: `docs/api-migration-roadmap-2026-07-06.md`
- Test: `scripts/check_module_domain_boundary.mjs`
- Test: `scripts/check_api_route_governance.mjs`
- Test: `scripts/check_api_transport_binding.mjs`
- Test: `scripts/check_api_auth_contracts.mjs`
- Test: `scripts/check_api_response_boundary.mjs`
- Test: `scripts/check_http_org_context_seam.mjs`

**Interfaces:**
- Consumes:
  - updated docs
  - broadened module-boundary guard
  - refactored runtime seams
- Produces:
  - verification evidence
  - documented remaining allowlist debt

- [ ] **Step 1: Run runtime module-boundary guard**

Run: `node ./scripts/check_module_domain_boundary.mjs`

Expected: PASS, or only audited allowlist exceptions remain.

- [ ] **Step 2: Run API boundary guard suite**

Run: `pnpm run check:api:route-governance`
Expected: PASS

Run: `pnpm run check:api:transport-binding`
Expected: PASS

Run: `pnpm run check:api:auth-contracts`
Expected: PASS

Run: `pnpm run check:api:response-boundary`
Expected: PASS

Run: `pnpm run check:http:org-context-seam`
Expected: PASS

- [ ] **Step 3: Run route inventory report**

Run: `pnpm run audit:api:routes`

Expected: readable route inventory still classifies canonical, compat, admin/internal, callback, and page surfaces coherently.

- [ ] **Step 4: Record remaining runtime exceptions explicitly**

```md
Remaining runtime module-boundary allowlist:

- exact import path
- owning module
- reason temporary
- target replacement seam
- follow-up phase
```

- [ ] **Step 5: Commit**

```bash
git add docs/api-standardization-audit-2026-07-06.md docs/api-migration-roadmap-2026-07-06.md scripts/module_boundary_runtime_allowlist.json
git commit -m "chore: verify boundary hardening and record remaining seam debt"
```

## Self-Review

### Spec Coverage

This plan covers:

- canonical `/api/v1/*` direction
- legacy `/api/*` alias policy
- admin/ops/testing/callback separation
- module-to-module via ports/contracts
- runtime import guardrails
- first runtime refactor batch without breaking Inertia

### Placeholder Scan

No `TODO`, `TBD`, or “same as previous task” placeholders intentionally left in this plan.

### Type Consistency

Port-first direction stays consistent:

- `http` owns HTTP orchestration ports
- `users` and `reviews` consume thin provider contracts
- guardrail blocks runtime cross-module internal imports

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-07-api-module-boundary-hardening.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

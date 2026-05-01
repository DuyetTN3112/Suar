modules/organizations/controllers/mappers/response/organization_response_mapper# API + Module Boundary Hardening Implementation Plan
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Goal:** Harden Suar around one canonical public API boundary and one strict runtime module boundary so current AdonisJS + Inertia behavior stays stable while future NestJS migration inherits clean contracts instead of transport and coupling drift.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Architecture:** Keep existing route families, transport binding, and Inertia pages in place, but align documentation, broaden runtime guardrails, and refactor the first cross-module runtime violations onto explicit ports or thin public contracts. The first execution pass freezes new drift, fixes a focused set of high-value runtime violations, and leaves the repo ready for later family-by-family API canonicalization.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Tech Stack:** AdonisJS, TypeScript, Node.js ESM guard scripts, Japa, existing API governance scripts, existing `application/ports/*` and `public_contracts/*` seams
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper## Global Constraints
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- Keep `/api/v1/*` as the canonical public business API namespace.
modules/organizations/controllers/mappers/response/organization_response_mapper- Keep current Inertia page behavior stable; do not route backend module communication through HTTP.
modules/organizations/controllers/mappers/response/organization_response_mapper- Treat `/api/*` business routes as compatibility aliases only.
modules/organizations/controllers/mappers/response/organization_response_mapper- Treat `admin`, `ops/testing`, and `public callback` surfaces as separate route classes.
modules/organizations/controllers/mappers/response/organization_response_mapper- Runtime cross-module communication must prefer `application/ports/*` and thin `public_contracts/*`.
modules/organizations/controllers/mappers/response/organization_response_mapper- Runtime code under `app/modules` and `start` must not import another module’s `actions/*`, `controllers/*`, `infra/*`, `domain/*`, or internal support helpers.
modules/organizations/controllers/mappers/response/organization_response_mapper- Use TDD or guard-first verification for every behavior-changing task.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper---
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper### Task 1: Align standards docs with the approved API and module boundary model
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Files:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `docs/API_STANDARD.md`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `docs/api-standardization-audit-2026-07-06.md`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `docs/api-migration-roadmap-2026-07-06.md`
modules/organizations/controllers/mappers/response/organization_response_mapper- Reference: `docs/superpowers/specs/2026-07-07-api-and-module-boundary-design.md`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Interfaces:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Consumes:
modules/organizations/controllers/mappers/response/organization_response_mapper  - approved design spec
modules/organizations/controllers/mappers/response/organization_response_mapper  - current API governance language
modules/organizations/controllers/mappers/response/organization_response_mapper- Produces:
modules/organizations/controllers/mappers/response/organization_response_mapper  - explicit “public business API” taxonomy
modules/organizations/controllers/mappers/response/organization_response_mapper  - explicit “module-to-module via ports/contracts, not HTTP” rule
modules/organizations/controllers/mappers/response/organization_response_mapper  - explicit runtime import-ban policy for cross-module internals
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 1: Add module-boundary rule to `docs/API_STANDARD.md`**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```md
modules/organizations/controllers/mappers/response/organization_response_mapper### 11. Module-to-module communication is port-first, not HTTP-first
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRules:
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- backend modules do not call local `/api/*` or `/api/v1/*` routes to talk to each other
modules/organizations/controllers/mappers/response/organization_response_mapper- consumer module defines required seam in `application/ports/*` when capability is not already a stable public contract
modules/organizations/controllers/mappers/response/organization_response_mapper- provider module may expose only thin `public_contracts/*` for stable DTOs, events, rules, and intentionally supported facades
modules/organizations/controllers/mappers/response/organization_response_mapper- runtime code must not import another module's `actions/*`, `controllers/*`, `infra/*`, `domain/*`, or internal support helpers
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperReason:
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- lowers coupling
modules/organizations/controllers/mappers/response/organization_response_mapper- avoids transport leakage inside monolith
modules/organizations/controllers/mappers/response/organization_response_mapper- maps cleanly to future NestJS providers and guards
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 2: Update audit doc so current risk language matches new rule**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```md
modules/organizations/controllers/mappers/response/organization_response_mapperAdditional architectural risk still open:
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- runtime cross-module imports into another module's `infra/*`
modules/organizations/controllers/mappers/response/organization_response_mapper- runtime cross-module imports into another module's `actions/*` and controller helpers
modules/organizations/controllers/mappers/response/organization_response_mapper- accidental use of HTTP routes as an internal integration seam
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRequired direction:
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- runtime module seams move to `application/ports/*` or thin `public_contracts/*`
modules/organizations/controllers/mappers/response/organization_response_mapper- public business API remains transport boundary, not module integration boundary
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 3: Update roadmap to add “module boundary hardening” to Phase 0/1**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```md
modules/organizations/controllers/mappers/response/organization_response_mapperPhase 0 — Freeze Drift Immediately
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- reject new cross-module runtime imports into another module's internals
modules/organizations/controllers/mappers/response/organization_response_mapper- reject new backend self-calls through local HTTP API routes
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperPhase 1 — Standardize Shared Boundaries
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- shared HTTP transport/auth boundary
modules/organizations/controllers/mappers/response/organization_response_mapper- shared runtime module-boundary guard
modules/organizations/controllers/mappers/response/organization_response_mapper- first batch of port-first refactors for current runtime violations
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 4: Run docs smoke search**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `rg -n "public business API|module-to-module communication|port-first|compatibility aliases" docs/API_STANDARD.md docs/api-standardization-audit-2026-07-06.md docs/api-migration-roadmap-2026-07-06.md`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: all three docs contain the new boundary language with no contradictory wording.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 5: Commit**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```bash
modules/organizations/controllers/mappers/response/organization_response_mappergit add docs/API_STANDARD.md docs/api-standardization-audit-2026-07-06.md docs/api-migration-roadmap-2026-07-06.md
modules/organizations/controllers/mappers/response/organization_response_mappergit commit -m "docs: align api and module boundary rules"
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper### Task 2: Replace the narrow module-domain guard with a runtime module-boundary guard
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Files:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `scripts/check_module_domain_boundary.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `package.json`
modules/organizations/controllers/mappers/response/organization_response_mapper- Create: `scripts/module_boundary_runtime_allowlist.json`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Interfaces:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Consumes:
modules/organizations/controllers/mappers/response/organization_response_mapper  - current `check_module_domain_boundary.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper  - runtime TypeScript files under `app/modules` and `start`
modules/organizations/controllers/mappers/response/organization_response_mapper- Produces:
modules/organizations/controllers/mappers/response/organization_response_mapper  - stricter runtime guard under existing script entrypoint
modules/organizations/controllers/mappers/response/organization_response_mapper  - temporary allowlist for audited exceptions
modules/organizations/controllers/mappers/response/organization_response_mapper  - package script wording aligned with broader policy
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 1: Expand the script’s blocked import classes**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```js
modules/organizations/controllers/mappers/response/organization_response_mapperconst BLOCKED_SEGMENTS = [
modules/organizations/controllers/mappers/response/organization_response_mapper  '/actions/',
modules/organizations/controllers/mappers/response/organization_response_mapper  '/controllers/',
modules/organizations/controllers/mappers/response/organization_response_mapper  '/infra/',
modules/organizations/controllers/mappers/response/organization_response_mapper  '/domain/',
modules/organizations/controllers/mappers/response/organization_response_mapper  '/support/',
modules/organizations/controllers/mappers/response/organization_response_mapper]
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperconst ALLOWED_CROSS_MODULE_SEGMENTS = [
modules/organizations/controllers/mappers/response/organization_response_mapper  '/public_contracts/',
modules/organizations/controllers/mappers/response/organization_response_mapper  '/application/ports/',
modules/organizations/controllers/mappers/response/organization_response_mapper]
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 2: Teach the script to ignore same-module imports and read a runtime allowlist**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```js
modules/organizations/controllers/mappers/response/organization_response_mapperfunction getOwningModule(file) {
modules/organizations/controllers/mappers/response/organization_response_mapper  return file.startsWith('app/modules/') ? file.split('/')[2] : 'start'
modules/organizations/controllers/mappers/response/organization_response_mapper}
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperfunction isAllowedCrossModuleImport(importPath, owner, importedModule, allowlist) {
modules/organizations/controllers/mappers/response/organization_response_mapper  if (owner === importedModule) return true
modules/organizations/controllers/mappers/response/organization_response_mapper  if (ALLOWED_CROSS_MODULE_SEGMENTS.some((segment) => importPath.includes(segment))) return true
modules/organizations/controllers/mappers/response/organization_response_mapper  return allowlist.includes(`${owner} -> ${importPath}`)
modules/organizations/controllers/mappers/response/organization_response_mapper}
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 3: Seed a narrow audited allowlist file**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```json
modules/organizations/controllers/mappers/response/organization_response_mapper[
modules/organizations/controllers/mappers/response/organization_response_mapper  "users -> #modules/reviews/infra/repositories/read/review_metrics_repository",
modules/organizations/controllers/mappers/response/organization_response_mapper  "http -> #modules/organizations/controllers/mappers/response/organization_response_mapper",
modules/organizations/controllers/mappers/response/organization_response_mapper  "http -> #modules/organizations/actions/queries/get_all_organizations_query",
modules/organizations/controllers/mappers/response/organization_response_mapper  "http -> #modules/projects/actions/queries/get_projects_list_query",
modules/organizations/controllers/mappers/response/organization_response_mapper  "http -> #modules/skills/actions/queries/list_active_skills_catalog_query",
modules/organizations/controllers/mappers/response/organization_response_mapper  "http -> #modules/tasks/actions/queries/get_public_tasks_query",
modules/organizations/controllers/mappers/response/organization_response_mapper  "http -> #modules/users/actions/queries/search_talents_query",
modules/organizations/controllers/mappers/response/organization_response_mapper  "reviews -> #modules/skills/controllers/support/build_proficiency_framework_descriptor"
modules/organizations/controllers/mappers/response/organization_response_mapper]
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 4: Update package script name or description without breaking CI calls**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```json
modules/organizations/controllers/mappers/response/organization_response_mapper"check:arch:backend:module-domain-boundary": "node ./scripts/check_module_domain_boundary.mjs"
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperKeep script key stable for now, but update console output inside the script to say `module-boundary` rather than only `domain-boundary`.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 5: Run the guard to capture real violation inventory**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `node ./scripts/check_module_domain_boundary.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: either PASS with current allowlist, or a concrete runtime violation list we fix in Task 3/4.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 6: Commit**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```bash
modules/organizations/controllers/mappers/response/organization_response_mappergit add scripts/check_module_domain_boundary.mjs scripts/module_boundary_runtime_allowlist.json package.json
modules/organizations/controllers/mappers/response/organization_response_mappergit commit -m "chore: harden runtime module boundary guard"
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper### Task 3: Remove high-value runtime violations in the `users` and `reviews` seams
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Files:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Create: `app/modules/reviews/public_contracts/review_metrics_reader.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `app/modules/users/actions/ports/user_external_dependencies_impl.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `app/modules/reviews/actions/services/review_public_api.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `app/modules/reviews/actions/commands/submit_skill_review_command.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `app/modules/reviews/actions/dtos/request/review_dtos.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Create: `app/modules/skills/public_contracts/proficiency_framework.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Interfaces:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Consumes:
modules/organizations/controllers/mappers/response/organization_response_mapper  - `ReviewMetricsRepository`
modules/organizations/controllers/mappers/response/organization_response_mapper  - current reviews skill/proficiency helpers
modules/organizations/controllers/mappers/response/organization_response_mapper- Produces:
modules/organizations/controllers/mappers/response/organization_response_mapper  - thin review metrics contract consumed by `users`
modules/organizations/controllers/mappers/response/organization_response_mapper  - thin proficiency contract consumed by `reviews`
modules/organizations/controllers/mappers/response/organization_response_mapper  - removal of cross-module `infra/*` and `controllers/support/*` imports in runtime
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 1: Add a thin public contract for review metrics read operations**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```ts
modules/organizations/controllers/mappers/response/organization_response_mapperexport interface ReviewMetricsReader {
modules/organizations/controllers/mappers/response/organization_response_mapper  listLatestConfidenceSignalsBySkill(
modules/organizations/controllers/mappers/response/organization_response_mapper    userId: string,
modules/organizations/controllers/mappers/response/organization_response_mapper    trx?: TransactionClientContract
modules/organizations/controllers/mappers/response/organization_response_mapper  ): Promise<Array<{ skill_id: string; confidence: string | null }>>
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper  listActiveDisputedSkillIdsByReviewee(
modules/organizations/controllers/mappers/response/organization_response_mapper    userId: string,
modules/organizations/controllers/mappers/response/organization_response_mapper    trx?: TransactionClientContract
modules/organizations/controllers/mappers/response/organization_response_mapper  ): Promise<Array<{ skill_id: string }>>
modules/organizations/controllers/mappers/response/organization_response_mapper}
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperexport const reviewMetricsReader: ReviewMetricsReader = {
modules/organizations/controllers/mappers/response/organization_response_mapper  listLatestConfidenceSignalsBySkill: (...args) =>
modules/organizations/controllers/mappers/response/organization_response_mapper    ReviewMetricsRepository.listLatestConfidenceSignalsBySkill(...args),
modules/organizations/controllers/mappers/response/organization_response_mapper  listActiveDisputedSkillIdsByReviewee: (...args) =>
modules/organizations/controllers/mappers/response/organization_response_mapper    ReviewMetricsRepository.listActiveDisputedSkillIdsByReviewee(...args),
modules/organizations/controllers/mappers/response/organization_response_mapper}
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 2: Refactor `users` runtime dependency impl to consume the public contract**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```ts
modules/organizations/controllers/mappers/response/organization_response_mapperimport { reviewMetricsReader } from '#modules/reviews/public_contracts/review_metrics_reader'
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperconst [userSkills, rawConfidenceRows, rawActiveDisputeRows] = await Promise.all([
modules/organizations/controllers/mappers/response/organization_response_mapper  skillPublicApi.findUserSkillsWithSkill(userId),
modules/organizations/controllers/mappers/response/organization_response_mapper  reviewMetricsReader.listLatestConfidenceSignalsBySkill(userId, trx),
modules/organizations/controllers/mappers/response/organization_response_mapper  reviewMetricsReader.listActiveDisputedSkillIdsByReviewee(userId, trx),
modules/organizations/controllers/mappers/response/organization_response_mapper])
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 3: Add a thin skills public contract for proficiency-framework lookups**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```ts
modules/organizations/controllers/mappers/response/organization_response_mapperexport {
modules/organizations/controllers/mappers/response/organization_response_mapper  buildProficiencyFrameworkDescriptor,
modules/organizations/controllers/mappers/response/organization_response_mapper  getCanonicalProficiencyLevelValue,
modules/organizations/controllers/mappers/response/organization_response_mapper  isCanonicalProficiencyLevelCode,
modules/organizations/controllers/mappers/response/organization_response_mapper} from '#modules/skills/public_contracts/proficiency_framework_impl'
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperImplementation file may still delegate to current local helpers inside the `skills` module, but consumers import only from `public_contracts/*`.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 4: Refactor `reviews` runtime imports off `skills/controllers/support/*`**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```ts
modules/organizations/controllers/mappers/response/organization_response_mapperimport {
modules/organizations/controllers/mappers/response/organization_response_mapper  buildProficiencyFrameworkDescriptor,
modules/organizations/controllers/mappers/response/organization_response_mapper  getCanonicalProficiencyLevelValue,
modules/organizations/controllers/mappers/response/organization_response_mapper  isCanonicalProficiencyLevelCode,
modules/organizations/controllers/mappers/response/organization_response_mapper} from '#modules/skills/public_contracts/proficiency_framework'
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 5: Run focused tests**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `npm run test:integration -- --files app/modules/users/tests/backend/integration/user_marketplace_api_standardization.spec.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `npm run test:integration -- --files app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 6: Commit**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```bash
modules/organizations/controllers/mappers/response/organization_response_mappergit add app/modules/reviews/public_contracts/review_metrics_reader.ts app/modules/users/actions/ports/user_external_dependencies_impl.ts app/modules/reviews/actions/services/review_public_api.ts app/modules/reviews/actions/commands/submit_skill_review_command.ts app/modules/reviews/actions/dtos/request/review_dtos.ts app/modules/skills/public_contracts/proficiency_framework.ts
modules/organizations/controllers/mappers/response/organization_response_mappergit commit -m "refactor: move users and reviews seams onto public contracts"
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper### Task 4: Remove high-value runtime violations in the `http` cross-module orchestration seam
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Files:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Create: `app/modules/http/application/ports/http_global_search_dependencies.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Create: `app/modules/http/application/ports/http_global_search_dependencies_impl.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `app/modules/http/actions/queries/global_search_query.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `app/modules/http/controllers/get_organization_members_api_controller.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Create: `app/modules/organizations/public_contracts/organization_response_contracts.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `app/modules/http/tests/backend/unit/http_transport_response.spec.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `tests/integration/search/global_search.spec.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Interfaces:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Consumes:
modules/organizations/controllers/mappers/response/organization_response_mapper  - current organization response mapping
modules/organizations/controllers/mappers/response/organization_response_mapper  - current global search orchestration
modules/organizations/controllers/mappers/response/organization_response_mapper- Produces:
modules/organizations/controllers/mappers/response/organization_response_mapper  - consumer-owned HTTP search dependency port
modules/organizations/controllers/mappers/response/organization_response_mapper  - removal of direct `http -> other-module actions/controllers` runtime imports
modules/organizations/controllers/mappers/response/organization_response_mapper  - thin organization response contract for HTTP API presenter reuse
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 1: Define the HTTP-owned dependency port**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```ts
modules/organizations/controllers/mappers/response/organization_response_mapperexport interface HttpGlobalSearchDependencies {
modules/organizations/controllers/mappers/response/organization_response_mapper  searchOrganizations(input: SearchInput): Promise<SearchResultSection>
modules/organizations/controllers/mappers/response/organization_response_mapper  searchProjects(input: SearchInput): Promise<SearchResultSection>
modules/organizations/controllers/mappers/response/organization_response_mapper  searchSkills(input: SearchInput): Promise<SearchResultSection>
modules/organizations/controllers/mappers/response/organization_response_mapper  searchPublicTasks(input: SearchInput): Promise<SearchResultSection>
modules/organizations/controllers/mappers/response/organization_response_mapper  searchTalents(input: SearchInput): Promise<SearchResultSection>
modules/organizations/controllers/mappers/response/organization_response_mapper}
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 2: Move provider wiring into the HTTP adapter implementation**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```ts
modules/organizations/controllers/mappers/response/organization_response_mapperimport GetAllOrganizationsQuery from '#modules/organizations/actions/queries/get_all_organizations_query'
modules/organizations/controllers/mappers/response/organization_response_mapperimport GetProjectsListQuery from '#modules/projects/actions/queries/get_projects_list_query'
modules/organizations/controllers/mappers/response/organization_response_mapperimport ListActiveSkillsCatalogQuery from '#modules/skills/actions/queries/list_active_skills_catalog_query'
modules/organizations/controllers/mappers/response/organization_response_mapperimport GetPublicTasksQuery from '#modules/tasks/actions/queries/get_public_tasks_query'
modules/organizations/controllers/mappers/response/organization_response_mapperimport SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperexport const httpGlobalSearchDependencies: HttpGlobalSearchDependencies = {
modules/organizations/controllers/mappers/response/organization_response_mapper  async searchOrganizations(input) { /* delegate */ },
modules/organizations/controllers/mappers/response/organization_response_mapper  async searchProjects(input) { /* delegate */ },
modules/organizations/controllers/mappers/response/organization_response_mapper  async searchSkills(input) { /* delegate */ },
modules/organizations/controllers/mappers/response/organization_response_mapper  async searchPublicTasks(input) { /* delegate */ },
modules/organizations/controllers/mappers/response/organization_response_mapper  async searchTalents(input) { /* delegate */ },
modules/organizations/controllers/mappers/response/organization_response_mapper}
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperOnly the adapter implementation owns those imports; `global_search_query.ts` consumes the interface.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 3: Move cross-module organization API response mapping into a thin public contract**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```ts
modules/organizations/controllers/mappers/response/organization_response_mapperexport interface OrganizationMemberApiResponse {
modules/organizations/controllers/mappers/response/organization_response_mapper  id: string
modules/organizations/controllers/mappers/response/organization_response_mapper  username: string
modules/organizations/controllers/mappers/response/organization_response_mapper  email: string | null
modules/organizations/controllers/mappers/response/organization_response_mapper  role: string | null
modules/organizations/controllers/mappers/response/organization_response_mapper}
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperexport function mapOrganizationMemberApiResponse(
modules/organizations/controllers/mappers/response/organization_response_mapper  input: OrganizationMembershipView
modules/organizations/controllers/mappers/response/organization_response_mapper): OrganizationMemberApiResponse { /* provider-owned mapper */ }
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 4: Refactor HTTP query/controller usage**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```ts
modules/organizations/controllers/mappers/response/organization_response_mapperimport { httpGlobalSearchDependencies } from '#modules/http/application/ports/http_global_search_dependencies_impl'
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperconst organizations = await httpGlobalSearchDependencies.searchOrganizations(input)
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```ts
modules/organizations/controllers/mappers/response/organization_response_mapperimport {
modules/organizations/controllers/mappers/response/organization_response_mapper  mapOrganizationMemberApiResponse,
modules/organizations/controllers/mappers/response/organization_response_mapper} from '#modules/organizations/public_contracts/organization_response_contracts'
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 5: Run focused tests**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `npm run test:unit -- app/modules/http/tests/backend/unit/http_transport_response.spec.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `npm run test:integration -- --files tests/integration/search/global_search.spec.ts`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 6: Commit**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```bash
modules/organizations/controllers/mappers/response/organization_response_mappergit add app/modules/http/application/ports/http_global_search_dependencies.ts app/modules/http/application/ports/http_global_search_dependencies_impl.ts app/modules/http/actions/queries/global_search_query.ts app/modules/http/controllers/get_organization_members_api_controller.ts app/modules/organizations/public_contracts/organization_response_contracts.ts
modules/organizations/controllers/mappers/response/organization_response_mappergit commit -m "refactor: move http orchestration onto owned ports"
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper### Task 5: Verify the boundary-hardening pass and record remaining runtime debt
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Files:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `docs/api-standardization-audit-2026-07-06.md`
modules/organizations/controllers/mappers/response/organization_response_mapper- Modify: `docs/api-migration-roadmap-2026-07-06.md`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `scripts/check_module_domain_boundary.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `scripts/check_api_route_governance.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `scripts/check_api_transport_binding.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `scripts/check_api_auth_contracts.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `scripts/check_api_response_boundary.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper- Test: `scripts/check_http_org_context_seam.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**Interfaces:**
modules/organizations/controllers/mappers/response/organization_response_mapper- Consumes:
modules/organizations/controllers/mappers/response/organization_response_mapper  - updated docs
modules/organizations/controllers/mappers/response/organization_response_mapper  - broadened module-boundary guard
modules/organizations/controllers/mappers/response/organization_response_mapper  - refactored runtime seams
modules/organizations/controllers/mappers/response/organization_response_mapper- Produces:
modules/organizations/controllers/mappers/response/organization_response_mapper  - verification evidence
modules/organizations/controllers/mappers/response/organization_response_mapper  - documented remaining allowlist debt
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 1: Run runtime module-boundary guard**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `node ./scripts/check_module_domain_boundary.mjs`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS, or only audited allowlist exceptions remain.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 2: Run API boundary guard suite**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `pnpm run check:api:route-governance`
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `pnpm run check:api:transport-binding`
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `pnpm run check:api:auth-contracts`
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `pnpm run check:api:response-boundary`
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `pnpm run check:http:org-context-seam`
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: PASS
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 3: Run route inventory report**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperRun: `pnpm run audit:api:routes`
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperExpected: readable route inventory still classifies canonical, compat, admin/internal, callback, and page surfaces coherently.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 4: Record remaining runtime exceptions explicitly**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```md
modules/organizations/controllers/mappers/response/organization_response_mapperRemaining runtime module-boundary allowlist:
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- exact import path
modules/organizations/controllers/mappers/response/organization_response_mapper- owning module
modules/organizations/controllers/mappers/response/organization_response_mapper- reason temporary
modules/organizations/controllers/mappers/response/organization_response_mapper- target replacement seam
modules/organizations/controllers/mappers/response/organization_response_mapper- follow-up phase
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- [ ] **Step 5: Commit**
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper```bash
modules/organizations/controllers/mappers/response/organization_response_mappergit add docs/api-standardization-audit-2026-07-06.md docs/api-migration-roadmap-2026-07-06.md scripts/module_boundary_runtime_allowlist.json
modules/organizations/controllers/mappers/response/organization_response_mappergit commit -m "chore: verify boundary hardening and record remaining seam debt"
modules/organizations/controllers/mappers/response/organization_response_mapper```
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper## Self-Review
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper### Spec Coverage
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperThis plan covers:
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- canonical `/api/v1/*` direction
modules/organizations/controllers/mappers/response/organization_response_mapper- legacy `/api/*` alias policy
modules/organizations/controllers/mappers/response/organization_response_mapper- admin/ops/testing/callback separation
modules/organizations/controllers/mappers/response/organization_response_mapper- module-to-module via ports/contracts
modules/organizations/controllers/mappers/response/organization_response_mapper- runtime import guardrails
modules/organizations/controllers/mappers/response/organization_response_mapper- first runtime refactor batch without breaking Inertia
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper### Placeholder Scan
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperNo `TODO`, `TBD`, or “same as previous task” placeholders intentionally left in this plan.
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper### Type Consistency
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperPort-first direction stays consistent:
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper- `http` owns HTTP orchestration ports
modules/organizations/controllers/mappers/response/organization_response_mapper- `users` and `reviews` consume thin provider contracts
modules/organizations/controllers/mappers/response/organization_response_mapper- guardrail blocks runtime cross-module internal imports
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper## Execution Handoff
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperPlan complete and saved to `docs/superpowers/plans/2026-07-07-api-module-boundary-hardening.md`. Two execution options:
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapper**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
modules/organizations/controllers/mappers/response/organization_response_mapper
modules/organizations/controllers/mappers/response/organization_response_mapperWhich approach?

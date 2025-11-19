# Search Center Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Search Center from a grouped result list into a production-grade workbench with relevance, explainability, highlighted snippets, and page telemetry.

**Architecture:** Keep the existing federated `GlobalSearchQuery` public-contract fanout. Add a small intelligence layer inside `global_search_query.ts` that computes rank, score, match strength, highlighted snippets, breadcrumbs, and action metadata from normalized entity fields, then sort results before returning them. Update the Svelte Search page to render these richer contracts without adding dependencies.

**Tech Stack:** AdonisJS/Lucid, Svelte 5, Inertia, existing search public contracts, Japa unit/integration tests, Vitest component tests.

## Global Constraints

- No new package dependency for this iteration.
- Preserve grouped API payload fields for compatibility.
- Search result links must remain deep links.
- Page-level keyword search stays centralized at `/search`.
- Use TDD: failing test before production code.
- Run GitNexus impact before editing production symbols.

---

### Task 1: Backend Search Intelligence Contract

**Files:**
- Modify: `app/modules/http/tests/backend/unit/global_search_query.spec.ts`
- Modify: `app/modules/http/actions/queries/global_search_query.ts`

**Interfaces:**
- Produces `GlobalSearchCenterResult.rank: number`
- Produces `GlobalSearchCenterResult.matchStrength: 'exact' | 'strong' | 'partial' | 'fallback'`
- Produces `GlobalSearchCenterResult.matchedFieldLabels: string[]`
- Produces `GlobalSearchCenterResult.highlightedSnippets: Array<Array<{ text: string; match: boolean }>>`
- Produces `GlobalSearchCenterResult.breadcrumbs: string[]`
- Produces `GlobalSearchCenterResult.primaryActionLabel: string`
- Produces `GlobalSearchCenterResult.secondaryMeta: string | null`

- [ ] **Step 1: Write the failing test**

Add a unit test proving exact title/name matches rank before description/comment matches, and highlighted snippets preserve match boundaries.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --files app/modules/http/tests/backend/unit/global_search_query.spec.ts`
Expected: FAIL because new contract fields are missing.

- [ ] **Step 3: Run GitNexus impact**

Run: `gitnexus impact GlobalSearchQuery`
Expected: LOW/MEDIUM. If HIGH/CRITICAL, warn before editing.

- [ ] **Step 4: Implement minimal intelligence layer**

Update `GlobalSearchCenterResult`, field result builder, comment builder, score computation, highlight segmentation, breadcrumbs, action labels, and final sort.

- [ ] **Step 5: Run backend unit test**

Run: `npm run test:unit -- --files app/modules/http/tests/backend/unit/global_search_query.spec.ts`
Expected: PASS.

### Task 2: Search Workbench UI

**Files:**
- Modify: `inertia/tests/component/search/search_page.test.ts`
- Modify: `inertia/pages/search/index.svelte`

**Interfaces:**
- Consumes backend fields from Task 1.
- Renders highlight segments with `<mark>`.
- Renders breadcrumbs, match strength, rank, action metadata, and grouped domain summary.
- Sends `search.ui.result_clicked` telemetry on result click.

- [ ] **Step 1: Write the failing UI test**

Assert highlighted match segments, match explanation, sidebar totals, and result-click telemetry payload.

- [ ] **Step 2: Run UI test to verify it fails**

Run: `npm run test:ui -- inertia/tests/component/search/search_page.test.ts`
Expected: FAIL because UI does not render new fields or telemetry.

- [ ] **Step 3: Run GitNexus impact**

Run: `gitnexus impact SearchPage`
Expected: LOW/MEDIUM. If HIGH/CRITICAL, warn before editing.

- [ ] **Step 4: Implement workbench UI**

Update layout with filter rail, summary strip, high-density result cards, highlight rendering, and click telemetry.

- [ ] **Step 5: Run UI test**

Run: `npm run test:ui -- inertia/tests/component/search/search_page.test.ts inertia/tests/component/search/search_entrypoints.test.ts`
Expected: PASS.

### Task 3: Verification

**Files:**
- No production files unless failures reveal gaps.

- [ ] **Step 1: Run focused backend and UI suites**

Run:
`npm run test:unit -- --files app/modules/http/tests/backend/unit/global_search_query.spec.ts app/modules/http/tests/backend/unit/search_page_controller.spec.ts`
`npm run test:integration -- --files tests/integration/search/global_search_api.spec.ts`
`npm run test:ui -- inertia/tests/component/search/search_page.test.ts inertia/tests/component/search/search_entrypoints.test.ts`

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run GitNexus detect-changes**

Run: `gitnexus detect-changes`
Expected: changed scope includes search query/page/tests.

# Suar Enterprise Search and Discovery Design

**Status:** Proposed target architecture  
**Date:** 2026-08-01  
**Primary discovery surfaces today:** Global Search Center, marketplace task discovery, talent discovery  
**Primary users:** Contributors, organization members, project operators, talent/recruiting users  
**Platform dependencies:** [Filter Platform](./2026-08-01-filter-platform-design.md),
[Taxonomy and Metadata](./2026-08-01-taxonomy-metadata-design.md)

## 1. Objective

Suar Search must become a professional discovery system rather than a keyword box. It must help a
user express an incomplete information need, progressively refine it, understand why results were
returned, recover from mistakes, and act on the result without losing context.

The target experience combines:

- exact and typo-tolerant lexical retrieval;
- multi-label taxonomy and tags that preserve everything an entity can legitimately belong to;
- server-side contextual facets and explicit filters;
- query syntax and natural-language-to-filter assistance;
- semantic retrieval and reranking only after lexical relevance is measurable;
- permission-safe totals and facets;
- saved searches, alerts, history, feedback, and a governed relevance-learning loop;
- deterministic fallbacks, explainability, accessibility, and operational controls.

“Google-like” means excellent intent handling and recovery, not copying Google's interface or
claiming equivalent scale.

This specification owns text retrieval, search projections, retrieval-text understanding, ranking,
suggestions, relevance evaluation, and search operations. It consumes the Filter Platform's typed
criteria and facet contracts. It does not own the general filter grammar, saved-filter lifecycle,
context registry, URL encoding, or non-search execution adapters. The surfaces listed above are
current Search consumers, not the boundary of the Filter Platform.

## 2. Current-state evidence

Suar already has a strong pre-production core:

- six parallel sources: talents, tasks, projects, skills, organizations, and comments;
- bounded per-source deadlines and partial-result fallback;
- Elasticsearch BM25, field boosts, fuzzy matching, and phrase-prefix matching;
- explainable Weighted Reciprocal Rank Fusion;
- result snippets, local highlighting, match strength, breadcrumbs, and click telemetry;
- relevance and latency benchmarks;
- versioned indices, stable aliases, atomic cutover, cleanup, and rollback;
- a dedicated test search plane.

The main product gaps are structural:

| Area                | Current behavior                                                                                                                      | Gap                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Filters             | Domain tab and matched-field label filter                                                                                             | Filters only the bounded candidate set; not true facets over the complete result population |
| Counts              | Counts are built from at most 12 candidates per source                                                                                | Not authoritative totals or contextual facet counts                                         |
| Empty query         | Blank input returns no results                                                                                                        | Cannot browse entirely by filters                                                           |
| Pagination          | Top 24 blended results only                                                                                                           | No deep vertical discovery or stable cursor                                                 |
| Tags                | Project tags are flattened into `tags_text`                                                                                           | Cannot aggregate or filter exact project tags                                               |
| Task metadata       | Search document omits available `tech_stack`, `domain_tags`, role, verification, status, priority, dates, and outcome metadata        | Valuable filters and rank signals are lost before retrieval                                 |
| Talent expertise    | `business_domains`, `problem_categories`, and `task_types` exist in the search document but are currently populated with empty arrays | Talent discovery cannot use proven experience dimensions                                    |
| Query understanding | Trim, length bound, accent folding, fuzzy/prefix search                                                                               | No phrases, exclusions, qualifiers, taxonomy expansion, correction, or intent plan          |
| Suggestions         | Local recent queries only                                                                                                             | No entity, query, facet-value, or correction suggestions                                    |
| Ranking             | Text heuristic plus vertical rank through RRF                                                                                         | No freshness, trust, activity, behavioral, semantic, or diversity signals                   |
| Feedback            | Submit, empty, failure, and click events                                                                                              | No search session, dwell, conversion, reformulation, hide, or relevance judgment loop       |

## 3. Product principles

### 3.1 Preserve information before tuning ranking

If an entity belongs to several genres, skills, domains, task types, technologies, or topics, the
index must retain all of them. A missing label is a recall failure that ranking cannot repair.

Every filterable concept has:

- a stable canonical identifier;
- localized display labels;
- aliases and synonyms;
- optional parent paths for hierarchical browsing;
- a taxonomy version;
- zero or more entity assignments;
- assignment provenance: explicit, imported, derived, or suggested;
- confidence and review status for machine-suggested assignments.

Free-form tags remain useful, but canonical taxonomy terms and free-form tags are distinct fields.
Aliases map to a canonical term instead of creating duplicate facet buckets.

### 3.2 Separate hard filters from preferences

The UI and query contract distinguish:

- **Must:** result must contain the criterion;
- **Prefer:** matching results receive a bounded boost, but recall is preserved;
- **Exclude:** matching results are removed;
- **Any:** OR within selected values of one facet;
- **All:** every selected value must match;
- **Range:** numeric/date interval.

The safe default is OR within one facet and AND across different facets. The selected behavior must
always be visible to the user.

### 3.3 Search and filter are independent inputs to one discovery plan

Keyword text and filter expressions can be authored and executed independently. When both are
present in a Search context, filters, permissions, sorting, pagination, retrieval, ranking, and
facet aggregation compile into one server-side discovery plan. The client never creates
authoritative counts by filtering a small result page.

An empty text query with one or more filters is a valid browse request. A completely empty request
may return a permission-safe, popularity/freshness-ranked discovery page.

### 3.4 Progressive power

Beginners get a search box, suggestions, chips, and plain-language filters. Expert users can use
qualifiers and Boolean composition. Both paths compile into the same typed query plan, and the UI
can round-trip between visual filters and query syntax whenever the expression is representable.

### 3.5 Relevance changes require evidence

No semantic model, synonym, boost, rule, or behavior-based reranker ships solely because it sounds
intelligent. Every change needs judged queries, negative cases, latency evidence, and a rollbackable
ranking version. Talent ranking also requires fairness and protected-attribute review.

## 4. Search integration contract

Search accepts the canonical `QueryCriteriaRequest` and `FilterExpression` defined by the Filter
Platform. Search-specific fields wrap that provider-neutral criteria instead of declaring a second,
flatter filter language.

```ts
interface SearchDiscoveryRequest {
  criteria: QueryCriteriaRequest
  search: {
    scope: 'all' | 'task' | 'talent' | 'project' | 'skill' | 'organization' | 'comment'
    retrievalMode?: 'auto' | 'exact' | 'lexical' | 'semantic' | 'hybrid'
  }
}
```

The selected Filter context allowlists valid fields, operators, sorts, facets, Boolean depth,
preference effects, and empty-request behavior for the Search scope. A blended scope is a
Search-owned virtual context that can normalize common fields and delegate source-specific clauses;
it does not make arbitrary cross-domain fields universally filterable.

The response extends the Filter Platform's `QueryCriteriaResponse` with Search-specific information:

- submitted, normalized, and optionally corrected query;
- parsed query terms and qualifiers;
- ranked hits with stable result identity and ranking version;
- query, entity, and filter suggestions;
- source health and degradation state;
- opaque search session and request identifiers.

Totals, facets, canonical criteria, pagination, execution state, and diagnostics retain the common
Filter Platform response semantics. Search may add retrieval and ranking explanations but cannot
weaken permission or missing-data behavior declared by the context.

Cursor state is signed or server-held and includes stable sort tie-breakers. Deep pagination uses
`search_after` with a point-in-time context where consistency matters; it does not use large
offsets.

## 5. Facet model

The following are facet families for current Search-backed discovery resources. Owning product
domains approve them in vertical context definitions; Search normalizes the common subset for its
blended virtual context and provides indexed executor bindings. They are examples, not an exhaustive
catalog of Filter Platform fields.

### 5.1 Common facets

Available in blended search when meaningful across sources:

- result domain;
- organization/project;
- canonical skills;
- canonical topics/domain tags;
- updated time;
- visibility/access scope.

### 5.2 Task facets

- required skill IDs and skill categories;
- business domains and domain tags;
- problem categories and task types;
- technologies/stack;
- difficulty, priority, label, and workflow status;
- organization, project, creator, and assignee state;
- role, autonomy, collaboration, and verification method;
- accepting applications and deadline range;
- created, updated, and due date ranges;
- public/internal visibility.

### 5.3 Talent facets

- skills and skill categories;
- proven business domains, problem categories, task types, technologies, and domain tags;
- confidence signal and evidence source;
- trust-score and completed-task ranges;
- reviewed/imported/disputed skill counts;
- availability/searchability and saved state;
- relationship to the current organization/project when available.

Protected characteristics are never filter or ranking features.

### 5.4 Project facets

- organization, status, and visibility;
- canonical tags and free-form tags;
- required/represented skills when available;
- creator, manager, and owner;
- created and updated ranges.

### 5.5 Skill and organization facets

- skill category, display type, active status, and parent taxonomy path;
- organization tags/domain, verification state, and updated range when the product model supports
  them.

### 5.6 Facet behavior

- Counts are computed after permission filters.
- Counts are contextual to query and other selected facets.
- A selected facet can use disjunctive/self-excluding counts so alternatives do not incorrectly
  disappear.
- High-cardinality facets provide search-within-facet instead of rendering thousands of values.
- Hierarchical facets support multiple paths for one entity.
- Missing metadata is measurable. User-facing “Unspecified” is shown only when useful; operators
  always get a completeness report.
- Facet value limits, shard-size behavior, and approximate count relations are explicit.

## 6. Metadata and taxonomy pipeline

### 6.1 Index representation

Each multi-label concept is stored twice when both behaviors are needed:

- `keyword[]` canonical IDs for filtering, aggregation, and sorting;
- searchable text containing canonical labels and aliases for retrieval.

Hierarchies store ancestor paths by level. Exact tags are never represented only as a whitespace-
joined text field.

### 6.2 Enrichment

At write or projection time:

1. Preserve explicit assignments.
2. Normalize aliases to canonical terms.
3. Derive inherited ancestor paths.
4. Aggregate talent expertise from verified work history and skill evidence.
5. Produce optional machine suggestions from text.
6. Keep suggested assignments separate until policy accepts them.
7. Record taxonomy and enrichment versions in the document.

### 6.3 Completeness gates

Track by entity type:

- percentage missing required facet groups;
- average and percentile label count per document;
- unknown/retired taxonomy references;
- orphan aliases;
- documents whose source metadata and index projection disagree;
- enrichment age and taxonomy-version lag.

Production indexing alerts on regressions. Search relevance fixtures include intentionally
multi-label documents so losing secondary classifications fails tests.

## 7. Query understanding

### 7.1 Deterministic syntax

The Filter Platform owns parsing and round-tripping structured qualifiers into the context's AST.
Search hosts the mixed search-box experience, separates recognized qualifiers from residual text,
and applies its own phrase, spelling, lexical, or semantic understanding only to that residual text.
Unknown qualifier keys and parser errors remain Filter diagnostics rather than silently becoming
Search text.

Initial qualifiers should be discoverable through autocomplete:

```text
type:task skill:"PostgreSQL" domain:fintech difficulty:hard
type:talent skill:typescript skill:postgresql trust:>=70 -status:inactive
project:"Search Center" updated:>=2026-07-01 "alias cutover"
assignee:@me status:(todo OR in_progress) -tag:legacy
```

Supported concepts include phrases, exclusions, ranges, dates, `@me`, parentheses in advanced mode,
and bounded Boolean operators. Parser errors identify the exact token and offer a correction.

### 7.2 Taxonomy-aware expansion

Query terms can expand through reviewed aliases, abbreviations, translations, and taxonomy
relationships. Expansion is explainable and bounded. Exact quoted text disables semantic expansion.

Examples:

- `postgres` can match the canonical PostgreSQL skill;
- Vietnamese and English labels can map to the same canonical domain;
- a parent domain can include descendants while showing that expansion as an editable chip.

### 7.3 Spelling and zero-result recovery

- Never silently replace an exact identifier.
- Offer “Did you mean” when correction confidence is sufficient.
- On zero results, identify filters that caused the dead end and offer one-click relaxation.
- Offer broader taxonomy parents, related skills, removed exclusions, and alternate scopes.
- Preserve the original query and make every rewrite reversible.

### 7.4 Natural-language assistance

After the deterministic contract is stable, a constrained assistant may translate natural language
through the Filter Platform's natural-language-to-AST contract. Search can host this assistant in a
discovery surface and retains ownership of retrieval-text interpretation. The assistant must display
the extracted qualifications and filters before or with results, allow manual edits, never emit raw
DSL, and never make hiring decisions.

## 8. Retrieval and ranking pipeline

1. Resolve the authorized Filter context, validate criteria, and compose permission constraints.
2. Accept Filter-parsed qualifiers, resolve taxonomy aliases, and parse the residual retrieval text.
3. Select relevant sources and query plans.
4. Retrieve lexical candidates with exact, phrase, BM25, prefix, and bounded typo branches.
5. Retrieve semantic candidates for supported fields when `hybrid` is justified.
6. Fuse independent candidate ranks with RRF.
7. Apply bounded structured features such as freshness, trust, completion, and availability.
8. Optionally rerank a small top window with a measured semantic or learning-to-rank model.
9. Enforce diversity caps where one domain, organization, or entity type would crowd out equally
   relevant results.
10. Return explanations based on actual contributing signals.

Ranking order is versioned. Business rules can pin, exclude, boost, or bury results, but rules are
audited, previewable, time-bounded, and evaluated against organic relevance.

## 9. Suggestions and search entry experience

The searchbox uses an accessible combobox/listbox interaction with debounce and cancellation. It
groups suggestions into:

- recent and saved searches;
- direct entity navigation;
- query completions;
- canonical skills/tags/facet values;
- scopes and qualifier completions;
- popular or organization-relevant searches when privacy thresholds permit.

Keyboard behavior follows WAI-ARIA: focus stays in the input, arrows move the active suggestion,
Enter accepts, Escape closes, and all result updates are announced through an appropriate live
region. State is encoded in a shareable URL and restored on Back navigation.

The full result page provides:

- compact applied-filter chips and clear-all;
- a responsive facet rail/drawer;
- search within long facet lists;
- true totals and active-sort explanation;
- result reasons, highlights, breadcrumbs, and domain-specific quick actions;
- preview without losing scroll/filter state;
- partial-source and stale-index indicators;
- useful empty/loading/error states.

## 10. Feedback, evaluation, and learning

### 10.1 Event contract

Every rendered search has an opaque search-session ID, request ID, ranking version, retrieval mode,
selected filters, and ordered result IDs. Privacy-safe events include:

- impression;
- result click;
- meaningful dwell/open;
- save/bookmark/apply/invite/add-to-project conversion;
- hide/not relevant and reason;
- query reformulation;
- filter add/remove;
- correction accept/reject;
- abandonment and zero result.

Raw query retention, if ever introduced for quality review, requires explicit governance,
minimization, access control, and retention limits. Sparse clicks are not treated as ground truth.

### 10.2 Quality gates

Expand the judged corpus beyond the current 18 queries with:

- Vietnamese morphology and accent variants;
- exact identifiers and quoted phrases;
- typos and correction negatives;
- multi-label taxonomy recall;
- hard/optional/excluded filters;
- zero-result relaxation;
- permission and facet-count leakage cases;
- long-tail and no-relevant-result queries;
- freshness, diversity, and fairness cases.

Track Recall, Precision, MRR, nDCG, zero-result rate, reformulation rate, click-through by rank,
successful action rate, abandonment, p50/p95/p99 latency, timeout rate, and facet interaction rate.
Offline gains must not ship with unacceptable online guardrail regressions.

## 11. Delivery phases

### Phase A — Authoritative faceted discovery

1. Adopt Filter Platform AST V1, context definitions, diagnostics, and response semantics.
2. Publish Search-owned blended contexts and indexed executor bindings for domain-owned vertical
   contexts.
3. Permit filter-only browsing through those contexts.
4. Enrich task documents with existing multi-value metadata.
5. Populate talent expertise arrays from verified aggregates.
6. Preserve project tags as exact arrays.
7. Implement the first Search vertical with server-side filters, contextual facets, true totals,
   sort, and cursor.
8. Implement URL-backed chips and responsive facet UI through shared Filter Platform state and
   primitives.
9. Add metadata-completeness, adapter-conformance, and search-relevance tests and telemetry.

The implementation plan selects concrete pilots. Tasks are a strong first Search vertical because
Suar already owns rich task metadata; talents require aggregate provenance and fairness review.
These pilot choices do not define the Filter Platform architecture or total product scope.

### Phase B — Query assistance and recovery

1. Entity/facet/query suggestions with accessible keyboard interaction.
2. Integrate the Filter Platform qualifier parser and visual-filter round-trip into Search UX.
3. Reviewed synonym/alias sets.
4. Spelling suggestions and zero-result filter relaxation.
5. Integrate Search UX and conversion events with Filter Platform saved views and alerts; Search
   retains only Search-specific recent-history synchronization.

### Phase C — Advanced relevance

1. Structured rank features and diversity controls.
2. Hybrid semantic retrieval pilot for tasks and talents.
3. Semantic reranking over a bounded top window.
4. Query rules and a previewable relevance-operator workflow.
5. A/B or interleaving evaluation with explicit guardrails.

### Phase D — Assisted and adaptive search

1. Integrate the Filter Platform natural-language-to-AST capability with Search retrieval-text
   understanding and editable explanation.
2. Privacy-thresholded behavioral reranking.
3. Carefully bounded personalization.
4. Organization-specific vocabularies and ranking policies.

## 12. Phase A acceptance criteria

- A user can retrieve results with filters and no keyword.
- A multi-label task remains discoverable through every assigned canonical label. Reviewed alias
  recall is a Phase-B vocabulary capability and must not be implied by a Phase-A index that has not
  projected approved aliases.
- Any/all/exclude semantics have deterministic contract and integration tests.
- Facet totals reflect the complete permission-visible result set, not the returned page.
- Facet counts cannot reveal unauthorized entities.
- Selected filters survive refresh, sharing, shell changes, and browser Back.
- Task results support at least skills, domains/tags, technology, difficulty, type, organization,
  assignment/application state, and updated-date filtering.
- Search p95 remains within the agreed local gate at representative facet cardinality.
- Existing global search compatibility fields and fallback behavior remain intact during migration.
- Benchmark fixtures prove secondary-label recall and zero-result recovery.
- Search and non-search adapters pass the common Filter Platform semantic fixtures for overlapping
  capabilities.

## 13. Explicit non-goals for the first phase

- Do not add an LLM before typed filters and taxonomy completeness are reliable.
- Do not create a Search-specific filter grammar that competes with the Filter Platform AST.
- Do not silently infer and publish sensitive or protected talent attributes.
- Do not expose raw Elasticsearch DSL to clients.
- Do not calculate authoritative facets in the browser.
- Do not use click popularity to override permission, exact identity matches, or explicit user sort.
- Do not create a single giant index solely to make cross-domain facets easier.

## Implementation closure notes — 2026-08-09

The first Talent discovery slice now has an executable browser contract in addition to the
Search/Filter boundaries described above:

- date facet buckets from Elasticsearch may arrive as numeric epoch milliseconds and must be
  normalized to canonical ISO values before they cross the Discovery response boundary;
- cursor links must preserve the requested page size because page size is part of cursor identity;
- same-object skill proficiency is evaluated from nested evidence, while non-searchable/private
  candidates remain excluded from hits and pagination;
- browser seed routes may create deterministic public, proficiency-decoy and privacy-decoy records,
  but they are test prerequisites only and never become a client-side authority.

The role-play remains bounded evidence rather than release closure: visual artifact joins,
cross-browser/WebKit execution, release-manifest metadata, audit joins and independent review are
still required by the test matrix.

The saved-view Search Center slice is now also executable through the shared UI contract:

- Search exposes saved-view capabilities to authenticated users; current-organization scope gates
  the organization share target and task-member shared-view/alert capabilities;
- organization sharing is authorized against approved membership, and revocation/stale grants
  fail closed without returning saved criteria;
- read-only shared views suppress mutation controls while retaining duplicate-as-copy, and the
  bounded Chromium RP-FST-06 journey passes `2/2` with conflict/reapply and revoke coverage.

This does not promote RP-FST-06 to release complete: WebKit/Safari, screenshot/hash/ACL/audit
joins, a valid release manifest and independent reviewer approval remain required.

Taxonomy split repair is now bounded across both governance and owner continuation: the admin
stale-plan rejection role-play passes `1/1`, while the real user Search Center task context
(`/search?type=task`) exposes `tasks.discovery.member` saved views and alerts. A token-bound,
test-only `seed-taxonomy-repair-roleplay` prerequisite transitions a created view/alert to
`requires_repair`/paused without replacing the governed taxonomy apply path. The isolated owner
browser case passes `1/1` through save, subscribe, repair, revalidate and explicit resume. The
combined file rerun is not promoted because the dirty relocation worktree timed out in a later
worker/DB run; governance apply, visual/audit joins, cross-browser evidence and release gates
remain open.

The bounded Filter consumer coordinator now derives candidates from a persisted taxonomy plan and
records per-view receipts keyed by `(saved_view_id, planToken, input_checksum)`. A taxonomy-reference
projection keeps candidate discovery server-owned, deterministic rename updates the view, and split
outcomes preserve criteria while pausing the linked alert. The dedicated
`filter_taxonomy_migration_runs` child ledger persists progress, `scan_pass` and CAS state.
Taxonomy governance now checks the parent fence before calling the Filter child, ignores
client-supplied consumer items, and does not publish while the child is applying or requires
repair. Focused coordinator/reference unit evidence passes `6/6`, the durable final-rescan and
repair-resume unit passes `6/6`, governance unit evidence passes `9/9`, transaction-scoped
PostgreSQL coordination integration passes `2/2` with two concurrent initial coordinator calls
serialized to one child progression and a rollback/retry worker-crash regression, the saved-view
schema slice passes `8/8`, and the governance API slice passes `5/5`. The rollback test models an
exception inside the transaction; it does not claim process-kill or multi-worker recovery. This
remains bounded: unsupported assignment/projection/index consumers, process-boundary crash
recovery, cross-browser, audit/visual/release joins and independent review remain open. Persisted
impact keys outside the approved saved-view/alert coordinator allow-list now fail closed.

Search recovery evidence is likewise bounded rather than complete. The actual
`search_degraded_recovery_roleplay.spec.ts` Chromium suite passes `3/3`: healthy exact
totals/facets, opaque-cursor tamper rejection, fresh-request recovery, and alias-integrity
fail-closed/recovery through a token-bound test-only control that adds/removes a real second
Elasticsearch alias backing generation. This proves the application boundary response, not a
network outage, timeout or shard-failure provider incident. The browser does not intercept the
Discovery response or replace the provider with an in-process fake. The bounded test-clock PIT
expiry/recovery case now passes. The fixture controller uses a fixed fault slot, process-local
serialization, idempotent orphan cleanup and post-update alias verification; its unit safety
coverage is `3/3`. RP-FST-09 now retains each seed timestamp and calls owner-scoped seed cleanup from
`finally` across healthy, alias-fault and PIT cases; matching alias/clock fixtures are released
before row cleanup, testing-route safety passes `8/8`, and Chromium remains `3/3`. The Search page now
surfaces a safe compatibility-mode/source-unavailable
diagnostic on the task-scoped fallback path; the focused controller test passes `3/3`, the Search
Center UI test passes `14/14`, and the task-scoped degraded browser assertion passes within the
Chromium suite. Search Center navigation now cancels the previous visit and guards stale
cancellation callbacks with a monotonic sequence. Focused Vitest passes `16/16`, including a
real Inertia/http late-response contract in which an older response is deliberately delivered
after a newer response and cannot replace it; targeted Search Center ESLint remains `0`. This is
transport-level evidence rather than a browser E2E race proof. Real network/shard PIT fault,
browser-level race execution, multi-worker/process-crash fixture cleanup and the related
audit/visual/release joins remain open.

The Talent Discovery response now preserves the additive canonical taxonomy envelope from the
strict index: approved alias text, taxonomy versions, assignment provenance/review states and
nested skill evidence, while continuing to apply the explicit allowlist. Search binding/context
unit evidence passes `7/7`, the Discovery application and production Talent engine integrations
pass `13/13`, and targeted ESLint passes `0`. Complete HTTP/browser, privacy/fairness,
rebuild/cutover, cross-browser and release-manifest evidence remains open.

Empty-query and multi-label semantics now have bounded cross-component evidence. Filter/Search
unit and controller tests cover context-driven browse, default-filter and reject behavior for an
empty text-plus-filter request (`31/31`), without hardcoding blank-query policy in Search. A
reference-to-real-PostgreSQL-to-real-Elasticsearch differential contract covers Any, All, None,
Exactly and At-least-N over a duplicate/case-variant multi-label population (`1/1`), with domain
and Elasticsearch compiler coverage at `21/21`. Full SQL/ES, API/UI, role-play, visual, security,
unknown/hidden-value, invalid-N and nested-expression matrix coverage remains open.

Missing, known-empty, unknown and hidden multi-value states now have a bounded contract slice
(`3/3`) plus Elasticsearch compiler unit coverage `13/13`; the compiler preserves boolean/zero
values and applies explicit state policy without string coercion. Full PostgreSQL/Elasticsearch
parity, facet/total/timing leakage, API/UI, role-play, visual and security coverage remains open.

Secondary taxonomy recall is also bounded through a real Elasticsearch/SearchDiscovery slice (`1/1`)
covering secondary skill, tag and classification labels, including hit projection, selected facet
counts and saved semantic criteria round-trip. Self-excluding facets have real Elasticsearch
integration `2/2` plus compiler unit `5/5`: supported facet subtrees preserve tenant/status scope
and non-extractable mixed expressions return a capability diagnostic instead of invented counts.
PostgreSQL/API/UI/role-play/visual/security and broader permission/population coverage remain open.

Selected-zero facets now have a dedicated real Elasticsearch/SearchDiscovery check (`1/1`): the
selected value remains inspectable with `count: 0`, an exact count relation, authoritative facet
metadata, an unchanged canonical filter and zero total, without counting a private value. The
admin audit SQL boundary also has a dedicated off-page integration (`1/1`) plus existing executor
`5/5` and URL/detail frontend `8/8` evidence; pagination does not hide the matching event or its
request/trace metadata. HTTP/API, server-driven staged UI, role-play, visual and accessibility
closure remain open.

High-cardinality facet paging is bounded by real Elasticsearch evidence `1/1` plus facet compiler
unit `5/5`; selected values are retained without duplicate entries across pages. The UI domain
boundary is bounded by Marketplace/Talent Vitest evidence `4/4`, covering shared search/taxonomy/
multi-select/commit primitives with intentionally different task versus recruiter composition and
wording. Ambiguous/adversarial authoring has unit `2/2` and contract `1/1` evidence for editable
preview, explicit uncertainty, manual fallback and `autoExecute: false`. SQL parity, UI runtime
accessibility, browser role-play, visual/manual review, security and performance closure remain open.

Advanced relevance experiments now have bounded safety evidence: the authoring contract passes
`3/3` and SearchDiscovery integration `1/1` for preview, shadow mode, explicit ranking version and
fail-safe fallback when candidates are malformed or would alter eligibility, facets or
authorization. Personalization and organization policy have unit `7/7` plus contract `2/2`
evidence for global fallback, consent/reset/opt-out, organization isolation and bounded explanation
without leaking organization IDs. Production experiment runners, real provider/API/UI/browser,
security, resilience, performance, visual and reviewer/manifest gates remain open.

The release matrix validator now enforces execution outcome semantics: runtime values must be
`passed|failed|skipped`, and required-case references to failed or skipped artifacts are rejected;
deferred cases remain allowed without passed evidence. Its focused wrapper and fixture tests pass
`43/43` (`23/23` wrapper plus `20/20` fixture), with targeted ESLint `0`. The validator now also
requires every test, role-play and screenshot artifact to join the manifest `releaseId`, and every
artifact kind must map the case's required layers exactly. This closes false-positive result,
release-join and layer-mapping paths only; it does not create the authoritative per-case manifest,
artifact/hash joins or reviewer sign-offs still needed for release closure.

The cursor/PIT lifetime boundary is now aligned by construction. `ElasticsearchFilterQueryExecutor`
derives its default PIT `keep_alive` from the signed `ElasticsearchCursorCodec` TTL, rounded up to
whole seconds, while an explicit `pitKeepAlive` remains an intentional override. The regression
unit passes `4/4`, the cursor codec unit passes `2/2`, and the targeted ESLint batch is clean. The
isolated real Talent role-play rerun passes Chromium `5/5`, including native cursor traversal after
the prior `SEARCH_CURSOR_EXPIRED` observation. This is bounded browser evidence only; network or
shard-level PIT failure, WebKit/Safari, accessibility, visual/hash/ACL, manifest and reviewer
closure remain open.

The Admin Audit investigation now has a bounded real browser slice as well. RP-FST-04 Chromium
`1/1` stages filters without changing the committed URL/results, applies them through the visible
admin UI, finds an off-page event through SQL-backed authority, preserves detail request/trace
metadata, and cross-checks the canonical API response. It does not close the required screenshot
joins, cross-browser/accessibility layers, or release-manifest/reviewer gates.

The Search page cursor-recovery boundary is now explicit. Invalid, expired, and stale Discovery
cursors render a fail-closed page with empty compatibility results and a typed
`discoveryFailure`; the controller does not invoke the legacy global-search fallback. Search Center
shows a visible cursor-unavailable state and its fresh-search action removes the cursor before
retrying. The focused HTTP controller suite passes `3/3`, Search Center passes `18/18`, the shell
URL suite brings the combined Search UI batch to `20/20`, and the scoped ESLint/Prettier batch is
clean. This is unit/component evidence, not proof of browser cursor expiry, visual/accessibility,
resilience, or release-manifest closure.

TC-FST-014 remains deliberately bounded. The shared Filter Platform state/URL lifecycle tests are
`26/26`, but no current production surface instantiates `FilterStateController`; therefore this
slice does not claim browser/Inertia wiring or legacy flat-URL migration. Search's existing
`q`/`type`/`field` URLs remain a separate compatibility surface until an owning consumer and an
explicit migration contract are registered.

The next bounded continuation adds evidence at the existing consumer seams without claiming the
unowned shared-controller migration. Marketplace filter navigation now has focused Vitest evidence
`6/6`: the legacy flat query remains readable, an Apply transition explicitly pushes browser history
(`replace: false`), and incoming props rehydrate draft state without an unsolicited navigation.
Search's degraded/cursor bridge now has controller evidence `4/4` and Search Center evidence `20/20`:
cursor requests combined with source unavailable, timeout, or stale-index diagnostics fail closed,
never restart through legacy global search, and expose a query/filter-preserving retry without the
cursor. The expression-builder slice now rehydrates when the canonical `expression`/`preferences`
props signature changes; the focused expression/model/qualifier batch passes `8/8`.

RP-FST-09 now has five Chromium cases passing `5/5`, including real Search Center journeys that use
a task-scoped cursor, advance the approved test clock, show the cursor-unavailable state, fail closed
when the cursor meets an unavailable source, remove `cursor` through visible retry actions, and
capture the recovered state where applicable. This does not close network/shard fault injection,
browser race timing, cross-browser/AX/visual review, or release artifact and reviewer joins.

The bounded Search Center navigation continuation now has two additional Chromium role-play
results. TC-FST-002 q-only retrieval passes `1/1` through the real Search Center input and canonical
`/search?q=...` URL, with authoritative Discovery output and no legacy result mode. TC-FST-024
passes `1/1` using one same-organization fixture containing 25 searchable tasks: the real Next
control retains the task scope and opaque cursor in the URL, changes the result page from 24 to 1
hit, and removes the Next control at the boundary. The test-only seed route validates a bounded
`searchTaskCount` of 1–32 and reindexes the complete fixture set. These are bounded UI/role-play
evidence only; cross-browser, visual/AX, resilience, release-manifest and reviewer joins remain
open. TC-FST-028 remains blocked at the production-contract seam because typed result-count
relaxation proposals and permission-revalidated UI apply/undo wiring are not yet defined.

The next bounded evidence wave adds TC-FST-005 Chromium `1/1` through the real Search Center:
the same authorized task is recalled by a secondary skill label, secondary tag, and secondary
classification label, each through the canonical `q` plus `type=task` route and Discovery card.
TC-FST-008 adds a UI component test `1/1` proving an exact zero-count selected facet remains
inspectable, `aria-selected`, and retained when another value is added. AST-002 adds orchestration
unit coverage (`15/15` focused file) proving an over-depth expression is rejected before provider
cost estimation or execution. TC-FST-009 remains explicitly blocked at the UI contract because
the current frontend has no facet `nextCursor` or load-more callback; these slices do not close
provider parity, saved semantic round-trip, visual/AX, cross-browser or release joins.

The existing TC-FST-012 recruiter role-play now has a verified Chromium `1/1` run through
`/org/talents`: two seeded skills and minimum proficiency are submitted together, the matching
talent renders public verified accomplishment evidence, and private source/task/reviewer facts
remain absent. This strengthens the real UI/privacy boundary but does not close disputed evidence,
fairness, cross-session, visual/AX, cross-browser or release joins. Projection TC-FST-025/026 and
TC-FST-029 remain blocked at their documented production seams: live replay and ledger-aware
rollback/process-crash recovery are not contracted, and ambiguous proposal/manual-fallback props
are not wired into production UI.

## Reduced implementation tranche (2026-08-10)

For the current continuation, “done” means implementation at an owned production seam, its
focused unit/contract/integration evidence, and a truthful Chromium role-play where that seam
exists. Focused lint/format checks are run in batches after the code wave. This is an implementation
checkpoint, not full package DoD or release closure, and it does not claim the whole release train
is production-ready.

The following remain deliberately deferred: WebKit/Firefox execution, full visual and runtime
accessibility review, network/shard and process-crash resilience, and the authoritative release
manifest with immutable artifact joins, screenshot/hash/ACL/audit evidence and reviewer sign-off,
as well as full-repository typecheck, lint, build, security and performance closure.
The final bounded verification batch passes backend unit `44/44`, UI component tests `13/13`,
Chromium Search Center role-play `3/3`, focused ESLint exit `0`, and code/test Prettier exit `0`.
Cases whose production contract is not present yet (including TC-FST-009, the browser portions of
TC-FST-020/021, TC-FST-025/026, TC-FST-028 and TC-FST-029) remain documented as deferred rather
than being closed with synthetic evidence. The master matrix therefore remains a release-gate
view at `0 [x] / 31 [~] / 0 [ ]`; it is not a progress percentage for this bounded tranche.

## 14. Research references

- [Elastic hybrid search](https://www.elastic.co/docs/solutions/search/hybrid-search)
- [Elastic search-as-you-type fields](https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-as-you-type.html)
- [Elastic suggesters](https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-suggesters.html)
- [Elastic aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/8.15/search-aggregations.html)
- [Elastic filtering and post-filter behavior](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/filter-search-results)
- [Elastic terms-set query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-terms-set-query)
- [Elastic rank evaluation](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-rank-eval)
- [Elastic query rules](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-using-query-rules.html)
- [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [GitHub search syntax](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax)
- [Slack search modifiers and filters](https://slack.com/help/articles/202528808-Search-in-Slack-Search-in-Slack-)
- [Jira advanced search and JQL](https://support.atlassian.com/jira-service-management-cloud/docs/what-is-advanced-search-in-jira-cloud/)
- [LinkedIn Recruiter AI-assisted search and filters](https://www.linkedin.com/help/recruiter/answer/a1660341)
- [Google Cloud Talent Solution filters](https://docs.cloud.google.com/talent-solution/job-search/docs/search-filters)
- [Google Cloud Talent Solution spell checking](https://docs.cloud.google.com/talent-solution/job-search/v3/docs/search)
- [Algolia faceting concepts](https://www.algolia.com/doc/guides/managing-results/refine-results/faceting)
- [Algolia behavior-based reranking](https://www.algolia.com/doc/guides/algolia-ai/re-ranking)

# Filter, Search, and Taxonomy — Test Matrix and Role-Play Evidence Plan

> **Release principle:** không một Unit test, Contract test, Integration test, Component test hay E2E
> test đơn lẻ nào đủ chứng minh tính năng/flow đúng. Một scenario chỉ hoàn thành khi các lớp test bổ
> sung cho nhau và P0 user flow được chốt bằng role-play E2E qua UI thật, semantic assertions,
> screenshot checkpoints, backend/audit verification, negative-path evidence và trải nghiệm được một
> reviewer độc lập chấp nhận.

**Related documents:**

- [Filter Platform Design](../specs/2026-08-01-filter-platform-design.md)
- [Enterprise Search and Discovery Design](../specs/2026-08-01-enterprise-search-discovery-design.md)
- [Taxonomy and Metadata Design](../specs/2026-08-01-taxonomy-metadata-design.md)
- [Multi-Worker TDD Implementation Plan](./2026-08-01-filter-search-taxonomy-platform.md)

## 1. Status convention and test layers

Coordinator note — 2026-08-08: Search/Filter/Taxonomy verification is deferred while the
Task → Verified Accomplishment train is handled first. No existing Search/Filter test result is
promoted to feature-complete evidence during this phase.

Coordinator audit snapshot — 2026-08-08: focused evidence is partial only. Filtering unit 24/24,
Search unit 16/16, saved-view integration 7/7, and user/org Search UI 10/10 passed. The new WP-17
regression proves the UI does not refilter a bounded server response. No P0 master or role-play row
is promoted to `[x]`: browser journey, screenshot, backend side-effect, negative/resilience,
accessibility, performance, and independent review artifacts are still absent. Repository-wide
typecheck/lint are RED on the existing dirty worktree, so those layers remain open rather than
waived.

WP-20 follow-up evidence — backend qualifier parser/round-trip 7/7, shared frontend qualifier
projection 2/2, shared Filter regression wave 30/30, focused ESLint pass, and Svelte-check 0/0.
These are implementation-layer evidence only; no qualifier P0/RP row is closed without Search
boundary, live UI, accessibility, screenshot and browser role-play evidence.

Coordinator audit update — 2026-08-09: a Chromium role-play proves the Search Discovery task API
combined/cursor seam at `1/1`, but it calls `fetch('/api/v1/search/discovery')` directly rather than
performing the defined Talent/Search Center UI journey. It is supporting API evidence only; it does
not close RP-FST-03 or TC-FST-003. Provider differential/explanation, view-state, UI, and the other
required release layers remain open.

Coordinator audit update — 2026-08-09: the matrix validator now has a runnable Japa unit suite
`14/14` covering valid joins, deferred applicability, and negative schema/ownership/artifact metadata cases. The separate
release CLI still rejects `docs/12-evidence/test-matrix.json` as `manifest_invalid`; validator tests
do not substitute for a real release manifest, screenshots, backend/audit joins, or reviewer closure.

Mỗi master scenario, detailed case, role-play journey và visual-review gate có đúng một trạng thái:

- `[ ]` — chưa làm hoặc evidence bundle còn thiếu;
- `[~]` — đang implement/run/review;
- `[x]` — tất cả required layers, artifacts và review gates đã pass.

Coordinator/QA owner cập nhật trạng thái matrix. Một worker không tự đánh `[x]` chỉ vì test mình sở
hữu đã xanh.

Mọi `TC-FST-*` master scenario là P0. Release applicability được ghi bằng record máy đọc trong
release-train manifest, không được nhét một trạng thái thứ tư vào checkbox:

- 28 master scenarios đầu tiên trong bảng §4 là `initial_required` khi context/capability liên quan
  nằm trong release train; WP-00 materializes chúng thành danh sách canonical ID cụ thể;
- `TC-FST-029` là `conditional_wp25`; `TC-FST-030` là `conditional_wp28`; `TC-FST-031` là
  `conditional_wp29`;
- manifest phải liệt kê từng ID cụ thể với `applicability: required | deferred`, lý do, approver và
  release ID. Row deferred giữ `[ ]`, không được giả thành `[x]` hoặc `N/A`;
- initial/conditional-through-WP-25 rows use accountable evidence owner `WP-26E` and closure authority
  `WP-26F`; `TC-FST-030` uses `WP-30A`, `TC-FST-031` uses `WP-30B`, and `WP-30C` closes their selected
  advanced rows. Các package trong cột `Contributors` chỉ cung cấp evidence, không có quyền tự đóng
  row;
- mỗi detailed case cũng có đúng một `evidenceOwner` trong manifest, dù cột `Owner` có thể liệt kê
  nhiều implementation contributor.

| Code     | Layer                        | Chứng minh được                                                 | Không tự chứng minh được                 |
| -------- | ---------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| `U`      | Unit/domain                  | Truth table, canonicalization, state transition, score bounds   | Wiring, persistence, browser flow        |
| `PB`     | Property/mutation            | Invariants qua nhiều tổ hợp, idempotence, parser/AST robustness | Real provider/DB/UI correctness          |
| `CT`     | Contract/conformance         | DTO/schema/event/adapter semantics không drift                  | Transaction, real provider, UX           |
| `IT-SQL` | PostgreSQL integration       | Migration, query, transaction, permission, cursor, outbox       | Elasticsearch parity, UI comprehension   |
| `IT-ES`  | Elasticsearch integration    | Mapping, filter DSL, facets, total, cursor, rebuild             | SQL parity, browser behavior             |
| `DIFF`   | Differential/provider parity | SQL/reference/ES trả cùng eligible IDs và semantics             | Layout, navigation, operability          |
| `API`    | HTTP/composition             | Auth boundary, validation, diagnostics, compatibility           | Người dùng hiểu và hoàn thành flow       |
| `UI`     | Component/Vitest             | State reducer, rendering, validation, a11y semantics            | Real route/session/backend integration   |
| `RP`     | Playwright role-play E2E     | Actor thật dùng UI qua route/session/provider thật              | Toàn bộ rule permutation nội bộ          |
| `VS`     | Screenshot/visual checkpoint | State/hierarchy/layout người dùng thực sự nhìn thấy             | Business side effect nếu thiếu assertion |
| `AX`     | Accessibility                | Keyboard, focus, roles/names, zoom, text equivalent             | Persistence và authorization correctness |
| `SEC`    | Security/privacy/fairness    | Cross-tenant, no-leakage, protected/proxy fields                | Happy-path usability                     |
| `RES`    | Resilience/concurrency       | Timeout, abort, retry, crash, replay, stale version             | Visual clarity                           |
| `PERF`   | Performance/capacity         | p50/p95/p99, payload, query/index/alert throughput              | Semantic correctness                     |
| `AUD`    | Audit/provenance             | Version, source, migration, activation, delivery history        | UI comprehension                         |
| `SHD`    | Shadow/canary                | Legacy/V2 equivalence và production-like guardrails             | Deterministic root-cause isolation       |
| `MAN`    | Structured experience review | Wording, cognitive load, discoverability, screenshot sequence   | Repeatable regression automation         |

`Required layers` là tối thiểu. Nếu một layer không phù hợp với một selected row, manifest phải có
`layerApplicabilityOverride` gồm layer, reason, evidence owner, QA approver, date và release ID. Đây
không phải trạng thái row và validator phải từ chối override chỉ nói “đã test ở layer khác”.

## 2. Proof model: khi nào một feature hoặc flow được coi là đúng

### 2.1 P0 evidence bundle

Một P0 flow chỉ `[x]` khi đủ toàn bộ proof phù hợp:

- [ ] **PROOF-01 — Semantic proof:** rule, three-valued logic, set/Boolean semantics, ranking bounds
      và migration transitions có Unit/Property tests.
- [ ] **PROOF-02 — Boundary proof:** Filter AST, context, Search wrapper, taxonomy, projection, saved
      view, alert và event contracts có versioned Contract/conformance tests.
- [ ] **PROOF-03 — Persistence/provider proof:** real PostgreSQL/Elasticsearch integration chứng minh
      transaction, permission, complete population, facets, cursor, outbox, replay và side effects.
- [ ] **PROOF-04 — Parity proof:** reference/SQL/Elasticsearch executors chạy cùng fixture và so sánh
      eligible IDs, totals/facets/count relation, unknown semantics và stable ordering.
- [ ] **PROOF-05 — UI state proof:** Component tests chứng minh draft/committed/server state, URL,
      cancellation, validation, diagnostics và accessibility không phụ thuộc timing browser.
- [ ] **PROOF-06 — Journey proof:** role-play E2E thực hiện core action qua UI thật. API/testing hook
      chỉ được seed prerequisites; không được dùng để bỏ qua action đang chứng minh.
- [ ] **PROOF-07 — Visible-state proof:** semantic assertions chạy trước mọi screenshot; ảnh chứng
      minh state/hierarchy/affordance thật sự hiển thị cho đúng actor.
- [ ] **PROOF-08 — Side-effect proof:** sau browser journey, query/audit kiểm tra canonical criteria,
      permissions, saved revision, projection generation, alert watermark hoặc experiment exposure.
- [ ] **PROOF-09 — Negative proof:** mỗi P0 flow có ít nhất một permission, stale response,
      failure/degraded, concurrency hoặc invalid-input branch qua layer thích hợp.
- [ ] **PROOF-10 — No-false-pass:** không `test.skip`, conditional early return, swallowed error,
      assertion trong optional branch, silent fallback, arbitrary sleep hoặc screenshot trước assertion.
- [ ] **PROOF-11 — Artifact proof:** evidence report chứa screenshot manifest, trace/video khi fail,
      concise console/network errors, seed/data manifest, environment và commit/hash.
- [ ] **PROOF-12 — Experience proof:** reviewer chưa tham gia implementation xem screenshot sequence
      và có thể nói actor đã làm gì, thấy gì, hiểu gì, gặp lỗi gì và phục hồi thế nào.

### 2.2 Evidence bundle by change type

| Change type                | Minimum automated bundle         | Mandatory final proof                      |
| -------------------------- | -------------------------------- | ------------------------------------------ |
| Pure Filter AST/operator   | U, PB, CT                        | DIFF khi executor hỗ trợ operator          |
| SQL context/filter         | U, CT, IT-SQL, API, UI           | RP, VS, AX cho P0 surface                  |
| Indexed Search context     | U, CT, IT-ES, DIFF, API, UI, SEC | RP, VS, RES, PERF                          |
| Taxonomy provider/change   | U, CT, IT-SQL, AUD               | RP/VS khi người dùng thấy repair/migration |
| Saved view/share           | U, IT-SQL, API, UI, SEC, RES     | RP, VS, AUD                                |
| Alert                      | U, IT-SQL, RES, SEC, AUD         | RP/VS cho subscribe/pause/delivery state   |
| Projection/rebuild/cutover | U, IT-SQL, IT-ES, RES, AUD, PERF | RP safe-state + SHD/rollback evidence      |
| Qualifier/NL assistance    | U, PB, CT, UI, SEC               | RP, VS, AX; manual fallback proof          |
| Ranking/personalization    | U, CT, IT-ES, SEC, PERF          | SHD/experiment, RP explanation, VS, MAN    |

## 3. Persona, data, viewport, and runtime matrix

### 3.1 Actor personas

| Persona         | Role and scope                          | Core journeys                                                     |
| --------------- | --------------------------------------- | ----------------------------------------------------------------- |
| `ACT-ANON`      | Anonymous/public viewer                 | Public filter-only marketplace; no private values                 |
| `ACT-USER`      | Authenticated individual                | Global Search, URL, saved private view, notification quick filter |
| `ACT-TALENT`    | Searchable professional                 | Inspect own discoverability/public evidence and opt-out           |
| `ACT-RECRUITER` | Org member finding talent               | Talent discovery, multi-skill filters, saved/shared view          |
| `ACT-MANAGER`   | Task/project/team operator              | Operational task SQL filters and team state                       |
| `ACT-ORGADMIN`  | Org governance/audit owner              | Audit investigation, taxonomy repair, org vocabulary/policy       |
| `ACT-SYSADMIN`  | Platform administrator                  | Global audit, projection activation/rollback, relevance rules     |
| `ACT-FOREIGN`   | User from another organization          | Cross-tenant denial and no-leakage tests                          |
| `ACT-REVOKED`   | Actor whose permission changes mid-flow | Re-authorization, stale URL/view/cursor, alert pause              |
| `ACT-SYSTEM`    | Worker/projector/alert/rebuild process  | Replay, fence, checkpoint, tombstone, delivery idempotency        |

### 3.2 Data classes and metadata shapes

| Class             | Fixture shape                                | Required expectation                                           |
| ----------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `PUBLIC`          | Public task/profile/project/tag              | Eligible only under declared context rules                     |
| `ORG_PRIVATE`     | Organization-only entity/value               | Never leaks across org in hit/count/facet/suggestion/error     |
| `RESTRICTED`      | Protected/internal trait or evidence         | Never offered as filter/ranking feature without approval       |
| `KNOWN_EMPTY`     | Authoritatively empty set                    | Different from missing/unknown; set semantics deterministic    |
| `UNKNOWN`         | Source unavailable/not collected             | Explicit policy; never coerced to false/zero/empty             |
| `MULTI_PRIMARY`   | Multiple legitimate canonical labels         | All labels preserved and filterable                            |
| `MULTI_SECONDARY` | Match exists only through second/later label | Recall must remain 100%                                        |
| `MULTI_PARENT`    | Taxonomy node with two ancestor paths        | Path identity/expansion deterministic                          |
| `LEGACY_SINGLE`   | Scalar wrapped as array                      | Coverage says `legacy_single_value`, not multi-label truth     |
| `FREE_FORM`       | Exact tag not canonical taxonomy             | Exact matching; no invented canonical ID/hierarchy             |
| `RETIRED`         | Selected inactive/merged/split term          | Inspectable, migrated or requires repair; never silently lost  |
| `HIGH_CARD`       | 10k option values / long tail                | Async value search/paging, bounded payload, selected retention |
| `UNICODE`         | Vietnamese accents, emoji, RTL/long label    | Stable canonical ID, URL, parsing and rendering                |
| `CORRUPT`         | Malformed JSON/version/document              | Fail closed with diagnostic/quarantine; no broad result        |

### 3.3 Combinatorial dimensions

Pairwise coverage is required for ordinary combinations; all high-risk intersections below are
explicit rows and cannot be delegated to pairwise generation alone.

| Dimension        | Values                                                                               |
| ---------------- | ------------------------------------------------------------------------------------ |
| Retrieval input  | empty, exact ID, lexical phrase, typo, Vietnamese variant, quoted phrase             |
| Eligibility      | none, one condition, nested AND/OR/NOT, Require/Exclude, max-depth/max-count         |
| Set operator     | Any, All, None, Exactly, At-least-N                                                  |
| Data knowledge   | value, known-empty, unknown, hidden, stale                                           |
| Facet            | constrained, self-excluding, unsupported self-excluding, missing bucket, approximate |
| Provider         | SQL, Elasticsearch, blended, unavailable, partial, stale generation                  |
| Pagination       | first/next/last, stable tie, cursor tamper/expiry/generation change                  |
| Permission       | public, own, org, admin, foreign, revoked mid-session                                |
| Taxonomy version | current, renamed, merged, split, retired, provider unavailable                       |
| UI policy        | instant, debounced, staged, desktop rail, mobile drawer                              |
| Navigation       | fresh URL, refresh, Back, Forward, new tab, malformed/oversized legacy URL           |
| Concurrency      | stale response, double Apply, multi-tab save, two workers, cutover during query      |

### 3.4 Required browser and viewport coverage

| Gate            | Browser/viewport                                                                  | Frequency               |
| --------------- | --------------------------------------------------------------------------------- | ----------------------- |
| Worker P0       | Chromium desktop                                                                  | Every affected package  |
| PR P0           | Chromium 1440×900 plus 390×844 for changed responsive flow                        | Every merge gate        |
| Wave gate       | Chromium + Firefox + WebKit for selected journeys                                 | End of integration wave |
| Release P0      | Chromium/Firefox/WebKit + mobile Chrome/mobile Safari equivalents                 | Release candidate       |
| Accessibility   | Chromium keyboard/semantic checks at 100%, 200%, 400%; reduced motion             | Every P0 surface        |
| Visual evidence | Desktop checkpoint per major surface and mobile checkpoint per responsive journey | Every role-play         |

## 4. Master acceptance scenario matrix

`VS` means a required reviewed screenshot checkpoint, not a screenshot produced only on failure.

| Status | ID         | Scenario / actor journey                                                | Required layers                                           | Observable proof                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Contributors                     |
| ------ | ---------- | ----------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| [~]    | TC-FST-001 | `ACT-ANON` browses Marketplace with no keyword, filters only            | U, CT, IT-ES, API, UI, RP, VS, SEC                        | HTTP filter-only/off-page pagination and authorized total pass; true facets, rich multi-label semantics, UI, role-play, and privacy layers remain                                                                                                                                                                                                                                                                                                                                           | WP-12/13/16/17/24B/26E           |
| [~]    | TC-FST-002 | `ACT-USER` runs keyword-only Search                                     | U, CT, IT-ES, API, UI, RP, VS                             | Real Search Center route q-only retrieval and Search Center frontend canonical-history tests pass; real provider/ranking/browser/RP/VS layers remain                                                                                                                                                                                                                                                                                                                                        | WP-16/17/26E                     |
| [~]    | TC-FST-003 | `ACT-USER` combines retrieval text + strict filters + preferences       | U, CT, IT-ES, DIFF, API, UI, RP, VS                       | Real ES application 9/9, canonical HTTP 5/5, provider differential `2/2`, and the regression wave `31/31` cover strict eligibility plus bounded preference parity; authenticated browser role-play passes `1/1` with real indexing, cursor tamper/recovery, and screenshot artifact. Explainability is typed/fail-closed (`19/19` contract unit), but the real mapper emits no actual signal provenance yet; strict-filter/preference/taxonomy provenance, frontend rendering and VS remain | WP-13/16/17/21/26E               |
| [~]    | TC-FST-004 | Empty text + empty filter under allow/deny contexts                     | U, CT, IT-SQL, IT-ES, API, UI, RP, VS, SEC                | Filter/Search unit and controller evidence `31/31` covers context-owned browse/default/reject behavior; Search delegates blank-query policy. Full SQL/ES, API/UI, RP, VS and SEC evidence remains open                                                                                                                                                                                                                                                                                         | WP-04/10/12/16/26B/26E           |
| [~]    | TC-FST-005 | Entity matches only secondary skill/tag/classification                  | U, CT, IT-ES, DIFF, RP, VS                                | Real Elasticsearch/SearchDiscovery evidence `1/1` covers secondary skill, tag and classification hit projection, selected facet counts and saved semantic criteria round-trip; dedicated differential, PostgreSQL/API, UI/RP/VS and broad permission/population recall remain open                                                                                                                                                                                                                                                            | WP-03/07/13/24B/24C/26B/26E      |
| [~]    | TC-FST-006 | Any/All/None/Exactly/At-least-N on multi-label data                     | U, PB, CT, IT-SQL, IT-ES, DIFF, API, UI, RP, VS           | Reference → real PostgreSQL → real Elasticsearch differential contract `1/1`, plus domain/ES compiler unit `21/21`, agrees on eligible IDs for all five operators over duplicate/case-variant labels; invalid/zero N, unknown/hidden, nested, API/UI/RP/VS and other auth populations remain open                                                                                                                                                                      | WP-01/08/10/11/13/26B/26E        |
| [~]    | TC-FST-007 | Missing, known-empty, unknown and hidden values                         | U, PB, CT, IT-SQL, IT-ES, API, UI, RP, VS, SEC            | Contract evidence `3/3` plus Elasticsearch compiler unit `13/13` cover explicit missing/known-empty/unknown/hidden policy and preserve boolean/zero values without string coercion; PostgreSQL/ES parity, facet/total/timing leakage, API/UI/RP/VS/SEC remain open                                                                                                                                                                                                                                                              | WP-01/04/08/11/13/26B/26E        |
| [~]    | TC-FST-008 | Selected facet reaches count zero                                       | CT, IT-SQL, IT-ES, UI, RP, VS                             | Real Elasticsearch/SearchDiscovery evidence `1/1` keeps the selected value inspectable with `count=0`, `countRelation=exact`, `selected=true`, authoritative facet metadata, unchanged canonical filter and zero total; SQL/UI/RP/VS remain open                                                                                                                                                                                                                                                                                          | WP-10/11/13/15/17/26E            |
| [~]    | TC-FST-009 | High-cardinality facet search and paging                                | CT, IT-SQL, IT-ES, UI, RP, VS, PERF                       | Real Elasticsearch integration `1/1` plus facet compiler unit `5/5` prove bounded paging, selected-value retention and no duplicate facet entries across pages; SQL parity, UI/RP/VS and dedicated PERF evidence remain open                                                                                                                                                                                                                                                                                                                     | WP-10/11/13/26C/26E              |
| [~]    | TC-FST-010 | Self-excluding facet supported vs non-extractable expression            | U, CT, IT-SQL, IT-ES, API, UI, RP, VS                     | Real Elasticsearch integration `2/2` plus compiler unit `5/5` prove authorized self-excluding counts and a capability diagnostic for mixed non-extractable expressions; SQL/API/UI/RP/VS/security and deeper expression variants remain open                                                                                                                                                                                                                                                                                         | WP-01/08/10/11/13/26B/26E        |
| [~]    | TC-FST-011 | Admin audit SQL filter over off-page event                              | IT-SQL, API, UI, RP, VS, AX                               | Dedicated SQL off-page integration `1/1`, combined admin executor `5/5`, URL/detail frontend `8/8` and isolated RP-FST-04 Chromium `1/1` preserve event identity/request-trace metadata through staged Apply, off-page SQL retrieval, detail and API; canonical visual/AX, responsive, cross-browser and release joins remain open                                                                                                                                                                     | WP-10/14/15/26E                  |
| [~]    | TC-FST-012 | Recruiter filters Talent by multiple skills/proficiency/public evidence | CT, IT-ES, UI, RP, VS, SEC                                | Persisted same-object proficiency/privacy/cursor browser evidence and multi-skill UI evidence pass; disputed evidence, facets, visual, cross-session isolation and release joins remain                                                                                                                                                                                                                                                                                                  | WP-07/13/24C/26B/26E             |
| [~]    | TC-FST-013 | Marketplace and Talent UIs remain domain-specific                       | UI, RP, VS, AX, MAN                                       | Focused Vitest evidence `4/4` proves shared search/taxonomy/multi-select/commit primitives with distinct Marketplace compact-task versus Talent recruiter/task-ranking composition and wording; RP/VS, runtime AX and manual responsive/visual review remain open                                                                                                                                                                                                                                                               | WP-11/17/24B/24C/26E             |
| [~]    | TC-FST-014 | URL refresh, Back/Forward, new tab and legacy migration                 | U, UI, API, RP, VS, RES                                   | Shared lifecycle tests `26/26` plus Marketplace consumer Vitest `6/6` cover legacy flat-query readability, explicit history push and props rehydration; no current production consumer instantiates `FilterStateController`, so browser/Inertia wiring, canonical migration and RP/VS/RES remain                                                                                                                                                                                                            | WP-06/15/17/24/26E               |
| [~]    | TC-FST-015 | Mobile staged drawer Apply/Cancel with dirty draft                      | UI, RP, VS, AX, RES                                       | Marketplace now uses the shared staged drawer; focused Drawer/Marketplace/Alert component tests `15/15` and the full Chromium role-play file passes `3/3` (desktop empty state, mobile Cancel/Apply, mobile browser Back) with semantic AX assertions, stable drawer IDs, staged clear-last-filter behavior and screenshot artifact; full axe/runtime AX and resilience layers remain open                                                                                                  | WP-06/11/15/17/26E               |
| [~]    | TC-FST-016 | Saved private view create/edit/duplicate/default/delete                 | U, IT-SQL, API, UI, RP, VS, RES                           | Private authorization/CRUD plus Search Center save, pin, default and duplicate are covered; Chromium RP-FST-06 and focused UI tests pass, while the complete mutation/visual/resilience/browser matrix remains open                                                                                                                                                                                                                                                                    | WP-05/09/18/26E                  |
| [~]    | TC-FST-017 | Shared view opened after permission revoke                              | IT-SQL, API, UI, RP, VS, SEC, AUD                         | Saved-view security `6/6`, Search context/controller/HTTP contracts and clean-session Chromium revoke path pass without criteria leakage; screenshot, audit-join, cross-browser and full release layers remain open                                                                                                                                                                                                                                                                    | WP-04/09/18/26B/26E              |
| [~]    | TC-FST-018 | Taxonomy rename/merge migrates saved criteria                           | U, CT, IT-SQL, API, UI, RP, VS, AUD                       | Governed UI preview/apply shell, aggregate impact, explicit apply gating, and page authorization pass; real saved-criteria migration/browser/audit evidence remains                                                                                                                                                                                                                                                                                                                         | WP-02/05/23A1/23A2/23A3/26E      |
| [~]    | TC-FST-019 | Taxonomy split requires user repair and pauses alert                    | U, CT, IT-SQL, API, UI, RP, VS, RES, AUD                  | Split integration preserves criteria, pauses alert and checkpoints migration; admin UI 4/4 shows repair-required/consumer-coordination blocking; HTTP 10/10 proves alert resume is denied until explicit repair; isolated owner Chromium now covers save/subscribe/repair/revalidate/resume, while governed apply, RP/VS/RES/AUD joins remain                                                                                                                                                                                                                                                       | WP-18/22A/22B/23A1/23A2/23A3/26E |
| [~]    | TC-FST-020 | Saved-view alert detects one new authorized match                       | U, IT-SQL, API, UI, RES, SEC, AUD, RP, VS                 | Evaluator reauth/canonical-query/privacy, PostgreSQL revoke, alert→fanout→canonical-notification integration, and UI client/state/menu `14/14` pass; real-ES/provider/full UI/role-play journey remains                                                                                                                                                                                                                                                                                     | WP-22A/22B/23/26E                |
| [~]    | TC-FST-021 | Permission revokes between page load and execute/cursor/alert           | CT, IT-SQL, IT-ES, API, RP, VS, SEC, RES                  | PostgreSQL stale-principal read/execute/cursor/alert denial and no executor invocation pass; API/RP/VS/resilience layers remain                                                                                                                                                                                                                                                                                                                                                             | WP-04/13/17/18/22/26B/26E        |
| [~]    | TC-FST-022 | Foreign tenant probes secret unique value                               | CT, IT-SQL, IT-ES, API, RP, VS, SEC                       | Real ES hides foreign private value from hits/totals/facets/value search/suggestions/diagnostics; SQL/API/timing/RP/VS layers remain                                                                                                                                                                                                                                                                                                                                                        | WP-04/08/13/26B/26D/26E          |
| [~]    | TC-FST-023 | Elasticsearch unavailable/partial/stale during Search                   | IT-ES, API, UI, RP, VS, RES                               | Canonical HTTP outage test covers safe `503`, diagnostic code, no provider leakage, and automatic-retry gating (`6/6`); page controller `4/4`, Search Center `20/20`, and RP-FST-09 `5/5` add cursor-plus-unavailable fail-closed/retry evidence; partial/stale variants, VS and resilience remain                                                                                                                                                                                   | WP-13/16/17/26D/26E              |
| [~]    | TC-FST-024 | Cursor tampered, expired or crosses generation cutover                  | U, IT-ES, API, UI, RP, VS, RES, SEC                       | Cursor unit, real ES executor, orchestration and canonical HTTP tamper/expiry/stale diagnostics pass; Search page fail-closed controller `4/4`, Search Center fresh-retry UI `20/20`, shell URL batch `20/20` and RP-FST-09 `5/5` prove no legacy fallback and cursor-free recovery; VS/resilience/security and release joins remain                                                                                                                                                        | WP-13/16/23C/26D/26E             |
| [~]    | TC-FST-025 | Projection rebuild receives live update/delete                          | IT-SQL, IT-ES, API, UI, RP, VS, RES, AUD, PERF            | Transition invariants and admin boundary are covered; live replay/tombstone, HTTP/UI/RP layers remain                                                                                                                                                                                                                                                                                                                                                                                       | WP-23B1/23B2/23C/23C2/26D/26E    |
| [~]    | TC-FST-026 | Activation crash and rollback choreography                              | IT-SQL, IT-ES, API, UI, RP, VS, RES, SEC, AUD, SHD        | Lock-scoped activation demotes the prior active row, preview exposes lock version, reconcile adopts a ready alias generation, and opt-in alias/ledger fault-hook replay tests pass; authenticated inspect route and browser inspect/a11y pass, but process-boundary injection, rollback compatibility, authenticated mutation UI/RP, audit and SHD layers remain                                                                                                                            | WP-23C/23C2/27A/26D/26E          |
| [~]    | TC-FST-027 | Qualifier and visual builder round-trip                                 | U, PB, UI, RP, VS, AX                                     | AST model/component preserve tested structure; focused expression/model/qualifier evidence is `8/8`, including rehydration when canonical expression/preferences props change; qualifier/browser/AX/VS gates remain                                                                                                                                                                                                                                                                     | WP-19/20/26E                     |
| [~]    | TC-FST-028 | Zero-result recovery proposes reversible typed relaxation               | U, IT-ES, UI, RP, VS, SEC                                 | Backend typed proposals/apply pass; count-preview/permission/UI gates remain                                                                                                                                                                                                                                                                                                                                                                                                                | WP-21/17/26B/26E                 |
| [~]    | TC-FST-029 | Natural-language proposal is ambiguous/adversarial                      | U, CT, UI, RP, VS, AX, SEC                                | Unit `2/2` plus contract `1/1` cover editable uncertain preview, mandatory manual-builder fallback and `autoExecute: false`; UI/RP/VS/AX and end-to-end security/provider validation remain open                                                                                                                                                                                                                                                                                                                                                    | WP-25/26D/26E                    |
| [~]    | TC-FST-030 | Advanced relevance/rule/hybrid experiment shadow and fallback           | U, CT, IT-ES, API, UI, RP, VS, SEC, PERF, SHD, MAN        | Contract `3/3` plus SearchDiscovery integration `1/1` cover preview/shadow, explicit ranking version and fail-safe fallback on malformed candidates or eligibility/facet/authorization changes; production runner, real provider/API/UI/RP/VS/SEC/PERF/SHD and MAN remain open                                                                                                                                                                                                                                               | WP-28A/28B/28C/28D/28E/30A       |
| [~]    | TC-FST-031 | Personalization and organization policy explanation/opt-out/isolation   | U, CT, IT-SQL, IT-ES, API, UI, RP, VS, SEC, RES, SHD, MAN | Unit `7/7` plus contract `2/2` cover global fallback, consent/reset/opt-out, organization isolation and bounded explanations without organization-ID leakage; persistence/deletion, provider/API/UI/RP/VS/SEC/RES/SHD and MAN remain open                                                                                                                                                                                                                                                    | WP-29A/29B/29C/30B               |

## 5. Detailed behavior and exception matrix

### 5.1 Filter AST, values, and canonicalization

| Status | ID      | Variation / failure                                         | Expected result                                                          | Required layers | Owner        |
| ------ | ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ | --------------- | ------------ |
| [ ]    | AST-001 | Empty group / one-child stored group                        | Reject or canonicalize only per frozen contract; stable path diagnostic  | U, PB           | WP-01        |
| [ ]    | AST-002 | Nested AND/OR/NOT at max depth                              | Valid at limit; one level over rejected before provider call             | U, PB, CT       | WP-01/04     |
| [ ]    | AST-003 | Double negation and De Morgan candidate                     | Canonical result preserves relation/unknown semantics; no unsafe rewrite | U, PB           | WP-01        |
| [ ]    | AST-004 | `require`, `exclude`, `contains_none`, `not_in` equivalents | Equivalent forms share canonical hash and eligible set                   | U, PB, DIFF     | WP-01/08     |
| [ ]    | AST-005 | Duplicate/case-variant canonical values                     | Canonical dedupe without label/identity corruption                       | U, PB, CT       | WP-01/02     |
| [ ]    | AST-006 | Any on known-empty vs unknown set                           | Known-empty false; unknown follows explicit policy                       | U, PB, DIFF     | WP-01/08     |
| [ ]    | AST-007 | All with empty requested set                                | Frozen semantic result; never provider-dependent accident                | U, PB, DIFF     | WP-01/08     |
| [ ]    | AST-008 | None with unknown data                                      | Explicit unknown policy; not silently true                               | U, PB, DIFF     | WP-01/08     |
| [ ]    | AST-009 | Exactly-N / At-least-N, N=0/negative/>unique count          | Valid boundaries deterministic; invalid values rejected                  | U, PB, CT       | WP-01        |
| [ ]    | AST-010 | Numeric NaN/Infinity/string coercion                        | Reject typed value; no SQL/ES coercion drift                             | U, CT, DIFF     | WP-01/08     |
| [ ]    | AST-011 | Inverted/open date and number ranges                        | Contract-defined normalization or stable rejection                       | U, PB, UI       | WP-01/06     |
| [ ]    | AST-012 | Relative time across timezone/DST/leap day                  | Fixed-clock deterministic instant/range                                  | U, PB, IT-SQL   | WP-01/10     |
| [ ]    | AST-013 | Null used instead of explicit missing operator              | Reject with repair hint; never treat as value                            | U, CT, UI       | WP-01/06     |
| [ ]    | AST-014 | Preference weight below/above cap                           | Clamp/reject per context; cannot change eligibility                      | U, PB, DIFF     | WP-01/08/13  |
| [ ]    | AST-015 | Explicit sort disables relevance                            | Preference/hybrid reranker cannot override user sort                     | U, CT, IT-ES    | WP-01/13/28  |
| [ ]    | AST-016 | Canonicalization repeated/order shuffled                    | Idempotent canonical payload and stable SHA-256                          | U, PB           | WP-01        |
| [ ]    | AST-017 | Oversized text/set/condition/depth                          | Rejected at validation boundary with safe diagnostic/cost hint           | U, PB, API, SEC | WP-01/04/26D |
| [ ]    | AST-018 | Unknown or permission-hidden field/operator                 | Same safe response class; no field enumeration                           | U, API, SEC     | WP-04/14/26B |

### 5.2 Facets, taxonomy, and metadata completeness

| Status | ID      | Variation / failure                             | Expected result                                                                   | Required layers                 | Owner                       |
| ------ | ------- | ----------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------- | --------------------------- |
| [ ]    | FTM-001 | Facet count with active constraints             | Count uses complete authorized constrained population                             | CT, IT-SQL, IT-ES, DIFF         | WP-08/10/13                 |
| [ ]    | FTM-002 | Valid root-clause self-exclusion                | Only selected facet clause removed; others/permissions remain                     | U, CT, DIFF                     | WP-08/10/13                 |
| [ ]    | FTM-003 | Nested/negated/non-extractable self-exclusion   | Explicit unsupported diagnostic; no approximate fake                              | CT, IT-SQL, IT-ES, UI           | WP-08/10/11/13              |
| [ ]    | FTM-004 | Selected value absent from current bucket page  | Selected chip/value retained with zero/unknown count                              | IT-SQL, IT-ES, UI, RP, VS       | WP-10/11/13/26E             |
| [ ]    | FTM-005 | Exact/bounded/approximate/unknown total         | Relation preserved through API, UI and metrics                                    | CT, IT-SQL, IT-ES, UI           | WP-08/10/11/13              |
| [ ]    | FTM-006 | Missing bucket authorized vs sensitive          | Render only when policy permits; hidden population indistinguishable              | CT, IT-SQL, IT-ES, SEC          | WP-04/10/13/26B             |
| [ ]    | FTM-007 | High-cardinality 10k value search               | Bounded async paging, stable cursor, no duplicate/skip                            | IT-SQL, IT-ES, UI, PERF         | WP-10/11/13/26C             |
| [ ]    | FTM-008 | Facet request cancelled by upstream change      | Stale response ignored; selections not erased                                     | UI, RP, RES                     | WP-06/11/26E                |
| [ ]    | FTM-009 | Entity has 1/10/100 legitimate labels           | Every label preserved; payload/index limits measured                              | CT, IT-ES, PERF                 | WP-03/07/23B1/26C           |
| [ ]    | FTM-010 | Match only via last label                       | Hit and facet recall remain 100%                                                  | CT, IT-ES, DIFF                 | WP-03/13/26B                |
| [ ]    | FTM-011 | Scalar wrapped as array                         | Coverage `legacy_single_value`; UI does not imply complete taxonomy               | CT, IT-ES, UI, VS               | WP-03/12/24B/26E            |
| [ ]    | FTM-012 | Free-form exact tag case/Unicode variant        | Exact normalized comparison; display label retained; no fake canonical ID         | U, CT, IT-ES                    | WP-02/03/07                 |
| [ ]    | FTM-013 | Multi-parent taxonomy expansion                 | All approved paths preserved; no duplicate entity count                           | U, CT, IT-SQL, IT-ES            | WP-02/07/13                 |
| [ ]    | FTM-014 | Taxonomy graph cycle/orphan parent              | Mutation blocked before publish; current version remains active                   | U, IT-SQL, AUD                  | WP-02/23A1                  |
| [ ]    | FTM-015 | Rename / reviewed alias                         | Canonical ID/hash unchanged; localized label updates                              | U, CT, IT-SQL, API, UI          | WP-02/23A1/23A2/23A3        |
| [ ]    | FTM-016 | Merge two terms                                 | Deterministic replacement and idempotent criteria migration                       | U, IT-SQL, API, UI, AUD         | WP-23A1/23A2/23A3           |
| [ ]    | FTM-017 | Split one term into multiple replacements       | `requires_repair`; obsolete ref visible; alert paused                             | U, IT-SQL, API, UI, RP, VS, AUD | WP-18/22A/22B/23A2/23A3/26E |
| [ ]    | FTM-018 | Inactive/retired term selected                  | Resolve for history/repair; omit from new options unless policy says otherwise    | CT, IT-SQL, UI                  | WP-02/07/11/18              |
| [ ]    | FTM-019 | Provider unavailable/version stale              | Explicit unresolved/stale/degraded; no silent label drop                          | CT, API, UI, RES                | WP-02/04/11/23              |
| [ ]    | FTM-020 | Private/public work history transition          | Old strict facet removed/tombstoned; no stale private evidence                    | IT-SQL, IT-ES, SEC, RES         | WP-23B2/24C/26B             |
| [ ]    | FTM-021 | Re-parent term across one/multiple parent paths | Preview exact descendant/criteria impact; preserve canonical ID or require repair | U, CT, IT-SQL, API, UI, AUD     | WP-02/23A1/23A3             |
| [ ]    | FTM-022 | Remove an alias still used by URL/saved view    | Compatibility/repair policy explicit; no silent value loss or broader fallback    | U, CT, IT-SQL, API, UI, RES     | WP-02/05/18/23A1/23A2/23A3  |
| [ ]    | FTM-023 | New alias collides after locale normalization   | Mutation blocked with safe conflict; active catalog/version unchanged             | U, PB, IT-SQL, API, UI, AUD     | WP-02/23A1/23A3             |
| [ ]    | FTM-024 | Concurrent catalog mutation while plan applies  | Expected-state fence rejects stale apply; retry preview sees new impact           | IT-SQL, API, UI, RES, AUD       | WP-23A1/23A3/26D            |
| [ ]    | FTM-025 | Locale label missing or fallback changes        | Canonical identity/hash stable; declared locale fallback shown, not raw ID        | U, CT, API, UI, VS              | WP-02/07/11/23A3/26E        |
| [ ]    | FTM-026 | Numeric/date histogram boundary and timezone    | Inclusive/exclusive edges, empty buckets and DST use frozen context policy        | U, PB, IT-SQL, IT-ES, UI        | WP-01/08/10/13/26B          |
| [ ]    | FTM-027 | Multi-valued document contributes facet buckets | One entity counted once per bucket; entity total never multiplied                 | U, CT, IT-SQL, IT-ES, DIFF      | WP-08/10/13/26B             |
| [ ]    | FTM-028 | Nested same-object skill/proficiency facet      | Count requires same nested evidence object; cross-object combinations forbidden   | CT, IT-ES, DIFF, SEC            | WP-07/13/24C/26B            |
| [ ]    | FTM-029 | Facet catalog mutates between cursor pages      | Versioned cursor rejects/restarts explicitly; no duplicate/skip or selection loss | IT-SQL, IT-ES, API, UI, RES     | WP-10/11/13/23A1/26D        |

### 5.3 Execution, permissions, totals, and pagination

| Status | ID      | Variation / failure                                     | Expected result                                                                               | Required layers                          | Owner                  |
| ------ | ------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------- |
| [ ]    | EXE-001 | Filter-only SQL context                                 | Complete authorized result without retrieval text                                             | CT, IT-SQL, API                          | WP-04/10/14            |
| [~]    | EXE-002 | Filter-only indexed context                             | `match_all` only when context permits; filters/facets authoritative                           | CT, IT-ES, API                           | WP-12/13/16            |
| [~]    | EXE-003 | Keyword-only Search                                     | Existing lexical semantics and compatibility response remain                                  | U, IT-ES, API, RP                        | WP-16/17/26E           |
| [~]    | EXE-004 | Text + strict + preference                              | Strict clauses in eligibility; preferences only bounded ranking                               | U, CT, IT-ES, DIFF                       | WP-01/13/16            |
| [~]    | EXE-005 | Mandatory permission plus user negation                 | User cannot negate/override server constraint                                                 | U, CT, IT-SQL, IT-ES, SEC                | WP-04/08/10/13         |
| [~]    | EXE-006 | Visible 3 of 10 entities                                | Hits/total/facets all equal permission-visible three                                          | IT-SQL, IT-ES, DIFF, SEC                 | WP-08/10/13/26B        |
| [ ]    | EXE-007 | Same result count, different hidden population          | No bucket/error/timing distinction reveals hidden data                                        | IT-SQL, IT-ES, SEC, PERF                 | WP-26B/26C/26D         |
| [~]    | EXE-008 | Stable sort tie                                         | ID tie-break prevents duplicate/skip across pages                                             | U, IT-SQL, IT-ES                         | WP-08/10/13            |
| [~]    | EXE-009 | Cursor tampered / wrong principal/context/hash          | Fail closed with stable diagnostic                                                            | U, API, IT-SQL, IT-ES, SEC               | WP-10/13/14            |
| [~]    | EXE-010 | Cursor expired / PIT expired                            | Explicit stale cursor; never auto-restart                                                     | IT-ES, API, UI, RES                      | WP-13/16/17            |
| [~]    | EXE-011 | Alias generation changes between pages                  | Cursor generation mismatch handled explicitly                                                 | IT-ES, API, RES                          | WP-13/23C              |
| [ ]    | EXE-012 | Offset and cursor both supplied                         | Request rejected before execution                                                             | U, API                                   | WP-04/14               |
| [~]    | EXE-013 | Provider timeout before hits                            | Explicit timeout/degraded; no fabricated empty truth                                          | IT-SQL, IT-ES, API, UI, RES              | WP-10/13/14/17         |
| [~]    | EXE-014 | Hits succeed, facets timeout                            | Partial response marks facet failure separately                                               | IT-ES, API, UI, RES                      | WP-13/16/17            |
| [~]    | EXE-015 | Partial shard / mapping missing bound field             | No clause drop; activation/query diagnostic blocks unsafe result                              | IT-ES, RES, AUD                          | WP-13/23C/26D          |
| [~]    | EXE-016 | Blended source does not support common facet            | Per-source/partial diagnostic; no candidate-window global count                               | CT, IT-ES, API, UI                       | WP-16/17               |
| [~]    | EXE-017 | Request abort and late provider response                | Provider cancelled when possible; late state ignored                                          | IT-SQL, IT-ES, UI, RES                   | WP-04/06/10/13         |
| [~]    | EXE-018 | SQL injection / raw ES DSL attempt                      | Typed validation rejects; provider DSL never accepted                                         | U, API, SEC                              | WP-04/10/13/14/26D     |
| [~]    | EXE-019 | Permission revoked while provider response is in flight | Late authorized-under-old-state response is discarded and current policy re-runs/fails closed | CT, IT-SQL, IT-ES, API, UI, RP, SEC, RES | WP-04/10/13/17/26B/26E |

### 5.4 Frontend state, URL, saved views, and accessibility

| Status | ID     | Variation / failure                                                | Expected result                                                                                 | Required layers                             | Owner                      |
| ------ | ------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------- |
| [ ]    | UX-001 | Instant context change                                             | One committed criteria update; URL/result synchronized                                          | UI, RP                                      | WP-06/11/17                |
| [ ]    | UX-002 | Debounced text/facet search                                        | Latest response wins; IME composition not prematurely committed                                 | UI, RP, AX, RES                             | WP-06/11/17                |
| [ ]    | UX-003 | Staged Apply/Cancel                                                | Draft isolated; Cancel restores; Apply commits once                                             | UI, RP, VS                                  | WP-06/11/15/26E            |
| [ ]    | UX-004 | Double Apply / rapid filter edits                                  | Duplicate suppressed/aborted; no stale result restoration                                       | UI, RP, RES                                 | WP-06/15/17                |
| [ ]    | UX-005 | Clear eligibility                                                  | Keeps sort/view/deep-link state; resets pagination only                                         | U, UI, RP                                   | WP-06/15/17                |
| [ ]    | UX-006 | View/sort change only                                              | Does not create eligibility chip or clear criteria unexpectedly                                 | U, UI, RP, VS                               | WP-06/24B/26E              |
| [ ]    | UX-007 | Refresh / new tab                                                  | Canonical criteria and presentation restored                                                    | U, UI, RP                                   | WP-06/15/17                |
| [ ]    | UX-008 | Back/Forward with dirty mobile drawer                              | Safe discard/prompt policy; committed URL rehydrates                                            | UI, RP, VS, RES                             | WP-06/11/26E               |
| [ ]    | UX-009 | Malformed/unknown-version URL                                      | Safe diagnostic/repair; no silent broadening                                                    | U, UI, API, SEC                             | WP-06/14                   |
| [ ]    | UX-010 | Oversized URL                                                      | Offer saved view; never truncate AST                                                            | U, UI, RP                                   | WP-06/18                   |
| [ ]    | UX-011 | Legacy flat URL contains unsupported field                         | Compatible fields migrate; unsupported condition visible                                        | U, UI, API, RP                              | WP-06/15/17/24             |
| [ ]    | UX-012 | Context/scope change invalidates field                             | Repair diagnostic anchored to clause; remaining criteria not silently altered                   | U, UI, RP                                   | WP-06/17/18                |
| [ ]    | UX-013 | Response canonicalizes/migrates criteria                           | Server canonical state replaces committed state without losing draft intent                     | U, UI, RES                                  | WP-05/06/18                |
| [ ]    | UX-014 | Save view in two tabs                                              | Optimistic conflict; no silent last-write-wins                                                  | U, IT-SQL, UI, RP, RES                      | WP-05/09/18                |
| [ ]    | UX-015 | Duplicate Unicode-normalized view name                             | Stable conflict/rename behavior                                                                 | U, IT-SQL, UI                               | WP-05/09/18                |
| [ ]    | UX-016 | Shared view read-only / owner leaves org                           | Permissions and recovery state explicit                                                         | IT-SQL, API, UI, SEC                        | WP-09/18                   |
| [ ]    | UX-017 | Offline save/retry response lost                                   | Idempotency avoids duplicate; local draft retained                                              | IT-SQL, UI, RP, RES                         | WP-09/18                   |
| [ ]    | UX-018 | Keyboard through chips/combobox/builder                            | Logical focus, remove labels, Escape, no drag-only actions                                      | UI, RP, AX                                  | WP-11/19/26E               |
| [ ]    | UX-019 | 200%/400% zoom, 320/390px, long label/RTL                          | No blocked controls/overflow; hierarchy remains understandable                                  | UI, RP, VS, AX                              | WP-11/26E                  |
| [ ]    | UX-020 | Loading/degraded/partial/zero/error                                | Distinct understandable states; live region not noisy                                           | UI, RP, VS, AX                              | WP-11/17/21/26E            |
| [ ]    | UX-021 | Sensitive criteria in URL/history/referrer/analytics/access log    | URL policy uses opaque/safe representation or redaction; no third-party/referrer/log disclosure | U, API, UI, RP, SEC, AUD                    | WP-06/14/17/18/26A/26D/26E |
| [ ]    | UX-022 | Ranking/model/experiment/consent/org version changes between pages | Cursor is rejected or pinned per contract; no mixed-policy page sequence                        | U, CT, IT-SQL, IT-ES, API, UI, RP, RES, SEC | WP-13/16/28/29/26D/26E     |

### 5.5 Security, privacy, fairness, and no-leakage

| Status | ID      | Variation / failure                                     | Expected result                                                                                                                                                      | Required layers              | Owner           |
| ------ | ------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------- |
| [~]    | SEC-001 | Foreign org requests known private entity ID            | Saved-view known-ID access is denied without ID/criteria disclosure; HTTP/API and broader entity-provider evidence remain                                            | API, IT-SQL, IT-ES, SEC      | WP-04/14/26B    |
| [~]    | SEC-002 | Secret value unique to hidden entity                    | Real ES executor evidence covers hits, totals, facets, value search, suggestions and diagnostics; SQL/API/threshold/timing evidence remains                          | CT, IT-SQL, IT-ES, SEC       | WP-26B          |
| [ ]    | SEC-003 | Hidden field name guessed                               | Same safe unknown response as invalid field                                                                                                                          | API, SEC                     | WP-04/14/26B    |
| [~]    | SEC-004 | Permission revoked after saved URL/view loaded          | Backend saved-view read re-authorizes current organization membership and fails closed without returning the hidden criterion; UI/stale-chip/RP proof remains        | IT-SQL, API, UI, RP, SEC     | WP-04/09/18/26E |
| [~]    | SEC-005 | Permission revoked between alert runs                   | Evaluator reauthorization stops query execution after grant revoke; safe fanout delivery is integration-covered, but watermark/audit and full role-play proof remain | IT-SQL, IT-ES, RES, SEC, AUD | WP-22/26B       |
| [ ]    | SEC-006 | Private work history becomes private after index        | Tombstone removes hit/facet/explanation within test SLA                                                                                                              | IT-SQL, IT-ES, RES, SEC      | WP-23B2/24C/26B |
| [ ]    | SEC-007 | Suggestion threshold under small cohort                 | Suppress value/popular query; no low-count leak                                                                                                                      | U, IT-ES, SEC                | WP-21/26B       |
| [ ]    | SEC-008 | Diagnostic contains raw query/value/cursor/DSL          | Redacted event/error; stable safe code                                                                                                                               | U, API, SEC, AUD             | WP-14/26A/26D   |
| [ ]    | SEC-009 | Timing comparison hidden population                     | No deterministic content leak; trend reviewed under bounded budget                                                                                                   | IT-SQL, IT-ES, PERF, SEC     | WP-26B/26C/26D  |
| [ ]    | SEC-010 | Oversized/pathological AST DoS                          | Early bounded rejection/rate limit; no provider overload                                                                                                             | U, API, PERF, SEC            | WP-01/04/26D    |
| [ ]    | SEC-011 | Prompt injection in query/taxonomy label/example        | Treated as data; no tool/URL/code/raw DSL; proposal rejected                                                                                                         | U, CT, UI, SEC               | WP-25/26D       |
| [ ]    | SEC-012 | Hallucinated protected trait                            | Deterministic post-validation rejects and does not reveal field                                                                                                      | U, CT, UI, SEC               | WP-25/26D       |
| [ ]    | SEC-013 | Personalization opt-out/reset                           | Global fallback; retained events deleted/ignored per policy                                                                                                          | IT-SQL, UI, RP, SEC, AUD     | WP-29A/29C/26E  |
| [ ]    | SEC-014 | Cross-org vocabulary/ranking cache                      | Tenant/version key prevents alias/policy leak                                                                                                                        | U, IT-SQL, IT-ES, SEC        | WP-29B/29C      |
| [ ]    | SEC-015 | Proxy/fairness feature proposed                         | Activation blocked until review; fairness slice evidence required                                                                                                    | U, SHD, MAN, SEC             | WP-24C/28/29    |
| [ ]    | SEC-016 | Screenshot/artifact captures secret/token/private value | Capture rejected/redacted; manifest classification review fails                                                                                                      | RP, VS, SEC, MAN             | WP-26E          |

### 5.6 Projection, migration, alerts, resilience, and operations

| Status | ID      | Variation / failure                                    | Expected result                                                                                                                                                                                                                                                                 | Required layers                          | Owner               |
| ------ | ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------- |
| [~]    | OPS-001 | Source transaction rolls back                          | Stager plus create/update/delete producer rollback evidence pass; required-skill-specific rollback remains                                                                                                                                                                      | IT-SQL, RES                              | WP-23B1/23B2        |
| [~]    | OPS-002 | Duplicate/out-of-order invalidation                    | Same-revision dedupe/newer-row persistence pass; required-skill mutations get unique fallback revisions; replay newest-wins evidence remains                                                                                                                                    | IT-SQL, IT-ES, RES                       | WP-23B1/23B2        |
| [ ]    | OPS-003 | Update during snapshot                                 | Candidate catches update before activation                                                                                                                                                                                                                                      | IT-SQL, IT-ES, RES, AUD                  | WP-23B1/23B2        |
| [ ]    | OPS-004 | Delete during rebuild                                  | Versioned tombstone prevents resurrection                                                                                                                                                                                                                                       | IT-SQL, IT-ES, RES                       | WP-23B1/23B2        |
| [ ]    | OPS-005 | Worker crash after ES write before checkpoint          | Resume/replay converges without duplicate/loss                                                                                                                                                                                                                                  | IT-SQL, IT-ES, RES                       | WP-23B1             |
| [ ]    | OPS-006 | Outbox retention overtakes checkpoint                  | Retention fence blocks deletion/activation                                                                                                                                                                                                                                      | IT-SQL, RES, AUD                         | WP-23B1             |
| [~]    | OPS-007 | Candidate count matches but metadata incomplete        | Metadata contract rejects incomplete lineage and public coverage is privacy-safe; full ES completeness gate remains                                                                                                                                                             | U, IT-SQL, IT-ES, AUD                    | WP-23B1/23C         |
| [ ]    | OPS-008 | Crash after alias swap before DB state                 | Reconcile from routing authority to one active generation                                                                                                                                                                                                                       | IT-SQL, IT-ES, API, UI, RP, VS, RES, AUD | WP-23C/23C2/26E     |
| [ ]    | OPS-009 | Rollback target schema/taxonomy incompatible           | Preview blocks; forward repair, no destructive downgrade                                                                                                                                                                                                                        | U, IT-SQL, IT-ES, API, UI, RP, VS, AUD   | WP-23C/23C2/26E/27B |
| [ ]    | OPS-010 | Saved criteria migrated while old app runs             | Compatibility reader preserves/blocks explicitly                                                                                                                                                                                                                                | CT, IT-SQL, RES                          | WP-05/23A2/27A/27B  |
| [~]    | OPS-011 | Taxonomy migration partial batch/crash                 | Consumer checkpoint is transactionally atomic and stale-CAS rollback passes; crash/resume and version-publish-once evidence remain                                                                                                                                              | IT-SQL, RES, AUD                         | WP-23A1/23A2        |
| [~]    | OPS-012 | Two alert workers overlap                              | Repository/worker fencing passes; concurrent DB stress evidence remains                                                                                                                                                                                                         | IT-SQL, RES                              | WP-22               |
| [~]    | OPS-013 | Alert send succeeds, ack fails                         | Durable-completion ordering plus real PostgreSQL alert→fanout→notification integration pass; crash-after-stage/ack-failure and audit evidence remain                                                                                                                            | IT-SQL, RES, AUD                         | WP-22               |
| [~]    | OPS-014 | Provider degraded during alert                         | Worker pauses/retries without delivery; notification fanout adapter is integration-covered, real search-provider degradation remains                                                                                                                                            | IT-SQL, IT-ES, RES, SEC                  | WP-22               |
| [~]    | OPS-015 | Timezone/DST/clock moves backward                      | Absolute interval cadence remains deterministic across Europe/Berlin DST transitions, and a backward PostgreSQL clock does not re-claim a completed alert; calendar-time scheduling, exhaustive clock injection/stress, and missed-window evidence remain                       | U, IT-SQL, RES                           | WP-22               |
| [~]    | TAX-001 | Taxonomy governance API overflow and authorization     | Millisecond source revision fits durable migration versions; term-matched saved-view impact, unsafe no-op/client-invented consumer rejection, system-admin preview/status/page auth and stale-version fencing pass 5/5; non-admin/guest requests are denied without diagnostics | IT-SQL, API, SEC, AUD                    | WP-23A3             |
| [~]    | OPS-016 | Migration checksum/timestamp collision                 | Ledger verification runs, but the current worktree still fails on a missing legacy migration, untracked checksums, and required release-owner schema approval; clean/upgrade closure remains open                                                                               | IT-SQL, AUD                              | WP-27A/28E/29C      |
| [ ]    | OPS-017 | Feature flags partially inconsistent                   | Startup/runtime validation refuses unsafe half-pipeline                                                                                                                                                                                                                         | U, API, RES                              | WP-14/27A/28E/29C   |
| [ ]    | OPS-018 | Shadow doubles provider load                           | Capacity/abort controls and rollback threshold protect system                                                                                                                                                                                                                   | PERF, RES, SHD                           | WP-26C/27B          |
| [ ]    | OPS-019 | Saved view deleted while alert evaluation runs         | Fence/current revision prevents delivery and success-watermark advance                                                                                                                                                                                                          | IT-SQL, IT-ES, RES, SEC, AUD             | WP-22A/22B/26D      |
| [ ]    | OPS-020 | Bulk SQL or alternate write path bypasses invalidation | Activation inventory/gap detector blocks candidate; owner fixes producer                                                                                                                                                                                                        | IT-SQL, IT-ES, RES, AUD                  | WP-23B1/23B2/26D    |
| [ ]    | OPS-021 | Producer and consumer deploy in either order           | Compatible envelope/feature gate buffers safely; no lost or unreadable event                                                                                                                                                                                                    | CT, IT-SQL, IT-ES, RES                   | WP-23B1/23B2/27A    |
| [ ]    | OPS-022 | Poison event repeatedly fails and enters DLQ           | Bounded retry, quarantined evidence, checkpoint safety and replay after repair                                                                                                                                                                                                  | IT-SQL, IT-ES, RES, AUD                  | WP-23B1/26D/27B     |
| [ ]    | OPS-023 | Import/backfill mutates indexed fields                 | Dedicated revisioned invalidation or mandatory rebuild inventory prevents gap                                                                                                                                                                                                   | CT, IT-SQL, IT-ES, RES, AUD              | WP-23B1/23B2/26D    |

### 5.7 Query assistance, advanced relevance, and adaptive behavior

| Status | ID      | Variation / failure                                  | Expected result                                                                      | Required layers                             | Owner               |
| ------ | ------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- | ------------------- |
| [ ]    | ADV-001 | Unknown/unauthorized qualifier                       | Precise diagnostic/residual text; no broadening                                      | U, PB, UI, SEC                              | WP-20/26D           |
| [ ]    | ADV-002 | Colon/quote/parenthesis/negative number ambiguity    | Deterministic lexer range and reversible serialization                               | U, PB                                       | WP-20               |
| [ ]    | ADV-003 | Visual AST not representable in qualifier syntax     | Advanced chips/tree preserved; no lossy flatten                                      | U, UI, RP, VS                               | WP-19/20/26E        |
| [ ]    | ADV-004 | Exact identifier typo                                | Never silently corrected; explicit suggestion only                                   | U, IT-ES, UI                                | WP-21               |
| [ ]    | ADV-005 | Relax All→Any / remove exclusion / broaden parent    | Typed patch preview gives count effect and undo                                      | U, IT-ES, UI, RP, VS                        | WP-21/26E           |
| [ ]    | ADV-006 | Provider partial creates apparent zero results       | Recovery marks source partial; avoids false diagnosis                                | IT-ES, UI, RES                              | WP-21/26D           |
| [ ]    | ADV-007 | NL request valid/partial/ambiguous                   | Candidate AST + uncertainty; user must approve                                       | U, CT, UI, RP, VS                           | WP-25/26E           |
| [ ]    | ADV-008 | NL provider timeout/quota/malformed output           | Manual builder remains complete; no auto retry loop                                  | CT, UI, RES                                 | WP-25               |
| [ ]    | ADV-009 | Structured rank feature missing                      | Neutral/frozen default; no accidental boost                                          | U, IT-ES                                    | WP-28A              |
| [ ]    | ADV-010 | Diversity cap with relevance tie                     | Bounded diversity; stable cursor; exact match preserved                              | U, IT-ES, PERF                              | WP-28A              |
| [ ]    | ADV-011 | Semantic embedding missing/version mismatch          | Lexical fallback with degraded metadata                                              | CT, IT-ES, RES                              | WP-28B              |
| [ ]    | ADV-012 | Reranker timeout/invalid ID                          | Pre-rerank order retained; eligibility unchanged                                     | CT, IT-ES, RES, SEC                         | WP-28B              |
| [ ]    | ADV-013 | Rule conflict/expiry/target becomes private          | Preview/apply blocks or disables deterministically                                   | U, IT-SQL, IT-ES, AUD                       | WP-28C/28E          |
| [ ]    | ADV-014 | Experiment missing exposure / late conversion        | Conversion excluded or attributed by frozen window                                   | U, IT-SQL, AUD                              | WP-28D/28E          |
| [ ]    | ADV-015 | Sample ratio mismatch/underpowered test              | Stop/keep offline; no favorable early conclusion                                     | U, PERF, SHD, MAN                           | WP-28D              |
| [ ]    | ADV-016 | Cold-start/sparse behavior                           | Global non-personalized ranking                                                      | U, IT-ES, SEC                               | WP-29A              |
| [ ]    | ADV-017 | Opt-out/reset races with event ingestion             | Reset wins; later events follow current consent                                      | IT-SQL, RES, SEC, AUD                       | WP-29A/29C          |
| [ ]    | ADV-018 | User switches organization/multi-org session         | Explicit current context; cache/policy isolation                                     | IT-SQL, IT-ES, UI, RP, SEC                  | WP-29B/29C/26E      |
| [ ]    | ADV-019 | Cursor crosses rank/model/experiment/consent version | Pin or reject explicitly; never mix result ordering, policy or exposure across pages | U, CT, IT-SQL, IT-ES, API, UI, RP, SEC, RES | WP-13/28/29/26D/26E |

## 6. Mandatory role-play E2E journeys

Mỗi journey chạy trên application thật với PostgreSQL thật và provider thật của test plane. Với
Elasticsearch, test dùng isolated index prefix chứa `test`; với assisted-authoring/external model,
deterministic fake provider chứng minh flow và một governed real-provider smoke suite chứng minh
configuration, nhưng không thay thế nhau.

### RP-FST-01 — Anonymous filter-only Marketplace discovery

- [~] **RP-FST-01 overall status** — bounded Chromium journey now proves public route access,
  real UI keyword application, server-authoritative empty state, no 5xx text, and a screenshot;
  seeded multi-label/facet/permission/mobile/side-effect evidence remains open.

- [ ] Seed actors/taxonomy plus at least 15 public tasks through approved prerequisites; include one
      task whose match exists only in its second skill/tag, one known-empty, one unknown, one private
      and one closed task. Do not seed the browser's final criteria/result state.
- [x] Open Marketplace as `ACT-ANON` with a real public route and assert the context permits browsing.
- [x] Apply one keyword through the real UI and assert the canonical URL plus server empty state;
      evidence: `inertia/apps/user/tests/e2e/filter_search_taxonomy/marketplace_filter_only_roleplay.spec.ts`.
- [ ] Assert route, actor/public state, authoritative total and initial facet groups, then capture
      `01-anon-marketplace-filter-only-initial.png`.
- [ ] Select a secondary skill, technology tag, difficulty range and Any/All mode through UI.
- [ ] Assert the off-page secondary-label task appears, private/closed tasks do not, totals/facets
      match the seeded authorized population, then capture
      `02-anon-marketplace-multilabel-results.png`.
- [ ] Select a value whose constrained count becomes zero; assert chip/value remains visible and
      capture `03-anon-marketplace-selected-zero.png`.
- [ ] In the Marketplace advanced filter UI, exercise Any, All, None, Exactly-2 and At-least-2 over
      the same multi-label fixture. Assert every eligible ID set against backend evidence, including
      empty/over-N boundaries, and capture `04-anon-marketplace-set-operators.png` with the active
      Exactly/At-least-N affordance and readable summary.
- [ ] Select known-empty and unknown metadata policies separately, then probe a permission-hidden
      field/value. Assert known-empty, unknown and hidden do not collapse into one false/zero state;
      the hidden probe remains indistinguishable from invalid input. Capture
      `05-anon-marketplace-empty-unknown-hidden-policy.png` without the hidden canary.
- [ ] Select a supported root facet clause and assert its self-excluding bucket counts preserve all
      other clauses and mandatory permissions; capture `06-anon-marketplace-self-excluding-facet.png`.
- [ ] Refresh, open a new tab, Back and Forward; assert criteria/sort/view/cursor semantics remain.
- [ ] Repeat primary filter/apply/clear flow at 390×844 with keyboard/touch; capture
      `07-anon-marketplace-mobile-drawer.png`.
- [ ] Assert browser errors, unexpected 5xx and hidden value occurrences in page/network are zero.
- [ ] Write backend evidence for authorized eligible IDs, exact totals/facet buckets, canonical
      criteria hash and Elasticsearch generation; compare it to the visible result/facet assertions.

### RP-FST-02 — Authenticated Search: keyword, filters, preferences, and recovery

- [~] **RP-FST-02 overall status** — bounded q-only real route now renders a server-mediated
  Discovery presentation card and the Chromium role-play asserts the discovery-mode DOM marker and
  screenshot; authenticated strict-filter/preference/recovery, cursor, degraded fallback, AX and
  broader visual evidence remain.

- [ ] Login as `ACT-USER`; open a context whose contract denies empty text + empty filter. Submit the
      untouched UI, assert the stable guidance/diagnostic and zero provider execution, then capture
      `00-user-search-empty-query-denied.png`. RP-FST-01 supplies the corresponding allow-browse branch.
- [x] Login as `ACT-USER`; enter a q-only lexical query and assert the real Search Center result,
      canonical `q` URL without synthetic `type`/`field` filters, no 5xx, and screenshot
      `test-results/e2e-visual/filter-search-taxonomy/rp-fst-02/chromium/desktop/search-center-keyword-only.png`;
      evidence: `inertia/apps/user/tests/e2e/filter_search_taxonomy/search_center_keyword_only_roleplay.spec.ts`;
      the same role-play asserts at least one `[data-search-result-mode="discovery"]` card.
- [ ] Login as `ACT-USER`; enter a Vietnamese lexical query and assert q-only results/recent history.
- [ ] Capture `01-user-search-keyword-only.png` after submitted/normalized query and source health
      assertions.
- [ ] Add strict task scope, required-skill All, date range and one preference; assert eligibility
      chips are separated from preference/ranking explanation.
- [ ] Capture `02-user-search-text-filter-preference.png` after true total/facet assertions.
- [ ] Force a deterministic zero intersection through UI; assert typed recovery proposals and no
      automatic criteria change.
- [ ] Preview/apply a reversible All→Any or remove-exclusion patch, assert result-count delta, then
      capture `03-user-search-recovery-preview-applied.png`.
- [ ] Undo, verify original canonical criteria/hash and URL restoration.
- [ ] Navigate with cursor, refresh and Back; assert stable result identity/no duplicate/skip.
- [ ] Write backend evidence for canonical criteria/hash, permission context, ranking/projection
      versions and applied recovery patch; prove preferences never entered strict eligibility.

### RP-FST-03 — Recruiter Talent discovery with verified public evidence

- [~] **RP-FST-03 overall status** — bounded Chromium evidence now covers the existing multi-skill
      journey plus a persisted same-object proficiency/privacy/cursor journey; visual, complete
      private/disputed leakage, cross-session isolation and release joins remain open.

- [~] Seed `ACT-TALENT` with reviewed public records, a proficiency decoy, a non-searchable privacy
      decoy and a same-object candidate set. A disputed/suggested fixture remains outstanding.
- [~] Login as `ACT-RECRUITER`; the browser suite selects two skills in the multi-skill journey and
      selects skill plus minimum proficiency in the persisted privacy/cursor journey; availability
      is covered by the round-trip case but not yet in one combined release journey.
- [x] The persisted browser case proves the same-object proficiency result, excludes the
      cross-match/proficiency decoy and excludes the privacy decoy from the response and page-2
      cursor traversal.
- [ ] Capture `01-recruiter-talent-multiskill-results.png` with filter summary, counts and result reason.
- [ ] Open candidate preview/profile without losing scroll/criteria; capture
      `02-recruiter-talent-public-evidence-explanation.png`.
- [ ] Search/filter exact private/disputed values and assert no hit, facet, suggestion, count, snippet,
      explanation, page prop or network response leaks them.
- [ ] Capture only the safe zero-result state as
      `03-recruiter-talent-private-term-zero-leakage.png`.
- [ ] Switch organization/session and verify prior org vocabulary/view/policy does not follow.
- [ ] Write backend evidence for the public evidence IDs used by the nested match, the authorized
      candidate set and absence of private/disputed IDs from hits/facets/suggestions/explanations.

Coordinator audit update — 2026-08-09: the full Talent role-play file passes `5/5` on Chromium.
The new case uses `seedTalentDiscoveryRoleplay`, the visible Talent filters, the real Inertia
response and native cursor navigation; it asserts two strong IDs, two excluded IDs, total `2`,
and absence of the decoys. Supporting targeted suites pass backend facet parsing `5/5`, UI/admin
tests `20/20`, and scoped ESLint. This advances RP-FST-03/TC-FST-012 to bounded `[~]` evidence;
it does not promote the P0 row to `[x]`.

### RP-FST-04 — Admin audit SQL investigation

- [ ] **RP-FST-04 overall status**

- [ ] Login as `ACT-SYSADMIN`; seed more events than one page with deterministic actors/actions/dates
      and one sensitive event outside another persona's permission.
- [ ] Open audit console, assert initial server total and selected-event deep-link behavior.
- [ ] Enter staged actor/action/resource/date criteria; assert URL/results do not change before Apply.
- [ ] Capture `01-admin-audit-staged-draft.png`.
- [ ] Apply; assert an off-page event is found through SQL authority, cursor resets and investigation
      detail state is preserved; capture `02-admin-audit-applied-results.png`.
- [ ] Cancel a second draft, clear filters without clearing selected-event/view state, then exercise
      refresh/Back/Forward.
- [ ] Run the same core flow at mobile viewport; assert focus trap/restore and capture
      `03-admin-audit-mobile-staged-filter.png`.
- [ ] Inspect network response and authorization audit; no client filtering over partial page may be
      used as evidence.

### RP-FST-05 — Mobile dirty draft, cancellation, and degraded network

- [ ] **RP-FST-05 overall status**

- [ ] Login as `ACT-USER`; open Search/Marketplace at 390×844 and create committed criteria.
- [ ] Open drawer, create a different dirty draft, then navigate Back; assert documented discard/prompt
      policy and rehydration from committed URL.
- [ ] Capture `01-user-mobile-dirty-draft-back.png` after focus and state assertions.
- [ ] Reopen, Apply under slow network, click Apply twice and change a facet before old response;
      assert one current commit and stale-response suppression.
- [ ] Simulate offline before a new Apply; assert draft remains, committed results remain inspectable
      and retry does not duplicate.
- [ ] Capture `02-user-mobile-offline-recoverable-draft.png` and, after recovery,
      `03-user-mobile-latest-response-wins.png`.
- [ ] Complete keyboard-only chip removal, combobox selection, clear and drawer close; assert live
      region announcements are bounded and meaningful.
- [ ] Write backend/network evidence mapping request IDs to criteria hashes and completion order;
      prove the stale response did not become committed URL/result state and double Apply caused one
      effective execution.

### RP-FST-06 — Saved view create, share, conflict, and permission revocation

- [~] **RP-FST-06 overall status** — bounded implementation and Chromium evidence exists; the
      complete screenshot, audit-join, cross-browser and release-manifest bundle is still open.

- [ ] Login as `ACT-RECRUITER`; build a complex Talent view through UI, save, rename, pin/default and
      duplicate it without seeding saved-view rows directly.
- [ ] Assert criteria/presentation separation and capture `01-recruiter-saved-view-created.png`.
- [ ] Share read-only with another org member; login in a clean session as that member and open it.
- [ ] Assert read-only state/current authorization, then capture
      `02-member-shared-view-readonly.png`.
- [ ] Open owner view in two tabs; edit both and assert optimistic conflict/no silent overwrite;
      capture `03-owner-saved-view-revision-conflict.png`.
- [ ] Revoke a field/value permission through an approved test-only policy fault hook. This is an
      exogenous prerequisite mutation, not the saved-view action under proof: the hook returns only an
      acknowledgement and cannot return/alter the desired view UI. Reopen/execute the view through UI
      and assert repair/suppression without hidden value disclosure.
- [ ] Capture `04-member-view-after-permission-revoke.png`.
- [ ] Query saved-view revision/grants/audit and verify no result/provider snapshot was persisted.

### RP-FST-07 — Taxonomy rename, merge, split, and repair

- [~] **RP-FST-07 overall status** — bounded governance and owner-continuation browser evidence
      exists; governed split application, complete screenshot/audit/resilience joins and release
      closure remain open.

- [ ] Create a saved view and alert through UI using canonical terms A/B; record visible labels and
      canonical IDs through authorized diagnostic/audit output.
- [ ] Login as `ACT-ORGADMIN`/`ACT-SYSADMIN`; preview and apply a label rename, then an unambiguous
      merge through the governed operator UI. The browser observes its API calls but does not invoke
      apply directly.
- [ ] Assert view still executes with preserved/migrated identity and capture
      `01-admin-taxonomy-merge-preview-applied.png`.
- [ ] Preview a split of the selected term into C/D; assert affected view/alert/projection counts and
      no publication before consumer plan is safe.
- [~] Apply/transition prerequisite; login as original owner, assert `requires_repair`, obsolete
      selection visible and alert paused; the isolated owner Chromium case passes `1/1` through
      the real task Search Center using the token-bound `seed-taxonomy-repair-roleplay` fixture.
- [~] Choose C through repair UI, revalidate/execute and explicitly resume alert; the same isolated
      case passes the complete owner continuation. Screenshot, audit, replay and cross-browser joins
      remain open; no combined-file pass is claimed after a dirty-worktree worker/DB timeout.
- [ ] Audit version/migration/checkpoint/idempotency and replay the apply request; assert no duplicate
      migration/version/delivery.

### RP-FST-08 — Saved-view alert new-match lifecycle

- [ ] **RP-FST-08 overall status**

- [ ] As `ACT-USER` or `ACT-RECRUITER`, save a filter with zero current results and subscribe through
      UI; assert schedule/timezone/baseline state and capture `01-user-alert-subscribed-zero.png`.
- [ ] As `ACT-MANAGER`, create or update an authorized matching entity through its real UI.
- [ ] Run/await the real test alert worker; assert one notification with safe result summary and open
      it back to the saved view.
- [ ] Capture `02-user-alert-new-match-notification.png` and
      `03-user-alert-opened-saved-results.png`.
- [ ] Retry/overlap workers through approved test orchestration; assert no duplicate visible
      notification and watermark/fence evidence.
- [ ] Revoke permission or degrade provider before next run; assert pause/retry, no delivery and no
      success-watermark advance; capture `04-user-alert-paused-safe.png`.

### RP-FST-09 — Search degraded, stale, and recovered

- [~] **RP-FST-09 overall status** — bounded alias-integrity fail-closed/recovery, PIT-expiry and
      task-scoped degraded UI/source-diagnostic evidence; actual network/shard degradation,
      response-order, UI cursor screenshots and release joins remain open

- [x] Start with healthy indexed Search and committed criteria; assert exact total/facets and capture
      `01-user-search-healthy.png`.
- [~] Use the token-bound test-only alias-integrity control to add a real second Elasticsearch alias
      backing generation; the RP-FST-09 Chromium case passes the resulting
      `SEARCH_SOURCE_UNAVAILABLE` fail-closed response and restores the alias. This is not network
      outage/shard-failure evidence; browser API response interception and in-process provider
      fakes are not used.
- [~] Repeat query; the direct Discovery API asserts `503 SEARCH_SOURCE_UNAVAILABLE` and the
      task-scoped Search surface remains available with a safe compatibility-mode/source-unavailable
      diagnostic. Focused backend/UI evidence passes `3/3` and `14/14`, and the degraded browser
      assertion is covered by the RP-FST-09 Chromium suite; capture
      `02-user-search-provider-degraded.png` when the visual join is added.
- [ ] Attempt facet value search/cursor during degradation; assert stable diagnostic, no fake zero and
      no silent restart.
- [~] The bounded Chromium case obtains opaque cursors, rejects one-bit tampering, advances the
      shared test clock beyond the cursor TTL and asserts `SEARCH_CURSOR_EXPIRED`, then recovers
      from a fresh request. UI Next-click, screenshot joins and a real provider PIT-expiry fault
      remain open; capture `04-user-search-cursor-tampered.png` and
      `05-user-search-cursor-expired.png` after those UI assertions are added.
- [ ] Restore provider; issue a newer request before the degraded response can land; assert latest
      response wins and capture `03-user-search-recovered.png`.
- [ ] Verify logs/events contain safe codes/version/hash only, not raw query/filter values.

### RP-FST-10 — Projection generation activation, crash reconciliation, and rollback

- [ ] **RP-FST-10 overall status** — not started as a complete scenario; only isolated backend
      activation/reconcile/rollback evidence and an inspect/a11y browser surface exist.

- [ ] Login as `ACT-SYSADMIN`; open projection administration/readiness UI for the task pilot.
- [ ] In a clean `ACT-USER` session, obtain a Search next-page cursor through UI and retain only its
      opaque test reference; return to the admin session before starting the candidate build.
- [ ] Start candidate rebuild while a manager updates and deletes indexed tasks through UI.
- [ ] Assert building/catch-up/checkpoint/completeness state and capture
      `01-admin-projection-catching-up.png`.
- [ ] Inject a missing event/completeness failure; assert activation blocked with exact safe blocker
      and capture `02-admin-projection-activation-blocked.png`.
- [ ] Repair the gap and run the pre-production active-versus-candidate shadow corpus; assert authorized
      eligible IDs/facets, live update/delete and tombstones agree with zero leakage, then capture
      `03-admin-projection-shadow-ready.png`. This is SHD readiness, not a production cohort canary.
- [ ] Repair/replay and preview activation through the operator UI; inject only the crash between
      alias swap and DB state through the approved fault hook, then run reconcile through UI and
      assert exactly one routed active generation.
- [ ] Capture `04-admin-projection-reconciled-active.png` after alias/generation assertions.
- [ ] Return to the clean user session and invoke Next with the pre-cutover cursor through UI; assert
      explicit generation-mismatch handling and no silent page-one restart, then capture
      `05-user-cursor-generation-cutover.png`.
- [ ] Preview/execute compatible rollback and assert saved views/alerts/cursors follow documented
      compatibility behavior; capture `06-admin-projection-rollback-complete.png`.
- [ ] Audit generations, versions, checksums, live update/delete and tombstone; no snapshot gap.

### RP-FST-11 — Advanced builder, qualifier, and facet-count semantics

- [ ] **RP-FST-11 overall status**

- [ ] Login as `ACT-USER`; build nested Require/Exclude, Any/All, unknown policy and preference using
      the visual builder with keyboard only.
- [ ] Assert readable summary and capture `01-user-advanced-filter-builder.png`.
- [ ] Serialize representable clauses to qualifier syntax, edit text, parse back and assert canonical
      equivalence; advanced-only clause remains visible and capture
      `02-user-qualifier-visual-roundtrip.png`.
- [ ] Compare a supported root self-excluding facet with a nested/negated non-extractable clause.
      Assert the first has exact counts and the second shows an explicit unsupported-count diagnostic
      without inventing an approximation; capture `03-user-self-excluding-facet-diagnostic.png`.
- [ ] Inspect canonical AST/hash and facet backend evidence; visual and qualifier modes must produce
      the same eligible set, while the unsupported count remains explicitly unavailable.

### RP-FST-12 — Cross-tenant and permission-revocation no-leakage journey

- [ ] **RP-FST-12 overall status**

- [ ] Seed public entities and unique synthetic non-production canary labels/entities for Org A and
      Org B with equal public result counts. Generate `CANARY_ORGA_<run-id>` solely for this isolated
      run; never use a real confidential value.
- [ ] Login as `ACT-FOREIGN` in Org B and search/filter the exact Org A canary through text,
      qualifiers, facet value search and suggestions. The user-supplied request/URL/input echo is
      tagged `userInputEcho`; screenshot capture masks only the input locator without mutating DOM,
      URL or application state, then immediately repeats the state/stability assertions.
- [ ] Assert no candidate/count/facet/missing bucket/suggestion/snippet/explanation/diagnostic
      distinction; capture `01-foreign-search-secret-value-safe-zero.png`.
- [ ] Share a view from Org A to an initially authorized user, open it, then revoke membership while
      the tab/cursor remains open.
- [ ] Execute, paginate and refresh; assert current permission wins and capture
      `02-revoked-member-view-safe-repair.png`.
- [ ] Inspect page props, network responses, cache/event/log/index-facing outputs for unauthorized
      response disclosure. Hits/facets/options/suggestions/snippets/explanations/diagnostics and hidden
      IDs must contain zero canary occurrences. The designated request payload and `userInputEcho` may
      contain the submitted canary; Referer, analytics, access logs and telemetry must hash/redact it.

### RP-FST-13 — Advanced relevance, rule, hybrid, and experiment guardrails

- [ ] **RP-FST-13 overall status**

This post-baseline journey is required only when WP-28 is selected.

- [ ] As `ACT-SYSADMIN`, preview a bounded relevance rule against organic results; assert exact
      eligibility/facets unchanged and capture `01-admin-relevance-rule-preview.png`.
- [ ] Approve through required dual control, start a deterministic experiment and assert exposure
      assignment/version before conversion.
- [ ] As `ACT-USER`, run Search in treatment and inspect the bounded rule/hybrid explanation; assert
      exact identifier/explicit sort and strict eligibility remain unchanged, then capture
      `02-user-advanced-relevance-explanation.png`.
- [ ] Disable rule, model/reranker and experiment services independently; Search returns to the frozen
      baseline ordering with explicit degraded/version metadata and identical eligibility/facets.
      Capture `03-user-advanced-relevance-global-fallback.png`.
- [ ] Audit rule approval, ranking version, assignment/exposure and validate offline sample/guardrail/
      stop evidence plus the pre-production shadow comparison.

### RP-FST-14 — Optional natural-language assisted authoring

- [ ] **RP-FST-14 overall status**

This journey is required only when WP-25 is selected; deferring WP-25 does not block RP-FST-11.

- [ ] Login as `ACT-USER`; enter a valid natural-language request, assert candidate preview and
      uncertainty, edit one clause and explicitly Apply through UI; capture
      `01-user-assisted-proposal-edited.png`.
- [ ] Assert the accepted proposal becomes the same editable canonical AST used by the manual builder,
      then undo and complete the equivalent intent manually.
- [ ] Enter ambiguous/adversarial/protected-trait text under deterministic provider behavior; assert
      rejection/clarification, no auto-execute and complete manual fallback; capture
      `02-user-assisted-authoring-safe-fallback.png`.
- [ ] Inspect request/events/backend evidence to ensure no hidden context/principal/raw provider output
      is exposed or retained outside approved policy.

### RP-FST-15 — Personalization and organization-policy guardrails

- [ ] **RP-FST-15 overall status**

This post-baseline journey is required only when WP-29 is selected; WP-28 can close independently.

- [ ] As `ACT-USER`, run Search with a deterministic bounded personalization treatment, inspect “Why
      this result?” and assert eligibility/facets/exact-ID behavior match the global baseline; capture
      `01-user-personalization-explanation.png`.
- [ ] Opt out/reset through UI; assert immediate global fallback, deletion/consent fence and no later
      stale event re-enables personalization; capture `02-user-personalization-opted-out.png`.
- [ ] Switch organizations in a clean explicit context; assert vocabulary/policy/cache isolation and
      capture `03-user-organization-policy-isolated.png`.
- [ ] Disable personalization and organization-policy services independently; assert global fallback
      with safe diagnostics and no eligibility/facet change.
- [ ] Audit assignment/exposure/consent/reset/retention, organization-policy version and shadow
      guardrail/stop evidence.

## 7. Screenshot and visual evidence contract

### 7.1 Artifact location and naming

Successful role-play evidence is uploaded from:

```text
test-results/e2e-visual/filter-search-taxonomy/<run-id>/<journey-id>/<browser>/<viewport>/
```

Name format:

```text
<two-digit-sequence>-<actor>-<surface>-<state>.png
```

The run root also contains:

```text
manifest.json
console-errors.json
network-failures.json
backend-evidence.json
```

Minimum manifest fields:

```text
scenarioId, journeyId, checkpointId, detailedCaseIds,
releaseClass, releaseManifestId, applicabilityRecordId,
requiredLayers, observedLayers, negativePathIds,
actor, organizationIdAlias, route, contextId,
viewport, deviceScaleFactor, browser, browserVersion, operatingSystem,
locale, colorScheme, fontManifestHash, dataClassification,
seedId, expectedObservation, semanticAssertions,
screenshotPath, screenshotSha256, visualEvidenceMode,
baselinePath, baselineSha256, baselineApprovalId,
baselineNotApplicableReason, backendEvidenceRefs, auditEvidenceRefs,
testFile, commit, runId, timestamp,
evidenceOwner, closureAuthority, reviewerSignOffRefs,
aclPolicyId, retentionPolicyId
```

Arrays such as `detailedCaseIds`, `requiredLayers`, `observedLayers`, `negativePathIds`,
`backendEvidenceRefs` and required `reviewerSignOffRefs` cannot be empty when the selected row's
contract requires them. `observedLayers` contains an evidence record ID per layer, not a copied layer
name. The validator compares this data to the matrix and release manifest; self-declared green strings
are invalid.

`visualEvidenceMode` is exactly one of:

- `baseline_regression`: stable deterministic component/surface; `baselinePath`, `baselineSha256` and
  `baselineApprovalId` are mandatory and `baselineNotApplicableReason` is null;
- `evidence_only`: dynamic temporal role-play checkpoint; baseline fields are null and
  `baselineNotApplicableReason` explains the volatile state. Screenshot hash, semantic assertions,
  backend references and sequence review remain mandatory.

The validator applies baseline requirements conditionally by this enum; it must never fabricate a
baseline for an `evidence_only` journey or treat that mode as weaker semantic/experience proof.

Every `backend-evidence.json` entry has this minimum schema:

```text
evidenceId, scenarioId, journeyId, checkpointId, detailedCaseIds,
assertionType, system, queryOrAuditName, expectedSummary, observedSummary,
artifactPath, artifactSha256, dataClassification, seedId,
actor, organizationIdAlias, contextId, commit, runId, capturedAt
```

The backend artifact contains bounded authorized IDs/count relations/hashes/versions/checkpoints or
audit references needed by the named assertion—never raw credentials, provider DSL or confidential
values. A journey cannot reuse an unrelated backend record: `scenarioId`, `journeyId`, seed, actor,
context and run must match, and the record must map to the action/checkpoint it proves.

### 7.2 Screenshot checkpoint rules

- [ ] Semantic `expect(...)` assertions for actor, route/heading, criteria, primary result/state and
      relevant count/diagnostic run before screenshot.
- [ ] Use a stable-state helper: network/request state settled, fonts ready, animations/transitions
      disabled or reduced, two animation frames completed and loading overlays absent.
- [ ] Screenshot the smallest locator/viewport that proves the relationship. Avoid giant full-page
      images when the evidence is a drawer, result/facet relationship or repair dialog.
- [ ] Actor/context identity is inferable from safe UI or manifest; never include credentials, CSRF,
      tokens, private URLs, raw confidential values or unrelated personal data.
- [ ] Stable deterministic shared components use `expect(locator).toHaveScreenshot()` visual
      regression with reviewed baselines. Dynamic full journeys use evidence screenshots plus semantic
      assertions; they do not create brittle pixel baselines for volatile content.
- [ ] Every pixel baseline records browser/version, OS image, device scale factor, viewport, locale,
      color scheme and font-manifest hash. A changed environment is a new review lane, not an automatic
      baseline update.
- [ ] In `baseline_regression` mode, a missing baseline fails with
      `baseline_missing_review_required`. CI may upload a candidate but cannot create/approve a
      baseline; approval records reviewer, visible reason and before/after hash. In `evidence_only`
      mode, any supplied pixel baseline is rejected to prevent accidental brittle snapshot gating.
- [ ] Expected dynamic regions—clock, request ID, avatar image—are frozen, deterministically seeded,
      masked or excluded with a documented reason. Masking may not hide the behavior being proved.
- [ ] Every major P0 surface has a desktop checkpoint; every responsive journey has at least one
      390×844 mobile checkpoint. Dark mode is required for shared primitives and one Search journey;
      full role-play duplication is not required unless layout differs materially.
- [ ] Screenshot diff approval states the user-visible reason. “Update snapshots” without inspecting
      hierarchy, text, clipping, focus and data state is forbidden.
- [ ] Screenshot existence is never a pass assertion. If semantic assertion or browser/network health
      fails, the checkpoint remains `[~]` even if an image artifact exists.
- [ ] Artifact upload uses the restricted test-evidence ACL and retention policy IDs recorded in the
      manifest. Public links are forbidden; expiration/deletion follows the approved project policy,
      and release evidence retains hashes after artifact expiry.
- [ ] A deterministic synthetic-canary scanner checks screenshots, DOM snapshots, traces, network and
      logs; OCR is an additional best-effort screenshot check, never the only privacy proof. A match
      fails `SEC-016` unless it is an explicitly classified/masked `userInputEcho` outside the image.
- [ ] Product/QA reviewer signs the sequence, not only individual images, because Back/Forward,
      repair, recovery and actor transitions are temporal experiences.

### 7.3 Role-play implementation rules

- [ ] Testing seed endpoints create only deterministic actors, permissions, base resources, taxonomy
      and provider/fault prerequisites. The core filter/search/save/share/subscribe/repair action runs
      through UI.
- [ ] Switching persona clears cookies/storage/session and performs real login. Do not mutate auth or
      current organization in browser JavaScript.
- [ ] Prefer accessible role/name/label selectors. `data-testid` is allowed only when no stable
      semantic selector exists and must not encode implementation detail.
- [ ] Collect `pageerror`, console error, failed request and unexpected 5xx lists; any unexplained
      entry fails the scenario.
- [ ] Do not use `waitForTimeout` as correctness/readiness proof. Wait on visible UI, response,
      worker/checkpoint status or a bounded polling helper with diagnostic timeout.
- [ ] Every scenario has a unique seed/run ID and isolated DB/index namespace; cleanup does not depend
      on execution order.
- [ ] Dates/relative time/alert schedules use a frozen clock or deterministic timestamps. Locale and
      timezone are explicit.
- [ ] Release evidence uses real PostgreSQL/Redis/Elasticsearch test services. A route-intercepted
      fake response may test component/error rendering but cannot close an RP scenario.
- [ ] On failure, retain screenshot, trace, video where enabled, console/network summaries and seed
      manifest. P0 evidence run uses zero unexplained retries; a retry-pass remains flaky `[~]` until
      root cause/owner/deadline are recorded.

## 8. Suggested automated spec ownership

Each suite has one exclusive owner. It may reference many scenario IDs, but each scenario ID has one
coordinator row in the machine-readable evidence manifest.

| Suite                                | Proposed file                                                                                   | Primary coverage                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Marketplace filter-only role-play    | `inertia/apps/user/tests/e2e/filter_search_taxonomy/marketplace_filter_only_roleplay.spec.ts`   | TC-FST-001/005/006/007/008/009, RP-FST-01                         |
| Search discovery/recovery role-play  | `inertia/apps/user/tests/e2e/filter_search_taxonomy/search_degraded_recovery_roleplay.spec.ts` | TC-FST-002/003/004/014/023/024/028, RP-FST-02/RP-FST-09           |
| Mobile state role-play               | `inertia/apps/user/tests/e2e/filter_search_taxonomy/mobile_filter_state_roleplay.spec.ts`       | TC-FST-014/015, RP-FST-05                                         |
| Talent discovery/privacy role-play   | `inertia/apps/org/tests/e2e/filter_search_taxonomy/talent_discovery_roleplay.spec.ts`           | TC-FST-005/012/013/021/022, RP-FST-03/RP-FST-12                   |
| Admin audit SQL role-play            | `inertia/apps/admin/tests/e2e/filter_search_taxonomy/audit_filter_roleplay.spec.ts`             | TC-FST-004/011/014/015, RP-FST-04                                 |
| Saved-view role-play                 | `inertia/apps/user/tests/e2e/filter_search_taxonomy/saved_view_roleplay.spec.ts`                | TC-FST-016/017/021, RP-FST-06                                     |
| Taxonomy governance/repair role-play | `inertia/apps/admin/tests/e2e/filter_search_taxonomy/taxonomy_split_repair_roleplay.spec.ts`  | TC-FST-018/019, RP-FST-07; crosses admin and clean owner sessions |
| Alert lifecycle role-play            | `inertia/apps/user/tests/e2e/filter_search_taxonomy/filter_alert_roleplay.spec.ts`              | TC-FST-020/021, RP-FST-08                                         |
| Projection operations role-play      | `inertia/apps/admin/tests/e2e/filter_search_taxonomy/projection_cutover_roleplay.spec.ts`       | TC-FST-024/025/026, RP-FST-10                                     |
| Builder/qualifier role-play          | `inertia/apps/user/tests/e2e/filter_search_taxonomy/filter_builder_qualifier_roleplay.spec.ts`  | TC-FST-010/027/028, RP-FST-11                                     |
| Assisted-authoring role-play         | `inertia/apps/user/tests/e2e/filter_search_taxonomy/filter_assisted_authoring_roleplay.spec.ts` | TC-FST-029, RP-FST-14                                             |
| Advanced-relevance role-play         | `inertia/apps/admin/tests/e2e/filter_search_taxonomy/relevance_experiment_roleplay.spec.ts`     | TC-FST-030, RP-FST-13                                             |
| Personalization/policy role-play     | `inertia/apps/user/tests/e2e/filter_search_taxonomy/personalization_policy_roleplay.spec.ts`    | TC-FST-031, RP-FST-15; crosses user and clean admin sessions      |
| User-shell evidence helper           | `inertia/apps/user/tests/shared/e2e/filter_search_taxonomy_evidence.ts`                         | Stable capture/manifest/browser health                            |
| Org-shell evidence helper            | `inertia/apps/org/tests/shared/e2e/filter_search_taxonomy_evidence.ts`                          | Stable capture/manifest/browser health                            |
| Admin-shell evidence helper          | `inertia/apps/admin/tests/shared/e2e/filter_search_taxonomy_evidence.ts`                        | Stable capture/manifest/browser health                            |
| Matrix manifest validator            | `scripts/filtering/validate_filter_search_test_matrix.ts`                                       | IDs, layers, files, screenshots, ownership, no orphan row         |

Testing-only routes/services are disabled outside the test environment and must not implement the
core action being proved. Existing audit/marketplace/talent E2E may supply compatible steps, but the
matrix ID, evidence helper and screenshot contract must be explicit; an old generic test name does not
automatically close a row.

### 8.1 Ownership integrity checkpoint (2026-08-10)

- [x] Observed executable ownership currently covers Marketplace, Search recovery, mobile state,
      Talent discovery, saved views and taxonomy repair. The actual Search suites include
      `search_center_keyword_only_roleplay.spec.ts`, `search_discovery_combined_cursor_recovery_roleplay.spec.ts`
      and `runtime_accessibility_roleplay.spec.ts`; these are not yet joined to a release manifest.
- [ ] Seven proposed ownership paths are not executable artifacts yet:
      `audit_filter_roleplay.spec.ts`, `filter_alert_roleplay.spec.ts`,
      `projection_cutover_roleplay.spec.ts`, `filter_builder_qualifier_roleplay.spec.ts`,
      `filter_assisted_authoring_roleplay.spec.ts`, `relevance_experiment_roleplay.spec.ts` and
      `personalization_policy_roleplay.spec.ts`.
- [ ] This table remains a proposed ownership inventory, not a valid release manifest. No synthetic
      artifact IDs, reviewer joins or closure claims are created for the missing suites.

## 9. Execution tiers and release gates

### Tier 0 — Worker focused loop

- [ ] Worker adds failing U/PB/CT/IT/UI case with matrix ID and records intended RED.
- [ ] Focused RED fails for the named behavior, then the same command is GREEN.
- [ ] Downstream master/RP row stays `[ ]`; package test success is not feature acceptance.
- [ ] Worker handoff lists affected matrix IDs, layers supplied and remaining evidence owners.

### Tier 1 — Pull request / package merge gate

- [ ] Focused package unit/contract/integration/component tests pass.
- [ ] Provider differential fixtures pass when semantics/executor changed.
- [ ] Affected Chromium P0 role-play slice runs through the real UI/service plane.
- [ ] Required screenshot artifacts and manifest are uploaded and reviewable.
- [ ] `pnpm run test:e2e:policy` passes; no false-pass/skip pattern is introduced.
- [ ] Matrix validator finds no scenario with missing owner/layer/test reference.

### Tier 2 — Integration wave gate

- [ ] Cross-module RP journey uses merged contracts/composition/routes, not worker-local stubs.
- [ ] Backend/audit evidence after browser journey proves state and no-leakage.
- [ ] At least one permission/failure/concurrency path for every changed P0 flow passes.
- [ ] Desktop plus required mobile screenshot checkpoints pass and are reviewed as a sequence.
- [ ] Chromium plus one non-Chromium engine pass for the changed journey.

### Tier 3 — Initial release candidate

- [ ] Every exact `TC-FST-*` ID whose manifest record is `applicability: required` is `[x]`; a
      deferred conditional row stays `[ ]` and carries its separate approved applicability record.
- [ ] Every exact `RP-FST-*` ID selected by those required rows is `[x]`; no journey is inferred from
      a numeric range or silently skipped because its capability flag is disabled in production.
- [ ] Required Chromium/Firefox/WebKit/mobile matrix is green with deterministic seed and no
      unexplained retry.
- [ ] Screenshot manifest is complete and Product/QA/a11y/security owners sign relevant checkpoints.
- [ ] Full-confidence, migrations, conformance/differential, E2E, typecheck, Svelte, lint, build,
      security, performance, projection/alert and rollback evidence pass.
- [ ] Pre-production shadow-readiness thresholds from WP-26 pass with zero permission leakage;
      production cohort canary evidence belongs to post-GATE-06 WP-27B and cannot be a prerequisite
      for this gate.

### Tier 4 — Advanced/adaptive release

- [ ] `TC-FST-030`/`RP-FST-13` are `[x]` through WP-30A/C when WP-28 is selected.
- [ ] `TC-FST-031`/`RP-FST-15` are `[x]` through WP-30B/C when WP-29 is selected; WP-28-only release
      does not depend on them.
- [ ] Offline relevance evidence, eligibility/facet equivalence, sample-size calculation, exposure
      attribution, privacy/fairness slices and global fallback are approved.
- [ ] Rule/model/personalization/organization policy can each be disabled independently.
- [ ] Explanation, opt-out/reset and organization-switch screenshot sequence passes experience review.

## 10. Matrix traceability and anti-drift rules

- [ ] Every automated test name/tag contains the scenario/case ID, for example
      `test('@fst @p0 TC-FST-001 FTM-010 ...')`.
- [ ] Every master scenario maps requirements/spec sections → detailed cases → automated tests → RP
      checkpoints → evidence owner in a machine-readable manifest.
- [ ] Each case ID has one accountable `evidenceOwner` and one closure record but may name several
      implementation contributors and be referenced by several layer suites.
- [ ] CI validator fails when a required layer has no test file, an RP checkpoint has no screenshot
      manifest entry, a referenced file does not exist or a screenshot is orphaned.
- [ ] Requirement/context/operator/taxonomy contract changes update the matrix in the same commit or
      merge is blocked.
- [ ] Deleting/renaming a test cannot silently remove coverage; matrix case is transferred,
      deprecated with approval or remains failed.
- [ ] Worker does not mark master rows `[x]`; coordinator/QA does so only after evidence bundle and
      manual screenshot-sequence review.
- [ ] Screenshot diff failure reports scenario, actor, checkpoint and user-visible regression, not
      only a pixel percentage.
- [ ] P0 flaky quarantine has owner, minimal reproduction, deadline and release impact. `skip` or
      “retry until green” cannot unblock release.
- [ ] A layer applicability override includes reason, evidence owner, QA approver, date, release ID
      and affected layer. Row status never uses `N/A`; blank ownership/evidence arrays are invalid.

## 11. Structured reader and experience review

After automation, a reviewer who did not implement the package reviews screenshots/traces in journey
order and answers:

- [ ] Can a user discover that filtering works without entering a keyword?
- [ ] Is the difference between Search text, strict filter, preference, sort and view mode obvious?
- [ ] Can the reviewer tell whether totals/facets are exact, approximate, partial or unavailable?
- [ ] Are selected-zero, missing/unknown, retired and repair-required states understandable without
      developer explanation?
- [ ] Does Marketplace feel like discovery, Talent feel like evidence-based recruitment and Audit
      feel like investigation, despite shared Filter semantics?
- [ ] On mobile, is the staged draft/Apply/Cancel model predictable and is focus returned correctly?
- [ ] Can a user understand why a saved/shared view changed after permission or taxonomy migration?
- [ ] Does the alert subscription/pause/delivery sequence make it clear what was observed and when?
- [ ] During Search degradation, can the user distinguish partial/unavailable from true zero results?
- [ ] Can an operator understand projection blocker, activation, reconciliation and rollback state?
- [ ] Can a keyboard/screen-reader user author/remove/navigate complex criteria without drag-only or
      color-only meaning?
- [ ] Does zero-result recovery or assisted authoring remain an editable proposal rather than an
      unexplained automatic broadening?
- [ ] Are Search explanations useful while avoiding private values, hidden constraints or proxy
      traits?
- [ ] When personalization is enabled, can the user see/reset it and return to global behavior?

If the reviewer needs oral explanation from the developer to answer, the experience gate fails even
when all automated assertions are green.

## 12. Matrix completion definition

- [ ] 100% selected Filter/Search/Taxonomy requirements and WP-00 inventory contexts trace to master
      scenario, detailed cases, tests, RP/VS evidence and owner.
- [ ] Every P0 flow has the appropriate U/PB/CT/IT/API/UI/RP/VS/AX/SEC/RES/PERF/AUD bundle; no layer
      is omitted because another layer is green.
- [ ] All enabled role-play journeys have deterministic seed, real UI core actions, semantic
      assertions, backend/audit verification, screenshots and browser/network health evidence.
- [ ] Security/privacy proves absence across response, page props, cache, logs/events, index, totals,
      facets, missing buckets, value search, suggestions, snippets, explanations, saved views, alerts
      and screenshot artifacts.
- [ ] Concurrency/retry/replay/rebuild/cutover cases use real failure injection and services where the
      invariant depends on them; mocked success paths cannot close the row.
- [ ] Performance evidence records environment/cardinality/concurrency/sample facts and never replaces
      semantic correctness.
- [ ] Product/QA/a11y/security/operations reviewers accept the relevant screenshot sequences and sign
      the evidence report.
- [ ] Artifacts are sufficient for a reader unfamiliar with implementation to reconstruct actor,
      intent, actions, visible states, backend outcomes, prevented failures and recovery path.

## 13. Coordinator audit record — task metadata/Search projection (2026-08-09)

The audit intentionally uses layered evidence; provider unit/contract green does not close Search
projection correctness.

| Surface                          | Evidence                                                                                                                                                                                                                                                                          | Status                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Canonical task metadata provider | provider unit `7/7`, shared conformance `3/3`, Lucid source integration `3/3`, composition `3/3`                                                                                                                                                                                  | `[x]` bounded provider slice |
| Canonical version sources        | `skills` backed by `skill_taxonomy_revision`; four task namespaces now have an unseeded authoritative revision registry/reader and remain unavailable until real catalog revisions are published                                                                                  | `[~]`                        |
| Task Search source               | `LucidTaskSearchDocumentReader` retains legacy columns but production composition now injects the canonical provider for the supported `skills` namespace; unsupported namespace versions and full rebuild/HTTP/browser closure remain open                                       | `[~]`                        |
| Search document/mapping          | additive canonical ID/provenance/review/version envelope and strict ES mapping exist; production reader wiring covers the supported `skills` namespace with targeted integration evidence, while unsupported namespace versions and full rebuild/HTTP/browser closure remain open | `[~]`                        |
| End-to-end Search adoption       | no provider → projection → Elasticsearch rebuild → HTTP/browser evidence for canonical metadata                                                                                                                                                                                   | `[ ]`                        |

Required closure evidence remains: provider/contract, projection unit, strict mapping/index
integration, rebuild/replay, HTTP semantics, browser/a11y, and release artifact joins. No row is
promoted to `[x]` from unit tests alone.

## 18. Namespace revision registry audit (2026-08-09)

- [x] Registry migration constrains the four named task metadata namespaces, positive revisions,
      and source fingerprints without inventing term rows or initial versions.
- [x] `LucidTaxonomyVersionReader` reads published registry revisions and fail-closes missing,
      unavailable, and unsupported namespaces.
- [x] Focused evidence: version reader `4/4`, Lucid source reader `3/3`, provider unit `7/7`,
      provider conformance `3/3`, and focused ESLint pass.
- [~] Catalog term resolution, aliases, hierarchy/lifecycle, governed publication, and full
  Search/Filter/rebuild/browser evidence remain open; registry existence alone does not close
  canonical namespace adoption.

## 14. Latest verification correction (2026-08-09)

- [x] Search Center a11y regression fixed and verified by component suite `9/9`; the failure was a
      localized accessible-name mismatch, not an untested branch.
- [x] Search Discovery mapper/controller suites pass `2/2` each; matrix-validator Japa suite passes
      `14/14`; targeted lint and diff checks pass.
- [x] Current typecheck recheck passes (`tsc --noEmit`; Svelte-check `0/0`).
- [~] The release CLI still returns `manifest_invalid` for the legacy JSON files. The matrix has
  192 joined IDs but remains incomplete (`47 [~]`, `130 [ ]`); this is evidence for audit only,
  not release closure.
- [~] Frozen hashes for the plan, matrix, and surface inventory are stale and require an approved
  re-freeze; pending migrations/schema approval also keep release readiness open.
- [x] Latest Chromium rerun passed both bounded Search journeys (`2 passed`, one worker): q-only
      Search Center rendering plus combined strict criteria, preference ranking, cursor invalidation,
      and recovery. This is browser evidence for the covered slice, not closure of all RP/TC layers.
- [x] The prior seed `E_ROW_NOT_FOUND` did not reproduce on the current server/reindex path; current
      browser status is green for these two bounded journeys.

## 15. Release manifest audit (2026-08-09)

- [~] The release inventory contains 31 master cases (28 required, 3 deferred) and 15 role-play
  cases (12 required, 3 deferred), but required cases still lack complete closure records and
  real backend/audit/screenshot/reviewer joins.
- [~] The existing JSON files are legacy matrix/implementation-plan inputs, not manifests matching
  the validator schema; both return `manifest_invalid`.
- [ ] No synthetic artifact, hash, owner, or closure ID is created to force validator GREEN.
- [~] Pending migration/schema approval and stale frozen hashes continue to block release closure;
  bounded browser evidence does not promote the aggregate matrix rows.

## 16. Fresh release-closure command audit (2026-08-09)

The following commands were rerun against the current worktree. Their scope is recorded explicitly;
none of them creates or promotes release artifacts:

| Command                                                                                                                                        | Observed result              | Interpretation                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/filtering/tests/backend/unit/filter_search_matrix_validator.spec.ts`     | `17 passed`                  | Validator behavior, including required execution metadata, is covered by a runnable Japa wrapper suite.                |
| `node --import=@poppinss/ts-exec bin/test.ts unit --files scripts/filtering/fixtures/matrix-validator-unit.spec.ts`                            | `NO TESTS EXECUTED`          | Direct fixture path remains outside the standard Japa glob; the wrapper suite above is the authoritative targeted run. |
| `node --import=@poppinss/ts-exec scripts/filtering/validate_filter_search_test_matrix.ts --manifest docs/12-evidence/test-matrix.json`         | exit `1`, `manifest_invalid` | Legacy JSON is not an FST release manifest.                                                                            |
| `node --import=@poppinss/ts-exec scripts/filtering/validate_filter_search_test_matrix.ts --manifest docs/12-evidence/implementation-plan.json` | exit `1`, `manifest_invalid` | Legacy implementation-plan JSON is not an FST release manifest.                                                        |

The pre-edit SHA-256 audit recorded the frozen documents as follows: plan
`d997a732b8473f576ecb958837c7fba9b79827fed3f4917f0df2419b9a8c643c`, matrix
`6f6a91d09c596eee723ce08107a54427eab27adcdd2af2934e3e649f0613dccf`, and surface inventory
`5298130671e5dc6c703298c5c3b7d1385162a2f2cf0ff4b7efef8a6515e4dcdb`. The first two differ from
the immutable checkpoint in the release registry; this documentation correction intentionally does
not re-freeze them. Re-freezing requires coordinator approval and the migration/schema gate.

Status remains `[~]` for release evidence and `[ ]` for matrix closure. No synthetic manifest,
screenshot, backend/audit reference, closure record, hash or reviewer sign-off was added.

## 17. Search V2 bounded accessibility slice (2026-08-09)

- [x] Search Center domain and field filter controls now expose `aria-pressed` for active versus
      inactive state. Component evidence: `inertia/apps/user/tests/modules/search/index.test.ts`
      `10/10`.
- [x] The authenticated Search Center role-play now asserts the real filter region's active state,
      clicks the task filter, verifies the real `?q=...&type=task` navigation, and verifies the
      post-navigation active state. Chromium evidence: `1/1` was observed before the current
      webserver import failure; the fresh rerun is blocked before test execution.
- [~] This is a bounded AX/UI slice only. Full axe/keyboard/screen-reader coverage, combined
  Discovery UI criteria, cursor controls, cancellation/order handling, and release artifact
  joins remain open; no aggregate WP/TC/RP row is promoted to `[x]`.

## 18. Search V2 task page/cursor evidence (2026-08-09)

| Layer                 | Fresh evidence                                                                                                                                   | Status        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Request contract      | Search page cursor mapper `3/3`, including malformed/oversized input rejection                                                                   | `[x]` bounded |
| HTTP/Inertia boundary | Task Discovery page controller `3/3`; public versus organization-member context, q-only, empty browse, and cursor forwarding                     | `[x]` bounded |
| Search provider       | Real task Discovery integration `9/9`; filter-only multi-label recall, complete totals/facets, page-two cursor, stale/expired cursor diagnostics | `[x]` bounded |
| Frontend/navigation   | Search UI and shell suites `14/14`; accessible next-page action and empty task browse rendering                                                  | `[x]` bounded |
| Static verification   | Targeted ESLint, `pnpm run typecheck` (`tsc` pass; Svelte-check `0 errors/0 warnings`), `git diff --check`                                       | `[x]`         |
| Aggregate closure     | WP-16/WP-17 structured criteria UI, cancellation/order, full browser AX/RP, and release joins                                                    | `[~]`         |

This evidence strengthens the relevant `TC-FST-014`/`TC-FST-024` layers but does not promote those
rows: the task page bridge is not proof of all Search verticals, structured combined UI, or the
full role-play bundle. No taxonomy or release tooling was changed.

## 18. Search Page cursor bridge slice (2026-08-09)

- [x] Search Page request mapping now trims and validates opaque cursors up to the bounded 8,192
      character limit, rejects malformed values, and forwards a valid cursor to Discovery.
- [x] Search Center exposes a labeled Next-page action and preserves the cursor in the shell-aware
      shareable URL; targeted Search Page mapper/controller suites pass `3/3` and `2/2`, while the
      combined Search Center and shell UI run passes `14/14`.
- [x] Targeted backend/frontend ESLint, Prettier, and `git diff --check` pass.
- [~] This slice has no fresh browser proof for clicking Next against a real Discovery response,
  previous-cursor behavior, tamper/expiry recovery through the UI, or screenshot/backend joins;
  therefore cursor-related matrix/RP rows and WP-17/WP-18 remain partial.

## 19. Saved-view membership and marketplace Any/All evidence (2026-08-09)

| Surface                               | Fresh evidence                                                                                                                                                                                                                                        | Status        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Saved-view revoke/share authorization | Security integration `4/4`; existing saved-view regression `8/8`; stale organization membership is denied without writing grants                                                                                                                      | `[x]` bounded |
| Marketplace request/query/UI          | Mapper `5/5`, task query `9/9`, Marketplace component `4/4`; server-owned `skill_match` reaches SQL and UI                                                                                                                                            | `[x]` bounded |
| Marketplace real route                | PostgreSQL-backed marketplace routes `32/32`, including Any/All skill filtering and filter-only page-two pagination                                                                                                                                   | `[x]` bounded |
| Static checks                         | Targeted ESLint and Svelte-check `0/0`; Prettier for changed TypeScript and diff check pass                                                                                                                                                           | `[x]` bounded |
| Aggregate WP-18/WP-24B closure        | Browser/AX/performance, parity/rebuild/cutover, audit/screenshot/release joins remain open; affected integration checks pass `4/4`, while a pre-existing Skills/Talent relocation wave leaves repository-wide `tsc` red on missing moved-module paths | `[~]`         |

## 20. Privacy-safe observability bounded evidence (2026-08-09)

| Layer                   | Fresh evidence                                                                                                                        | Status        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Event contract/factory  | Versioned schema, criteria hash, correlation/version/latency/result/lifecycle fields, bounded dimensions and fail-closed shape parser | `[x]` bounded |
| Privacy redaction       | Japa unit suite `4/4`; sensitive canaries, control characters and nested causes do not appear in serialized events                    | `[x]` bounded |
| Static checks           | Targeted ESLint and `git diff --check` pass                                                                                           | `[x]` bounded |
| Runtime/release closure | No runtime/logger wiring, integration/audit/log fixtures, sampling policy or release joins yet                                        | `[~]`         |

## 21. Runtime observability and Talent discovery bounded evidence (2026-08-09)

| Surface                    | Fresh evidence                                                                                                                                               | Status        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Filter runtime observer    | Optional sink; success/degraded/failure events use the redacting factory and cannot change query semantics                                                   | `[x]` bounded |
| Filter regressions         | Observability `3/3`; existing Execute Filter Query regression `13/13`; targeted static checks pass                                                           | `[x]` bounded |
| Observability aggregate    | Logger integration, sampling policy, integration/log/audit/release joins remain absent                                                                       | `[~]`         |
| Talent discovery contract  | Targeted contract suite `8/8` for anonymous context, permission, binding/index mapping, hit redaction, executor compatibility and real executor/index wiring | `[x]` bounded |
| Talent cross-layer closure | Fresh Japa boot is blocked by unrelated moved-module imports; real indexed route/facets/cursor/browser/AX/release joins remain absent                        | `[~]`         |

## 22. Talent Elasticsearch and correctness bounded evidence (2026-08-09)

| Surface                        | Fresh evidence                                                                                                               | Status        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Talent permission/context      | Internal active/searchable permission bindings; permission unit plus context contract pass                                   | `[x]` bounded |
| Talent real provider           | Elasticsearch integration `7/7`: filter-only, facets/totals, privacy exclusions, cursor page two, stale/expired diagnostics  | `[x]` bounded |
| Talent aggregate closure       | Browser/AX/fairness/privacy, rebuild/cutover, performance and release joins remain open                                      | `[~]`         |
| Correctness/leakage foundation | Metrics unit `4/4`, deterministic leakage contract `2/2`; fixtures cover anonymous/user/org visibility and hidden secret IDs | `[x]` bounded |
| Correctness aggregate closure  | SQL/reference/Elasticsearch differential and randomized full corpus evidence remain open                                     | `[~]`         |

## 23. Differential and role-play gate audit (2026-08-09)

| Surface                              | Fresh evidence                                                                                                                                                 | Status        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Reference/Elasticsearch differential | Real reference↔Elasticsearch harness and integration pass `1/1`; exact IDs/facets/totals/secondary-label parity proven, SQL-equivalent executor remains absent | `[~]` bounded |
| Talent UI role-play                  | Real UI/Inertia/backend-consequence assertions and post-assertion evidence helper written; canonical cursor/secondary contract is an explicit RED              | `[~]`         |
| Browser execution                    | Playwright server boot blocked by malformed imports in unrelated relocation wave; no screenshot pass claimed                                                   | `[~]`         |

## 24. Observability sampling and production sink bounded slice (2026-08-09)

| Evidence slice         | Fresh evidence                                                                                                                             | Status                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| Sampling policy        | Failure/timeout always emit; success/degraded deterministic bounded sampling; invalid rates/random values rejected                         | `[x]` bounded               |
| Safe logger payload    | Explicit allowlist retains hash/correlation/version/result/status metadata and excludes criteria/cursor/provider payloads                  | `[x]` bounded               |
| Production composition | Shared sink injected into admin, task-discovery, and talent-discovery `ExecuteFilterQuery` compositions                                    | `[x]` bounded static wiring |
| Targeted verification  | Combined observability unit suite `13/13`; targeted ESLint, Prettier, and diff check pass                                                  | `[x]`                       |
| WP-26A aggregate       | Real composed integration/log fixture, audit join, lifecycle version population, full schema hardening, and release evidence remain absent | `[~]`                       |

## 25. Saved-view serial verification audit (2026-08-09)

| Evidence slice                   | Fresh evidence                                                                                                                                                              | Status                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| HTTP contract                    | Isolated saved-view contract suite passes `10/10`                                                                                                                           | `[x]` bounded          |
| Persistence/mutation integration | Serial saved-view integration package passes `12/12`, including security and grant/mutation cases                                                                           | `[x]` bounded          |
| Parallel-run diagnosis           | Initial parallel invocation caused shared DB/server cleanup contamination; failure was reproduced as non-production harness interference and excluded from closure evidence | `[x]` audit correction |
| WP-18 aggregate                  | Browser/clean-session journeys, complete idempotency/mutation matrix, audit/screenshot/release joins remain absent                                                          | `[~]`                  |

## 26. SQL pilot serial verification audit (2026-08-09)

| Evidence slice           | Fresh evidence                                                                                                                   | Status        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Domain context/compiler  | Context unit `4/4`; SQL compiler unit `5/5`; hidden payload and identifier/binding constraints covered                           | `[x]` bounded |
| PostgreSQL executor      | Integration `4/4`: exact totals/facets, fields/date/ties, redaction non-recovery, fail-closed authorization                      | `[x]` bounded |
| Differential/conformance | SQL/reference differential `4/4`; capability/authorization contract `2/2`                                                        | `[x]` bounded |
| WP-10 aggregate          | Shared conformance capability mismatch, browser/AX/visual and release evidence remain open; legacy route intentionally untouched | `[~]`         |

## 27. Shared filter UI serial verification audit (2026-08-09)

| Evidence slice        | Fresh evidence                                                                                                                        | Status        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Shared frontend suite | Vitest `14/14` files and `77/77` tests with one worker                                                                                | `[x]` bounded |
| Covered behavior      | State/reactivity, URL/navigation, primitives/drawer, accessibility assertions, expression builder, alerts and saved-view client/state | `[x]` bounded |
| Cross-layer closure   | Browser keyboard/screen-reader/mobile focus/live-region sequence, visual review and shell integration remain open                     | `[~]`         |

## 28. WP-11A / WP-16-UI-A bounded semantic verification (2026-08-09)

| Evidence slice                | Fresh evidence                                                                                                                                                                 | Status        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| TDD RED                       | Full seven-case batch written first; after correcting one locator-only test defect, `6/7` passed and the remaining failure was the missing Search Center no-result live region | `[x]` audit   |
| Shared keyboard contract      | Arrow/Home/End/Enter/Escape on the facet combobox; combobox/listbox relationship; drawer Escape, async Apply and focus restoration                                             | `[x]` bounded |
| Live-region contract          | FilterSummary loading → partial → error remains one polite status; Search Center no-result now exposes one polite atomic status                                                | `[x]` bounded |
| Search Center state/cursor    | `aria-pressed` filter state, filter navigation, opaque next cursor URL and keyboard-operable button semantics                                                                  | `[x]` bounded |
| Targeted regression           | `9 files / 47 tests` GREEN; no Adonis boot and no full suite                                                                                                                   | `[x]`         |
| Static checks                 | Targeted ESLint and `git diff --check` GREEN; TypeScript Prettier GREEN, Svelte Prettier unavailable because parser/plugin is missing                                          | `[~]` tooling |
| Aggregate WP-11/WP-16 closure | Browser Tab/AT/axe, mobile/zoom/RTL/visual, cancellation/order, cross-shell and release evidence remain absent                                                                 | `[~]`         |

## 29. Current cross-layer and release audit (2026-08-09)

| Evidence slice                 | Fresh evidence                                                                                                                            | Status        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| WP-11A/WP-16-UI-A bounded wave | TDD batch `7/7`; combined targeted frontend regression `9 files / 47 tests`; targeted ESLint and diff check pass                          | `[x]` bounded |
| Browser role-play              | Server booted; `3/4` marketplace/Search Center journeys passed; one failed during seed setup, before UI assertions                        | `[~]` blocker |
| Relocation dependency health   | Seven stale organization import paths plus unresolved `move_task_to_sprint_command.js` dependency remain in shared relocation worktree    | `[~]`         |
| WP-26F release gate            | Legacy JSON inputs are `manifest_invalid`; complete manifest, artifact joins, owner/closure record and approved hash re-freeze are absent | `[ ]`         |
| WP-26E / release registry      | Validator implementation exists, but browser/audit/reviewer/screenshot/artifact joins are absent                                          | `[~]`         |
| WP-11 / WP-16 aggregate        | Browser AX/AT/axe, mobile/zoom/RTL, visual, cancellation/order, cross-shell and release evidence remain open                              | `[~]`         |

## 30. Taxonomy revision and real role-play recovery slice (2026-08-09)

| Evidence slice           | Fresh evidence                                                                                                                                                  | Status        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Skills taxonomy revision | Reader regression integration `5/5`; skills registry uses `category_fingerprint` and task namespaces use `source_fingerprint` through one explicit alias        | `[x]` bounded |
| Marketplace seed         | Focused testing-route safety package `4/4`, including `withApplication: false` marketplace seed and real task reindex                                           | `[x]` bounded |
| Search Center q-only     | Chromium role-play `1/1`, seeded result rendered through the visible Search Center journey                                                                      | `[x]` bounded |
| Mobile drawer overflow   | Browser role-play isolated case `1/1` after width/min-size fix                                                                                                  | `[x]` bounded |
| Mobile Apply path        | Combined run exposes a global error toast intercepting Apply; direct `difficulty=easy` server contract added, stable execution pending relocation import health | `[~]`         |
| WP-11 / WP-16 aggregate  | AX/AT/axe, full visual/mobile/zoom/RTL, cross-shell, cancellation/order and release joins remain open                                                           | `[~]`         |

## 31. Browser role-play correction and release audit refresh (2026-08-09)

| Evidence slice           | Fresh evidence                                                                                                                      | Status        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Focused browser batch    | Marketplace keyword, mobile staged Apply/Cancel, browser Back and Search Center q-only pass serially `4/4`                          | `[x]`         |
| Anonymous toast handling | Expected authentication toast is dismissed before Apply; no `force` click; final URL still proves server-rendered `difficulty=easy` | `[x]` bounded |
| Backend/runtime support  | Taxonomy reader `5/5`, marketplace seed safety `4/4`, combined backend batch `42/42` including marketplace route file `33/33`, `node ace list` pass | `[x]` bounded |
| WP-11 / WP-16 aggregate  | AX/AT/axe, visual, zoom/RTL, cross-shell, race and release joins remain open                                                        | `[~]`         |
| WP-26E                   | Validator `16/16`, but manifest/artifact-owner/closure/reviewer joins and required accessibility/visual evidence remain incomplete  | `[~]`         |
| WP-26F                   | Legacy JSON manifests remain `manifest_invalid`; approved machine-readable closure and hash re-freeze absent                        | `[ ]`         |

## 32. Real filter observability runtime fixture (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| HTTP → PostgreSQL → logger | Authenticated `/api/v1/filter/query` success and failure through the real composition; integration `2/2` | `[x]` bounded |
| Log safety | Event schema/name/level/hash checked; criteria, provider DSL, result body and raw failure values absent; diagnostics redacted | `[x]` |
| Existing observability regression | Logger sink + ExecuteFilterQuery observability unit files pass `6/6`; targeted ESLint and diff check pass | `[x]` |
| WP-26A aggregate | Version/trace propagation, audit persistence/join, operational retention/review and release ownership remain open | `[~]` |

## 33. Saved-view capability gating correction (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Capability RED/GREEN | Shared menu test initially failed with an alert action rendered for `alerts: false`; capability-gated implementation now hides Alert and Share | `[x]` |
| Admin Audit consumer | Admin Audit passes `sharedViews: false` and `alerts: false`; view-level `canShare` is also enforced | `[x]` bounded |
| Targeted regression | Alert/menu + Admin Audit component suites `10/10`; saved-view client/state `5/5`; ESLint and diff check pass | `[x]` |
| WP-18 aggregate | Browser save/list/select/apply, presentation, conflict/repair, clean-session and release joins remain open | `[~]` |

## 34. Admin Audit saved-view context alignment (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Context RED/GREEN | Focused component test caught `admin.audit_logs` being sent to the API; page now uses canonical `audit.admin.investigation` for criteria and listing | `[x]` |
| Capability-safe UI | Admin Audit disables shared views/alerts; view-level `canShare` is enforced | `[x]` bounded |
| Targeted regression | Admin Audit + alert/capability + saved-view client/state suites `16/16`; ESLint and diff check pass | `[x]` |
| WP-18 aggregate | Browser persistence/apply, presentation, conflict/repair, clean-session and release joins remain open | `[~]` |

## 35. Release and browser closure audit refresh (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Validator behavior | Focused validator suite `17/17` | `[x]` bounded |
| Current release manifest | No valid machine-readable manifest; both legacy JSON inputs remain `manifest_invalid` | `[ ]` |
| Artifact/closure joins | No real closure IDs, artifact owners, backend/audit joins, screenshot provenance, reviewer sign-offs or approved hash handoff | `[ ]` |
| WP-27A | Dedicated route/composition registration and clean/upgrade migration rehearsal evidence absent | `[ ]` |
| WP-18 browser closure | Capability/context fixes verified in UI suites, but browser persistence/presentation/conflict/repair evidence absent | `[~]` |

## 36. WP-27A route registration bounded slice (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Filter context route | Anonymous denial plus authorized canonical Admin context definition/execution profile | `[x]` bounded |
| Saved-view route | Anonymous denial plus authorized listing under `audit.admin.investigation` | `[x]` bounded |
| Filter/Search route boundary | Admin Filter query reaches PostgreSQL executor; malformed Search Discovery reaches controller boundary | `[x]` bounded |
| Targeted verification | `tests/integration/filter_search_route_registration.spec.ts` passes `4/4`; ESLint and diff check pass | `[x]` |
| WP-27A aggregate | Full composition/shell/flag/migration/i18n/RP smoke and release handoff remain open | `[~]` |

## 37. WP-24C organization Talent context bounded slice (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Context authorization | `talents.discovery.organization` accepts only tenant-bound `org_owner`/`org_admin` principals; `org_member` and public-authenticated principals remain denied | `[x]` bounded |
| Privacy permission | Organization context keeps mandatory active/searchable constraints, fail-closed unknown handling, and a distinct authorization version | `[x]` |
| Indexed application | Elasticsearch integration proves organization principal, exact total, facet, opaque cursor, and no private/inactive/non-searchable leakage | `[x]` |
| Targeted verification | Pre-tightening context/permission unit `9/9` and Talent application integration `6/6`; owner/admin-only rerun is blocked by concurrent relocation imports; targeted ESLint and `git diff --check` pass | `[~]` |
| WP-24C aggregate | Legacy `/org/talents` SQL offset controller/UI, seed reindex, HTTP/Inertia mapper, component/browser privacy/fairness role-play and release joins remain open | `[~]` |

## 38. WP-24C canonical Talent pre-wiring mapper slice (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Supported mapping | Unit contract covers text, multi-value taxonomy fields, numeric thresholds, explicit sort, facets and opaque cursor | `[x]` bounded |
| Unsupported legacy controls | `task_id`, skill categories, role/domain tags, saved state, name sort and offset-only page fail explicitly | `[x]` |
| Server principal boundary | Adapter passes the HTTP execution context unchanged and rejects anonymous, org member and missing-org actors before Search API invocation | `[x]` |
| Targeted verification | Prior mapper/adapter unit batch `5/5`; current direct mapper/adapter smoke imports, targeted ESLint and diff check pass; exact Japa rerun is blocked by concurrent relocation import | `[~]` |
| WP-24C aggregate | Controller/composition/UI/seed migration, HTTP Talent session proof, Inertia cursor contract, component/browser privacy/fairness and release joins remain open | `[~]` |

## 39. Search Discovery Filter error boundary correction (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Unauthorized context mapping | `FilterContextResolutionError` and `FILTER_CONTEXT_UNAVAILABLE` now use the shared filter HTTP boundary and return status `401` | `[x]` bounded |
| Regression coverage | Controller unit assertion added; direct controller smoke confirms code/status/retryability; targeted ESLint and diff check pass | `[~]` Japa rerun pending |
| Scope boundary | Real authenticated Talent HTTP success/denial, session resolver, Inertia/UI, seed/reindex and browser privacy remain unproven | `[~]` |

## 40. WP-24C Talent outbound seam (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Application boundary | `TalentDiscoveryReader` port and input contract added; adapter implements the port | `[x]` bounded |
| Static verification | Targeted ESLint and `git diff --check` pass for port/adapter/controller test slice | `[x]` |
| End-to-end status | Factory/controller/Inertia wiring, real Talent HTTP session tests, seed reindex, browser privacy/fairness and release joins remain absent | `[ ]` |
| WP-24C aggregate | Canonical context/index foundation and pre-wiring seam exist; `/org/talents` migration is not complete | `[~]` |

## 41. Verification boundary after relocation wave (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Direct seam smoke | Mapper/adapter smoke asserts organization context and server-context preservation | `[x]` bounded |
| Japa targeted batch | Runner fails during application boot on unrelated missing relocation imports (`skills` and Search Discovery paths) | `[~]` blocked |
| Full verification | Full test/lint/release/hash checks intentionally deferred until import topology stabilizes | `[ ]` |

## 42. WP-24C canonical Talent HTTP role matrix and executor capability fix (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Composition defect | Added missing Talent executor text fields; authenticated route no longer returns capability mismatch | `[x]` |
| Real HTTP role matrix | Owner/admin success; member, anonymous and missing-organization denial through session/org resolver | `[x]` bounded |
| Layered verification | Talent application integration `6/6` plus HTTP role matrix `3/3` = `9/9`; targeted lint/diff pass | `[x]` |
| WP-24C aggregate | Canonical HTTP foundation is stronger, but `/org/talents` Inertia/factory/UI/seed/browser/release migration remains open | `[~]` |

## 43. WP-24C layered seam verification refresh (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Unit layer | Request builder + reader adapter + controller/error boundary `9/9` | `[x]` |
| Integration layer | Canonical Talent application + real HTTP role matrix `9/9` | `[x]` |
| Feature closure | `/org/talents` factory/controller/Inertia/UI/browser/seed/release joins remain unproven | `[~]` |

## 44. WP-24C `/org/talents` canonical server and cursor UI slice (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Server query contract | Canonical page query unit `1/1`; unsupported legacy controls are not forwarded; hit/facet/search/authority/cursor mapping asserted | `[x]` |
| Factory/controller/Inertia | Real `/org/talents` Inertia integration `4/4`; owner/admin success and unauthorized role matrix included | `[x]` bounded |
| Component contract | Talent UI tests `14/14`; cursor/offset compatibility and canonical submit path covered; `svelte-check` 0/0 | `[x]` bounded |
| Sort capability | Context unit `4/4`; trust/completed sort capability now matches canonical mapper and executor | `[x]` |
| Browser/release closure | Playwright web server startup failed because configured `pnpm start` resolves to missing `bin/server.js`; seed/reindex, browser privacy/fairness, AX/visual and release joins remain absent | `[~]` |
| WP-24C aggregate | Canonical route/server/UI slice is substantially implemented, but browser/seed/release closure is not complete | `[~]` |

## 45. Current verification topology correction (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Current UI/static check | Talent component `14/14`, targeted lint/diff pass, `svelte-check` `0/0` | `[x]` bounded |
| Current backend rerun | Boot blocked by relocation import `admin_search_projection_controller.js` before Talent setup | `[~]` blocked |
| Completion gate | Full backend/browser/release/hash/reviewer closure not run and not claimed | `[ ]` |

## 46. Verification refresh: topology repair and seed reindex (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Admin controller recovery | Focused unit contract `7/7`; self-referential relocation proxy replaced by the controller boundary | `[x]` bounded |
| Server runner | `pnpm start` bounded boot reached the HTTP server on port 3333 via `bin/server.ts` | `[x]` bounded |
| E2E seed/index readiness | Seed route now reindexes the created Talent after persistence | `[x]` implementation; runtime proof pending |
| Browser role-play | Prior complete run failed on unmapped Talent index; post-change rerun did not emit a final reporter result | `[~]` |
| Final gate | Full backend/lint/browser/release/hash/reviewer checks remain pending | `[ ]` |

## 49. Boot repair continuation: Saved Filter repository is not loadable (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Relocation repair progress | Focused runner passed several previously missing paths and implementations | `[~]` |
| Saved Filter repository | Both canonical/compatibility files are proxy remnants; no concrete implementation is loadable | `[ ]` |
| Inertia/Talent verification | Deferred until application boot and filtering composition are valid | `[ ]` |

## 50. Boot audit refinement: Saved Filter authorization export is missing (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Application module instantiation | Runner reaches provider/module instantiation after earlier relocation fixes | `[~]` |
| Saved Filter authorization/repository | Canonical paths expose proxy-only exports; required concrete classes are absent | `[ ]` |
| Filtering/Inertia verification | Still deferred; no green claim made | `[ ]` |

## 47. Fresh audit: Inertia projection failure and relocation build health (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| E2E index readiness | Test-owned Talent reset/reindex leaves required mappings; browser reaches the rendered directory | `[x]` bounded |
| Search HTTP role boundary | Owner/admin success and member/anonymous denial cases pass `3/3` in the focused role matrix | `[x]` bounded |
| Inertia canonical page | Unfiltered and taxonomy-filtered `/org/talents` requests return `500` in focused integration | `[ ]` |
| Browser role-play | Initial page renders, but filter navigation returns `500`; no browser pass claimed | `[~]` |
| Test contract alignment | Role-play now seeds independently and expects canonical cursor/authority metadata | `[x]` implementation; runtime pending |
| Build/topology | Normal `pnpm build` fails on relocation imports; ignore-errors build is diagnostic only | `[ ]` |
| Aggregate closure | Taxonomy namespaces, AX/visual, release artifacts, hash/reviewer joins and full checks remain open | `[ ]` |

## 48. Boot repair continuation (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Focused runner progress | Runner advances through multiple relocation blockers but stops on the user composition shim before test setup | `[~]` |
| Inertia/Talent behavior | No new behavior result is claimed while application boot is incomplete | `[ ]` |
| Final gate | Full backend/lint/browser/release/hash/reviewer checks remain pending | `[ ]` |

## 51. Corrective verification: Talent route and browser contract (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Saved Filter dependencies | Domain `11/11`, alert authorization `1/1`, security integration `4/4` | `[x]` bounded |
| Talent request builder | Single-condition canonical filter regression unit `4/4` | `[x]` |
| Real HTTP/Inertia role matrix | Owner/admin success; member/anonymous denial; cursor and taxonomy filter contracts `5/5` | `[x]` bounded |
| Browser roleplay | Chromium visible filter consequence + cursor/secondary metadata `2/2` | `[x]` targeted |
| Seed/topology | Isolated E2E startup logs missing relocated Redis cache import from `commands/seed_data.ts` | `[~]` |
| Final gate | Full backend/lint/build/release/AX-visual/hash-reviewer joins still not run | `[ ]` |

## 52. Corrective topology verification: Talent seed and browser rerun (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Seed artifact | Ignore-errors build emitted the current `cache-runtime` Redis import; stale cache path no longer appears in startup | `[x]` bounded |
| Seed concurrency | One-time Talent index reset is serialized behind a shared preparation promise | `[x]` implementation |
| Browser roleplay | Focused Chromium file rerun after the fix: `2/2` passed | `[x]` targeted |
| Production build | Normal `pnpm build` still fails on unrelated relocation/type errors | `[ ]` |
| Aggregate closure | Full matrix, AX/visual, release manifest, artifact/hash and reviewer joins remain open | `[ ]` |

## 53. Corrective verification: canonical Talent Inertia enrichment and final bounded gates (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Inertia failure diagnosis | Non-UUID fixture hit IDs were reaching the UUID-only public-accomplishment reader; enrichment now skips those IDs | `[x]` |
| Canonical Talent query | Focused unit `1/1`; recruiting Result-boundary unit `3/3` | `[x]` |
| Real HTTP/Inertia role matrix | Owner/admin/member/anonymous/org-context plus cursor and taxonomy contracts `5/5` | `[x]` bounded |
| Browser roleplay | Chromium focused file `2/2` after rebuilt artifact and serialized seed | `[x]` targeted |
| Production build | `pnpm build` completed successfully after latest source changes | `[x]` |
| Full lint | Config slice passes; backend/frontend lint still have wider relocation/style/security findings | `[ ]` |
| Release validation | Implementation and test-matrix manifests rejected as structurally invalid | `[ ]` |
| Aggregate closure | Full backend, AX/visual, release evidence, artifact/hash and reviewer joins remain open | `[ ]` |

## 54. Corrective verification: leakage metric and live saved-view authorization binding (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Exact-total leakage | Quality metric regression rejects `expected eq(1)` versus `actual eq(2)`; hidden-population contract covers the same leak | `[x]` bounded |
| Live saved-view composition | Non-member organization creation is red before binding fix and passes after binding the organization-aware authorization class | `[x]` |
| Layered correctness bundle | Quality unit `5`, leakage contract `3`, ES differential `1`, observability runtime `2`, saved-view security `5` = `16/16` | `[x]` bounded |
| Type safety | `pnpm typecheck`; `svelte-check` reports `0` errors and `0` warnings | `[x]` |
| WP-26B aggregate | Full corpus, all facet/suggestion/recovery/explanation permutations, repeated nondeterminism and side-channel evidence remain open | `[~]` |
| Release/experience closure | Full lint, valid release manifest/artifact joins, AX/visual/browser matrix and reviewer sign-off remain open | `[ ]` |

## 55. Corrective verification: alert policy type boundary (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Alert policy contract | Removed an invalid `timezone` property from the policy object; timezone remains on the command input | `[x]` |
| Alert policy tests | Focused policy suite `3/3` passes | `[x]` |
| Production build | `pnpm build` completes successfully after the type-boundary repair | `[x]` |
| Lint | Targeted lint for the corrected controller/composition/quality files passes; full lint remains red in wider unrelated scopes | `[~]` |

## 56. Corrective verification: WP-26B leakage integration and role-play evidence identity (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Real Elasticsearch permission leakage | New `search_filter_permission_leakage.spec.ts`: anonymous/org-acme hidden hit, hidden facet and exact-total checks `1/1` | `[x]` bounded |
| Role-play evidence identity | Talent role-play now records matrix-owned `RP-FST-03` instead of orphan `RP-FST-24`; Chromium rerun `2/2` | `[x]` bounded |
| WP-26B aggregate | Full frozen corpus, all required facet/suggestion/recovery/explanation permutations, repeatability and timing/count side-channel evidence remain open | `[~]` |
| RP-FST aggregate | Other required journeys, reviewer/screenshot joins and browser AX/visual matrix remain open | `[~]` |

## 57. Audit correction: relocation runtime blockers and marketplace layered rerun (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Testing-route runtime | Repaired malformed `start/routes/testing.ts`; syntax check and router compilation pass | `[x]` bounded |
| Relocated marketplace imports | Controller/Talent mapper paths corrected; targeted ESLint passes | `[x]` |
| Marketplace backend matrix | `24/33` pass after rerun; listing/filter/search/application/match-score API paths pass | `[~]` |
| Public route context | Anonymous marketplace listing now uses optional HTTP action context | `[x]` implementation |
| Marketplace page matrix | 9 page/Inertia cases still return `500`; render cause remains unverified | `[ ]` |
| Global type/build gate | `pnpm typecheck` currently fails on widespread relocation syntax errors; build not claimed | `[ ]` |

## 58. Corrective verification: marketplace, notification and Search Center runtime (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Alert command boot | Malformed command closure repaired; abort-aware wait cleanup is valid | `[x]` |
| Talent denial boundary | Member denial resolves to the expected redirect rather than `500` | `[x]` |
| Marketplace backend matrix | Layered route integration rerun passes `33/33` | `[x]` bounded |
| Marketplace browser roleplay | Chromium focused file passes `3/3` | `[x]` targeted |
| Notification API contract | Standardization contract passes `4/4`; canonical v1 JSON controller restored | `[x]` |
| UI-events telemetry | Transport conflict removed; integration passes `1/1` | `[x]` |
| Combined browser rerun | Marketplace + Search Center Chromium batch passes `4/4` | `[x]` targeted |
| Targeted lint | Changed runtime slice passes ESLint | `[x]` |
| Remaining topology debt | Separate Talent adapter unit is blocked by additional stale organization/search relocation imports during boot | `[~]` |
| Aggregate closure | Master matrix, full typecheck/lint/backend, release manifest, AX/visual, hashes and reviewer joins remain open | `[ ]` |

## 59. Corrective verification: Talent adapter boot topology (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Organization/search relocation imports | Stale mapper, repository and discovery-binding imports corrected | `[x]` bounded |
| Talent discovery reader adapter | Standalone unit passes `2/2` | `[x]` |
| Corrected topology lint | Targeted ESLint passes | `[x]` |
| Aggregate closure | Full backend/typecheck/lint, release manifest, AX/visual, artifact/hash and reviewer joins remain open | `[ ]` |

## 60. Verification checkpoint: shared filter UI and release audit (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Shared Filter UI batch | 11 Vitest files, `71/71` tests pass | `[x]` bounded |
| Accessibility semantics | Included in `filter_accessibility` and `wp11a_wp16_ui_accessibility` slices | `[x]` bounded |
| Matrix validator | Authoritative wrapper passes `17/17` | `[x]` |
| Master release matrix | 31 cases: `0 [x]`, `18 [~]`, `13 [ ]` | `[~]` |
| Release manifest | Legacy JSON remains `manifest_invalid`; approved v1 manifest absent | `[ ]` |
| Aggregate proof | Per-case role-play/visual/backend-audit/performance/resilience/reviewer joins and hash re-freeze remain open | `[ ]` |

## 61. Backend master-matrix and full-gate audit (2026-08-09)

| Gate | Fresh evidence | Status |
|---|---|---|
| Backend inventory | Filtering `44` specs (`31/4/9` unit/contract/integration), Search `72` (`56/2/14`), Taxonomy `11` (`8/0/3`) | `[~]` |
| Master `TC-FST` rows | `31` total: `18 [~]`, `13 [ ]`, `0 [x]` | `[~]` |
| Validator unit | `filter_search_matrix_validator.spec.ts` `17/17` | `[x]` bounded |
| Search quality unit | `search_filter_quality_metrics.spec.ts` `5/5` | `[x]` bounded |
| Taxonomy contract execution | Direct contract-helper invocation: `NO TESTS EXECUTED` | `[ ]` |
| Typecheck | `pnpm typecheck` exits `1` with relocation missing-module and syntax/type errors | `[ ]` |
| Build | `pnpm build` exits `1` at TypeScript compilation | `[ ]` |
| Backend lint | Backend-rest reports `64` errors; app lint did not complete green within the bounded run | `[ ]` |
| Release manifest | Legacy `docs/12-evidence/test-matrix.json` returns `manifest_invalid` | `[ ]` |
| Change scope | `gitnexus detect-changes`: `301 changed`, `120 new`, `100 deleted` | `[~]` |

## 62. Accessibility/visual/browser coverage audit (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Component accessibility | `filter_accessibility.test.ts`, Marketplace filter component tests and Search page tests: `23/23` Vitest tests pass; covers roles, labels, live regions, keyboard combobox, focus semantics, reduced-motion/RTL source contracts | `[x]` bounded |
| Chromium role-play | Four relevant spec files run together: `7/7` pass (Talent `2`, Marketplace `3`, Search Center `1`, combined Discovery `1`) | `[x]` targeted |
| Cross-browser/mobile execution | `E2E_FULL_MATRIX=true` on the same four specs runs `35` cases: `16` pass, `19` fail. Chromium has a health-check `ECONNRESET` and a mobile drawer overflow failure; Firefox repeats the drawer overflow; Mobile Chrome exposes missing Talent filter props and lost opener focus after Cancel | `[~]` |
| WebKit availability | WebKit and mobile Safari cases cannot launch because the host lacks `libavif16`/Playwright browser dependencies; no WebKit evidence exists | `[ ]` |
| Runtime axe scan | `axe-core` and `@axe-core/playwright` are not resolvable from the project; no automated axe/runtime scan is present | `[ ]` |
| Visual evidence | The role-play files call `page.screenshot`, but there is no machine-readable manifest, no reviewed baseline, no screenshot hash/reviewer join, and the current rerun leaves only `test-results/e2e-visual/filter-search-taxonomy/rp-fst-03/chromium/desktop/talent-filter-only.png`; screenshots are evidence-only, not visual regression proof | `[ ]` |
| Evidence identity correction | Talent E2E screenshot path corrected from orphan `rp-fst-24` to matrix-owned `rp-fst-03`; focused Chromium rerun `2/2`, targeted ESLint exit `0` | `[x]` bounded |
| Aggregate AX/VS/RP closure | Accessibility unit coverage is not a substitute for runtime AX; browser failures, missing WebKit, missing axe, missing manifest/baselines and missing independent visual review keep RP/VS closure open | `[ ]` |

Targeted commands and exact results:

```text
pnpm exec vitest run --config vitest.config.ts <three accessibility/filter/search files>
  => Test Files 3 passed; Tests 23 passed

PORT=3372 timeout 300s pnpm exec playwright test <four FST role-play files> --project=chromium --workers=1
  => 7 passed (47.0s)

E2E_FULL_MATRIX=true PORT=3373 timeout 420s pnpm exec playwright test <same four files> --workers=1
  => 35 total; 16 passed; 19 failed

PORT=3374 timeout 180s pnpm exec playwright test <Talent role-play> --project=chromium --workers=1
  => 2 passed (25.9s)

pnpm exec eslint <four role-play files> inertia/apps/org/tests/shared/e2e/filter_search_taxonomy_evidence.ts
  => EXIT:0
```

### Backend relocation blocker

Current backend consumers reference `#modules/search/infra/adapters/entity-search/*_search_index_repository`
and related search-discovery bindings, while corresponding repository files are absent from the
current tree. This is a real full-gate blocker, not a unit-test gap. The entire search relocation
directory is concurrently untracked/deleted, so this audit deliberately made no overlapping source
edit. It remains `[~] blocked` pending ownership handoff and a topology repair followed by affected
Search integration and composition tests.

## 63. Corrective verification: backend layered batch and controller boot (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Taxonomy timestamp semantics | Impossible `2026-02-30` validity timestamp is rejected; assignment unit `4/4` | `[x]` |
| Search telemetry controller | Missing injection decorator traced and fixed; integration `1/1` | `[x]` |
| Filter context/query controllers | Missing injection decorators traced and fixed; route registration `4/4` | `[x]` |
| Layered backend checkpoint | 21 selected files across Filter/Search/Taxonomy/routes: `117/117` pass | `[x]` bounded |
| Targeted lint | Changed controller/domain/test-runtime slice passes ESLint | `[x]` |
| Full-gate closure | Typecheck/build/lint, full relocation topology, cross-browser/mobile AX, runtime axe, visual/reviewer joins, release manifest and master cases remain open | `[ ]` |

## 64. Corrective verification: responsive filter drawer and mobile browser evidence (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Shared drawer focus | Opener restoration moved before caller-owned close updates; focused component batch `17/17` | `[x]` |
| Firefox mobile overflow | Long native options and unbounded metadata badges constrained; Marketplace Firefox `3/3` | `[x]` targeted |
| Chromium/mobile Chrome | Marketplace Chromium `3/3`, mobile Chrome `3/3` after responsive fix | `[x]` targeted |
| Talent mobile roleplay | Mobile Chrome `2/2` | `[x]` targeted |
| Targeted lint | Shared drawer, marketplace filters/card and roleplay ESLint pass | `[x]` |
| WebKit/mobile Safari | Host lacks required Playwright dependencies (`libavif16`) | `[ ]` environment blocker |
| Aggregate AX/visual closure | Runtime axe, baselines/hashes/reviewer joins, full cross-browser and release manifest remain open | `[ ]` |

## 65. Runtime axe gate and accessibility corrective fixes (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Runtime axe tooling | Direct dev dependencies added: `@axe-core/playwright`, `axe-core` | `[x]` |
| Marketplace runtime AX | Focused Chromium axe role-play; no critical/serious violations | `[x]` |
| Search Center runtime AX | Focused Chromium axe role-play; no critical/serious violations | `[x]` |
| Notification trigger semantics | Added accessible names to user/org notification dropdown triggers | `[x]` |
| Pagination contrast semantics | Removed opacity contrast loss from disabled controls; added `aria-disabled` | `[x]` |
| Focused axe/E2E batch | `2/2` passed; targeted ESLint passed | `[x]` |
| Pagination/accessibility regression batch | `13/13` Vitest tests passed | `[x]` |
| Aggregate closure | WebKit/mobile Safari, visual baseline/hash/reviewer joins, release manifest/master cases, full typecheck/build/lint remain open | `[ ]` |

## 66. Cross-browser overflow correction, relocation audit and release re-audit (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Firefox Marketplace role-play | Full file `3/3`; toast viewport overflow reproduced and fixed | `[x]` |
| Chromium Marketplace role-play | Full file `3/3` | `[x]` |
| Mobile Chrome Marketplace role-play | Full file `3/3` | `[x]` |
| Marketplace/shared UI tests | `11/11` Vitest tests passed | `[x]` |
| Runtime axe after responsive fix | Chromium `2/2` with no critical/serious violations | `[x]` |
| Relocation correction | 14 stale imports + five organization mapper shims; targeted Japa `6/6` | `[x]` bounded |
| Repository typecheck | `pnpm typecheck` still fails: `138` diagnostics across `91` files; no Filter/Search/Taxonomy diagnostics in targeted scan | `[~]` |
| Release matrix re-audit | Master `0 [x] / 18 [~] / 13 [ ]`; no row promoted; manifest/evidence joins incomplete | `[~]` |
| WebKit/mobile Safari and visual release evidence | No complete role-play/manifest/hash/ACL/reviewer evidence | `[ ]` |

## 67. Mobile Chrome visual-viewport correction (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Drawer failure diagnosis | Footer was outside the Mobile Chrome visual viewport; sort control intercepted drawer actions | `[x]` |
| Shared drawer correction | Flex column, bounded scroll body/footer and `100svh` modal sizing | `[x]` |
| Mobile Chrome staged drawer | Focused case `1/1`; full Marketplace role-play `3/3` in `23.3s` | `[x]` |
| Targeted lint | Changed shared drawer and role-play ESLint exit `0` | `[x]` |
| Full release closure | WebKit/mobile Safari, aggregate typecheck/build/full-lint, manifest, visual joins and reviewer sign-off remain absent | `[ ]` |

## 68. Taxonomy backend corpus execution (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Taxonomy test discovery | All configured taxonomy backend `*.spec.ts` files selected with Japa `--files` | `[x]` |
| Taxonomy unit/contract layers | Provider conformance, assignment, term, migration, mapper and governance suites included | `[x]` |
| Taxonomy integration layers | Version reader, governance API authorization and migration repository included | `[x]` |
| Aggregate execution | `42/42` tests passed in one batch | `[x]` bounded |
| Full product/release closure | Search adoption, Filter namespace projections, WebKit/mobile Safari, type/build/lint, manifest and reviewer joins remain open | `[ ]` |

## 69. Filter backend corpus execution (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Filter test discovery | All configured Filter backend `*.spec.ts` files selected with Japa `--files` | `[x]` |
| Filter unit layer | Kernel, validation, authorization, observability, alerts and saved-view units executed | `[x]` |
| Filter contract layer | Reference/fake SQL/fake search conformance, leakage and saved-view API contracts executed | `[x]` |
| Filter integration layer | Runtime, permissions, alerts, saved views and taxonomy coordination executed | `[x]` |
| Aggregate execution | `227/227` tests passed in one batch | `[x]` bounded |
| Full product/release closure | Search corpus/adoption, browser matrix, type/build/lint, manifest and reviewer joins remain open | `[ ]` |

## 70. Search backend corpus and compatibility route correction (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Failure discovery | Initial complete batch `265/266`; compatibility `POST /api/search/query` returned `404` | `[x]` audit |
| Compatibility route | Added authenticated `/api` compatibility alias to canonical Search Discovery controller | `[x]` |
| Search HTTP integration | Targeted file `9/9` passed after route repair | `[x]` |
| Search unit/contract/integration corpus | Complete configured Search backend batch `266/266` passed | `[x]` bounded |
| Full product/release closure | Cross-domain adoption, browser/WebKit, type/build/lint, manifest and reviewer joins remain open | `[ ]` |

## 71. Aggregate backend and repository gate recheck (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Taxonomy corpus | `42/42` unit/conformance/integration tests passed | `[x]` bounded |
| Filter corpus | `227/227` unit/contract/integration tests passed | `[x]` bounded |
| Search corpus | `266/266` unit/contract/integration tests passed after compatibility route repair | `[x]` bounded |
| Type safety | `pnpm typecheck` pass; Svelte `0 errors / 0 warnings` | `[x]` |
| Production build | `pnpm build` pass | `[x]` |
| Targeted lint | Changed route/drawer/role-play files pass ESLint | `[x]` |
| Full lint | Aggregate command fails in broad relocation/legacy scopes; config slice passes | `[~]` |
| Browser/release closure | WebKit/mobile Safari blocked by `libavif16`; required roleplays, manifest, hashes/ACL and reviewer joins absent | `[ ]` |

## 72. Chromium role-play checkpoint after aggregate repairs (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Implemented Chromium role-play corpus | Talent `2`, Marketplace `3`, Search Center `1`, combined Search Discovery `1` | `[x]` |
| Aggregate browser result | `7/7` passed in one Chromium batch | `[x]` bounded |
| Required journey coverage | RP-FST-03..12 and related saved-view/audit/taxonomy/alert/projection/builder paths are not implemented as release journeys | `[ ]` |
| Release evidence closure | No valid manifest, screenshot bundle/hash/ACL/backend-audit joins or reviewer sign-off | `[ ]` |

## 73. Additional mobile-state and Search recovery role-play slices (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| RP-FST-05 committed/mobile state | New role-play passes Chromium `1/1` and Mobile Chrome `1/1`; covers dirty draft, Back, Cancel, focus and URL rehydration | `[~]` |
| RP-FST-05 degraded/offline path | Explicit evidence-gap annotation; no approved real fault-control exists, no network mocking used | `[ ]` |
| RP-FST-09 healthy/recovery path | New Chromium role-play passes healthy totals/facets, tampered cursor and fresh recovery | `[~]` bounded |
| RP-FST-09 degradation path | Explicitly skipped pending an approved Elasticsearch fault/clock-control service | `[ ]` |
| New role-play lint | Targeted ESLint exit `0` | `[x]` |
| Remaining release closure | Required joins, screenshot/hash/ACL/reviewer evidence and WebKit/Safari remain open | `[ ]` |

## 74. RP-FST-03/06/07 completion audit (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| RP-FST-03 existing Talent journey | Chromium `2/2` pass | `[~]` |
| RP-FST-03 missing required semantics | No multi-skill/proficiency/secondary facet/privacy fixture/cursor traversal closure | `[ ]` |
| RP-FST-06 Saved View | Existing UI/client tests `12/12`; no valid browser journey | `[ ]` blocked |
| RP-FST-06 blocker | Share grant targets and conflict recovery are not represented in UI | `[ ]` |
| RP-FST-07 Taxonomy governance | Admin UI tests `4/4`; governance integration `5/5`; no valid browser journey | `[ ]` blocked |
| RP-FST-07 blocker | Replacement mapping/owner repair/resume-alert UI chain is missing | `[ ]` |

## 70. Direct compiler/build verification after transient probe cleanup (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Exact repository typecheck | `pnpm typecheck`: TypeScript and Svelte checks pass; Svelte reports `0 errors / 0 warnings` | `[x]` |
| Production build | `pnpm build`: Vite assets, TypeScript compilation and production output completed successfully | `[x]` |
| Transient diagnostic audit | Temporary architecture-test probe caused the earlier isolated TS diagnostic; it was removed by test cleanup and was not in the scoped platform | `[x]` bounded |
| Targeted layered backend batch | Eight scoped Filter/Search/Taxonomy spec files: `79/79` pass | `[x]` bounded |
| GitNexus change scope | `gitnexus detect-changes`: `148 changed`, `28 new`, `4 deleted`; no commit performed | `[~]` |
| Remaining release closure | Full lint, browser/WebKit, runtime/release artifact joins, reviewer sign-off and master cases remain incomplete | `[ ]` |

## 75. RP-FST-06/07 capability implementation and layered verification (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Saved-view share target contract | Client sends organization/team scope IDs; UI requires an explicit target and blocks ambiguous team scope | `[x]` bounded |
| Saved-view conflict recovery | State reloads latest lock version, then offers explicit reapply; component/state coverage included | `[x]` bounded |
| Taxonomy owner repair mapping | Repair dialog extracts taxonomy terms, requires replacement mapping, rewrites nested criteria and revalidates | `[x]` bounded |
| Paused-alert resume | Resume CTA is separate and available only after repair; backend contract confirms repair-before-resume | `[x]` bounded |
| Layered targeted tests | Shared UI/client `18/18`; saved-view HTTP contract `10/10` | `[x]` bounded |
| Type/build/lint | `pnpm typecheck` pass (`0` Svelte errors/warnings), `pnpm build` pass, targeted ESLint pass | `[x]` |
| RP-FST-06/07 browser closure | No approved end-to-end browser role-play or release evidence joins yet | `[~]` |
| Full release closure | Full lint, WebKit/Safari, manifest, screenshot/hash/ACL, reviewer sign-off and master cases remain open | `[ ]` |

## 76. Multiagent RP-FST-06/07 and Search saved-view verification (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Search blended context provider | Unit `2/2`; authenticated private saved-view contract `2/2` | `[x]` bounded |
| Saved-view/alert backend verification | Unit/integration assertions `27/27`; HTTP contract `12/12` | `[x]` bounded |
| RP-FST-07 stale taxonomy governance | Isolated Chromium `1/1`; real admin UI/API returns `409 stale_taxonomy_migration_plan` | `[~]` |
| RP-FST-06 browser helper repair | Idempotent menu helper fix applied after Duplicate-menu state bug | `[~]` |
| RP-FST-06 browser execution | Rerun affected by shared seed/database contention from a concurrent integration batch; no pass claimed | `[ ]` |
| RP-FST-07 full owner journey | Owner mapping → repair/revalidate → paused-alert resume fixture still absent | `[ ]` |
| Release closure | Full RP rows, WebKit/Safari, valid manifest, visual/hash/ACL joins and reviewer sign-off remain open | `[ ]` |

## 77. RP-FST-06 isolated browser and Search contract correction (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| RP-FST-06 Search Center browser slice | Isolated Chromium `1/1`; real save, pin, default, duplicate and unsupported-sharing affordance checks | `[~]` |
| RP-FST-06 seed/login correction | Reused existing Search seed/login path after task-submission seed exposed an organization lookup race | `[x]` bounded |
| Search saved-view HTTP contract | `2/2` after authenticating before applying `qs`; both private list and unsupported capability paths covered | `[x]` bounded |
| RP-FST-06 required sharing/conflict/revoke | Organization/team share, clean-session read-only, optimistic conflict and permission revoke remain unproved | `[ ]` |
| Broad integration checkpoint | `1304 passed, 11 failed, 38 skipped`; failures are Reviews/evidence scopes outside this platform | `[~]` audit |
| RP-FST-07 stale split boundary | Independent Chromium `1/1` on port `3354`; live API rejects stale revision | `[~]` |
| Release closure | Full RP joins, WebKit/Safari, manifest, visual/hash/ACL and reviewer sign-off remain open | `[ ]` |

## 78. Repository gate audit after role-play verification (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Scoped frontend verification | Saved-view/alert/repair batch `18/18`; targeted ESLint pass; `git diff --check` pass | `[x]` bounded |
| Search saved-view contract | `2/2` pass after auth/query-order correction | `[x]` bounded |
| Browser role-play slices | RP-FST-06 Chromium `1/1`; RP-FST-07 Chromium `1/1` | `[~]` |
| Full typecheck | Fails first at unrelated auth landing controller line 31 (`Promise<void>` vs Inertia render result) | `[ ]` |
| Full build/lint/release | Cannot claim while repository typecheck/full-lint/manifest/visual/reviewer gates remain open | `[ ]` |

## 79. Canonical multi-namespace task metadata projection (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Reader namespace request | Production reader requests all five canonical namespaces | `[x]` |
| Canonical projection | Term IDs/count, namespace partitions, completeness and provider provenance are preserved | `[x]` |
| Strict Search mapping/bindings | Additive fields declared and canonical term IDs exposed to Discovery hit mapping | `[x]` bounded |
| Layered backend verification | Projection/document/mapping/binding units `12/12`; Search Discovery + reader integration `21/21` | `[x]` bounded |
| TypeScript verification | `pnpm typecheck`: TypeScript pass; `svelte-check` `0 errors / 0 warnings` | `[x]` |
| Authoritative taxonomy registry | Production fails closed without revision rows; release-populated registry/generation not independently proven | `[~]` |
| Namespace-specific Search semantics | Flat canonical filtering covered; namespace-specific facets/query path lacks end-to-end index evidence | `[~]` |
| Release/browser closure | RP gaps, WebKit/Safari, manifest, visual/hash/ACL and reviewer joins remain absent | `[ ]` |

## 80. Canonical namespace context and Talent multi-skill semantics (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Task canonical semantic field | `taxonomy.canonicalTerms` is present in the context and compatible with the strict binding | `[x]` |
| Task canonical Search behavior | Real Elasticsearch filter + self-excluding facet case passes; Search Discovery integration `10/10` | `[x]` bounded |
| Talent request semantics | Multiple selected skill IDs emit `contains_all`; single taxonomy fields retain `contains_any` | `[x]` |
| Talent UI | Native multi-select submits all selected skills; component suite `15/15` | `[x]` bounded |
| Talent backend cross-match protection | Elasticsearch integration returns only the talent containing both skills; `7/7` suite passes | `[x]` bounded |
| Type/lint | Targeted ESLint and `pnpm typecheck`; Svelte `0 errors / 0 warnings` | `[x]` |
| RP-FST-03 full journey | Proficiency, secondary facets, privacy/disputed seed, deterministic cursor and fresh two-skill browser proof absent | `[~]` |
| Broader Search adoption | Talent canonical provenance projection and blended structured context remain incomplete | `[~]` |
| Release closure | Manifest, visual/hash/ACL/reviewer joins, WebKit/Safari and full-lint debt remain open | `[ ]` |

## 83. Talent canonical projection and blended-context audit (2026-08-09)

| Evidence slice | Audit result | Status |
|---|---|---|
| Talent raw projection wiring | Reader → builder → projection → index → executor traced; raw skills/accomplishments are present | `[x]` bounded |
| Talent skill canonical metadata | Category/ancestor/alias/version/provenance are dropped before the Search contract | `[~]` |
| Non-skill Talent taxonomy | Values come from accomplishment fields without provider-backed canonical version/provenance | `[~]` |
| Blended Search | Structured fields/facets/totals remain explicitly unsupported and fail closed | `[x]` safety boundary |
| Complete Talent canonical slice | Provider-backed projection, composition integration and canonical HTTP facet evidence absent | `[ ]` |

## 84. Talent skill-only canonical projection slice (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Authoritative skill source | Talent composition injects `LucidSkillTaxonomyCatalogReader`; unresolved assignments remain unknown | `[x]` bounded |
| Canonical Talent document | IDs, category refs, reviewed aliases, taxonomy versions and assignment metadata are additive and strict-mapped | `[x]` bounded |
| Builder unit | Canonical projection test `3/3`, including separation from display labels | `[x]` |
| Discovery binding unit | Allowlisted canonical hit fields and strict mapping coverage `3/3` | `[x]` |
| Type/lint | Targeted ESLint; `pnpm typecheck`; Svelte `0 errors / 0 warnings` | `[x]` |
| Real integration | Canonical filter case added; reader→builder→Elasticsearch seam still absent, and safety guard blocked execution because test ES endpoint is not physically isolated from development | `[~]` |
| Remaining closure | Proficiency/availability, privacy/dispute/cursor browser evidence, blended structured context, release manifest/artifacts, reviewer and WebKit/Safari remain open | `[ ]` |

## 85. Talent availability projection and date filtering (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Source-to-index availability | `profile_settings.available_from` is preserved as `available_from` with strict date mapping | `[x]` bounded |
| Discovery contract | `talent.availableFrom` is date-filterable/facetable and allowlisted in the hit document | `[x]` bounded |
| Request/UI round trip | `available_before` is parsed, validated, emitted as `before`, and retained by the organization UI | `[x]` bounded |
| Layered tests | Builder `4/4`; binding `3/3`; context `4/4`; request builder `4/4`; mapper `2/2`; UI `15/15` | `[x]` |
| Real Elasticsearch integration | Date-filter fixture exists, but datastore safety guard blocks execution with non-isolated test endpoint | `[~]` |
| Remaining Talent semantics | Proficiency, dispute/privacy population, saved state, complete cursor browser evidence and release joins remain open | `[ ]` |

## 86. Talent same-object proficiency filtering (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Nested evidence projection | `skill_evidence` retains skill ID, proficiency code/order, source and review state on one object | `[x]` bounded |
| Relation-aware filter contract | `talent.skillEvidence` exposes nested bindings and accepts `related_matches` | `[x]` |
| Request/UI behavior | `min_proficiency` is mapped, emitted and retained through cursor page-query state | `[x]` |
| Layered backend verification | Builder `5/5`; validator `15/15`; executor `13/13`; request builder `4/4`; page query `2/2`; bindings `3/3`; context `4/4` | `[x]` |
| Elasticsearch semantics | Talent Discovery integration `10/10`, including same-skill minimum proficiency, privacy, facets and stale cursor cases | `[x]` bounded |
| Search regression | Search Discovery integration `10/10` | `[x]` bounded |
| UI/type/lint | UI `15/15`; `pnpm typecheck`; targeted ESLint; `git diff --check` | `[x]` |
| Production composition | Persisted reader → builder → projection evidence for proficiency is not independently exercised | `[~]` |
| Browser/release closure | Fresh browser proficiency/availability journey, WebKit/Safari, full lint, manifest/artifact/hash/ACL and reviewer joins remain absent | `[ ]` |

## 87. Persisted Talent composition and production Discovery (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Reader boundary audit | Found/fixed proficiency fields being dropped after normalization in the persisted reader mapping | `[x]` |
| Persisted reader → builder → index | Real User/Skill/UserSkill/profile-settings rows produce nested reviewed proficiency evidence and `available_from` | `[x]` bounded |
| Production composition | Real taxonomy reader is composed for the persisted document build | `[x]` bounded |
| Production reindex/discover | `searchPublicApi.resetTalentIndex()` + two real reindexes + `discover()` returns only the strong persisted talent against a cross-match decoy | `[x]` bounded |
| Availability response | Production Discovery hit maps `availableFrom` from persisted profile settings | `[x]` bounded |
| Canonical taxonomy persistence | No release-populated taxonomy term row is asserted in this slice; canonical IDs/categories remain unproven here | `[~]` |
| Browser RP-FST-03 | Persisted browser decoy/privacy/proficiency/availability/facet/cursor journey remains absent | `[~]` |
| Release closure | Full lint, WebKit/Safari, manifest/artifact/hash/ACL, retention and reviewer joins remain absent | `[ ]` |

## 88. Talent browser proficiency/availability round-trip probe (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Seed capability | `/api/testing/seed-e2e` accepts `availableFrom` and still returns two real skill IDs | `[x]` bounded |
| Visible UI | Multi-select, minimum proficiency and availability controls are visible and interactable in Chromium snapshot | `[x]` bounded |
| URL serialization | Browser probe retains `skill_ids`, `min_proficiency` and `available_before` in URL | `[x]` bounded |
| Inertia filter props | Reused-server run omitted `min_proficiency`/`available_before`; fresh isolated run failed earlier at testing login setup | `[~]` |
| Browser role-play | Existing cases `3/3` pass; new round-trip case is not green | `[~]` |
| Same-object/privacy/facets/cursor | No browser-level decoy, dispute/private, facet or page-2/stale-cursor evidence yet | `[ ]` |
| Release closure | WebKit/Safari, full lint, manifest/artifact/hash/ACL/retention and reviewer joins remain absent | `[ ]` |

## 81. Release manifest audit after multi-skill implementation (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Legacy manifest validation | `test-matrix.json` and `implementation-plan.json` both fail the v1 manifest schema | `[x]` audit |
| Validator behavior | Authoritative matrix-validator unit suite passes `17/17` | `[x]` bounded |
| Fixture execution | Fixture path reports `NO TESTS EXECUTED`; no evidence claim made | `[x]` audit |
| Release manifest | No valid manifest created because real artifacts/metadata/reviewer joins are absent | `[ ]` |
| Master-case status | `0 [x] / 18 [~] / 13 [ ]` remains unchanged | `[ ]` |

## 82. RP-FST-03 multi-skill browser closure slice (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Canonical page skill options | Existing directory-options provider wired; no longer hard-coded empty | `[x]` |
| Deterministic multi-skill seed | `multiSkill: true` creates two reviewed L7 skills, attaches and reindexes, returns IDs | `[x]` bounded |
| Request serialization | Browser found one-value loss; comma-separated canonical payload now preserves both IDs | `[x]` |
| RP-FST-03 Chromium | Full role-play file `3/3` passed, including two-skill UI/Inertia path | `[~]` bounded |
| UI/backend layered verification | UI `15/15`; page-query `2/2`; Talent Search integration `9/9`; typecheck/Svelte clean | `[x]` bounded |
| Full RP-FST-03 semantics | Proficiency/availability, browser cross-match decoys, privacy/dispute, and multi-page cursor remain unproved | `[~]` |
| Release closure | Manifest, artifact/hash/ACL, reviewer, WebKit/Safari and full-lint gates remain open | `[ ]` |

## 83. RP-FST-03 persisted decoy/privacy/cursor closure (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Deterministic persisted seed | Two reviewed strong matches, one proficiency decoy and one non-searchable privacy decoy are reindexed and returned by `seedTalentDiscoveryRoleplay` | `[x]` bounded |
| Same-object proficiency | Visible Talent filter plus Inertia response assert the two strong IDs and exclude the proficiency decoy | `[x]` bounded |
| Privacy exclusion | Non-searchable decoy is absent from response, total and rendered result pages | `[x]` bounded |
| Cursor traversal | `per_page=1` is preserved in the cursor link; native Older navigation returns the second strong ID without decoys | `[x]` bounded |
| Date facet boundary | Numeric Elasticsearch date bucket keys normalize to canonical ISO values; focused compiler suite `5/5` | `[x]` bounded |
| Full browser slice | Talent role-play file passes Chromium `5/5`; targeted admin/Talent Vitest passes `20/20`; scoped ESLint passes | `[x]` |
| Remaining P0 closure | Disputed/suggested data, complete facet/visual/AX/security joins, cross-session isolation, WebKit/Safari, manifest and reviewer sign-off remain open | `[~]` |

## 89. RP-FST-06 saved-view authorization and browser closure slice (2026-08-09)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Saved-view authorization/security | Backend security integration `6/6`, including approved organization sharing, stale share rejection, clean-session revoke fail-closed behavior and no criteria leakage | `[x]` bounded |
| Seed/cleanup isolation | Testing-route safety integration `5/5`; saved-view, grant, alert and migration rows are removed before dependent users/organizations | `[x]` bounded |
| Search capability wiring | Search blended context unit `2/2`, Search page-controller unit `2/2`, and authenticated saved-view HTTP contract `2/2` | `[x]` bounded |
| Read-only UI boundary | Search/alert Vitest batch `22/22`; read-only users cannot update, pin, default or delete a shared view, while duplicate remains available as a copy action | `[x]` bounded |
| RP-FST-06 browser journey | Isolated Chromium role-play `2/2`: real Search Center save/pin/default/duplicate, organization share, optimistic conflict/reapply, clean-session read-only and membership revoke | `[x]` bounded |
| Scoped static verification | Targeted ESLint exit `0`; relevant diff check passes; no add/commit/push performed | `[x]` bounded |
| Remaining release closure | WebKit/Safari, complete screenshot/hash/ACL/audit/reviewer joins, valid release manifest, full lint/typecheck/build and the broader RP-FST-06 checklist remain open | `[~]` |

## 90. RP-FST-07 governance boundary correction (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Stale taxonomy governance | The real admin UI/API role-play passes Chromium `1/1` and returns `409 stale_taxonomy_migration_plan`; no Apply action is exposed after the stale preview | `[~]` bounded |
| Test-surface integrity | Removed a speculative owner journey that opened `/org/tasks/board` while expecting a Search Center-only `Saved views menu`; it also referenced a nonexistent repair seed route | `[x]` corrective |
| Owner repair/revalidation | Isolated Chromium owner case `1/1` uses `/search?type=task`, `tasks.discovery.member`, and the token-bound test-only transition prerequisite; the browser performs the repair action | `[~]` bounded |
| Paused-alert resume | The same isolated case explicitly resumes the paused alert through the repair dialog; governed split apply and complete RES/AUD/VS joins remain open | `[~]` bounded |
| Release closure | Screenshot/hash/ACL/audit joins, WebKit/Safari, manifest, full repository gates and reviewer sign-off remain open | `[ ]` |

## Current snapshot — RP-FST-07 owner continuation (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Current master count | The 31 `TC-FST` rows currently count `0 [x] / 31 [~] / 0 [ ]`; older audit sections retain their historical snapshots | `[~]` |
| Task Search Center capability | Controller unit `2/2`; task Search Center receives `tasks.discovery.member`, `contextOwner: tasks`, shared views and alerts for the authenticated organization scope | `[x]` bounded |
| Transition fixture safety | Testing-route safety integration `8/8`; malformed input is rejected, wrong-owner alias cleanup is rejected, and the token-bound transition pauses the linked view/alert | `[x]` bounded |
| Owner browser continuation | Isolated Chromium `1/1`: real UI save → subscribe → fixture transition → repair → revalidate → resume; final API state is `current` with an active alert | `[~]` bounded |
| Combined role-play execution | The full two-test file was not promoted after a later dirty-worktree worker/DB timeout; stale-governance `1/1` and owner `1/1` were independently observed | `[~]` |
| Consumer-owned candidate/receipt slice | Reference projection discovers saved-view candidates from the persisted plan; child receipts are idempotent on `(saved_view_id, planToken, input_checksum)`; Filter/reference unit `6/6`, governance unit `9/9` including unsupported-impact fail-closed coverage, PostgreSQL coordination `2/2` including rollback/retry after a simulated worker exception, saved-view schema `8/8`, governance API `5/5`, production taxonomy/filter ESLint `0` | `[~]` bounded |
| Parent/child publication fence | `filter_taxonomy_migration_runs` persists child cursor/completed IDs, `scan_pass` and CAS state; governance checks the parent lock before child coordination, ignores client items, rejects unsupported persisted impact keys before publication, and leaves the parent unpublished for child `applying`/`requires_repair`. Durable final-rescan/repair-resume unit `6/6`, concurrent transaction-scoped PostgreSQL coordination integration `2/2`, saved-view row-lock unit `2/2`, external-mutation lock integration `1/1`, saved-view schema `8/8`, governance unit/API `9/9`/`5/5` | `[~]` bounded |
| Remaining closure | Unsupported consumers, process-kill/multi-worker crash recovery, screenshots, audit/replay, cross-browser, manifest and reviewer joins remain open | `[ ]` |

## Current snapshot — RP-FST-03 cursor/PIT lifetime alignment (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Lifetime invariant | Default Elasticsearch PIT `keep_alive` now derives from the signed cursor TTL, rounded up to whole seconds; explicit `pitKeepAlive` remains an override | `[x]` bounded |
| TDD regression | Focused executor unit `4/4`, cursor codec unit `2/2`, scoped ESLint exit `0`; RED had observed `open:1m/search:1m` against the required `300s` | `[x]` bounded |
| RP-FST-03 Chromium rerun | Isolated real-data Talent role-play file passes `5/5` in `17.1s`, including native cursor traversal after the earlier `SEARCH_CURSOR_EXPIRED` failure | `[~]` bounded |
| Remaining closure | Disputed/suggested population, visual/AX/hash/ACL, WebKit/Safari, real network/shard PIT fault, cross-session, manifest and reviewer joins remain open; master count stays `0 [x] / 31 [~] / 0 [ ]` | `[~]` |

## Current snapshot — RP-FST-04 Admin Audit browser slice (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Real seeded off-page target | Dedicated role-play seeds 50 decoys plus a target audit event outside the initial page through the real testing fixture | `[x]` bounded |
| Staged UI semantics | Chromium verifies action/actor/date criteria remain a draft before Apply; committed URL and 50-row result window stay unchanged | `[~]` bounded |
| Applied SQL investigation | Isolated Chromium RP-FST-04 passes `1/1` in `13.9s`; the visible UI returns one target row, detail preserves request/trace IDs, and the canonical API returns the same target/filter contract; scoped ESLint exits `0` | `[~]` bounded |
| Remaining closure | Canonical screenshot/hash/ACL/audit joins, full staged/responsive/AX matrix, cross-browser, manifest and reviewer evidence remain open | `[~]` |

## Current snapshot — RP-FST-09 recovery boundary (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Suite ownership | Matrix and implementation plan now point to the actual `search_degraded_recovery_roleplay.spec.ts` suite | `[x]` corrective |
| Healthy/recovery path | Chromium case covers exact totals/facets, opaque cursor tamper rejection and fresh-request recovery through the Discovery API | `[~]` bounded |
| Alias-integrity fail-closed | Chromium role-play passes through token-bound `POST /api/testing/seed-search-alias-integrity-fault-roleplay`, adding/removing a real second Elasticsearch alias backing generation; this is not network-outage/shard-failure evidence and uses no browser interception or in-process fake provider | `[~]` bounded |
| Alias-fixture safety | Controller unit `3/3` proves process-local concurrent-enable serialization, fixed-slot orphan cleanup and retention when alias update commits before the client error; route wiring is exercised by RP-FST-09 `3/3` | `[x]` bounded |
| Seed teardown | RP-FST-09 retains per-seed cleanup timestamps and calls owner-scoped `/api/testing/seed-cleanup` from `finally` in all three cases; matching alias/clock fixtures are released before row cleanup, wrong-owner alias cleanup is rejected, safety integration is `8/8`, and Chromium remains `3/3`. Multi-worker/process-crash ownership is not claimed | `[~]` bounded |
| PIT expiry/recovery | Bounded Chromium case advances the approved test clock, asserts `SEARCH_CURSOR_EXPIRED`, restores the clock and proves fresh-request recovery; no UI Next/screenshot or network PIT fault claim | `[~]` bounded |
| Degraded UI/source diagnostic | Search page fallback controller `3/3`, Search Center UI `14/14`, and task-scoped degraded browser assertion inside RP-FST-09 Chromium `3/3`; safe compatibility-mode/source-unavailable message is visible without response interception | `[~]` bounded |
| Latest-response cancellation contract | Search Center cancels the prior navigation and ignores stale cancellation callbacks; focused Vitest `16/16` includes a real Inertia/http late-response contract in which the older response cannot replace the newer page, and targeted ESLint exits `0`. Browser E2E race execution is not claimed | `[~]` bounded |
| Focused verification | Testing-route safety `8/8`, RP-FST-09 Chromium `3/3`, and targeted ESLint exit `0` | `[x]` bounded |
| Remaining RP-FST-09 closure | Browser-level late-response race, UI cursor screenshots, multi-worker/process-crash fixture cleanup, audit/visual/release joins, cross-browser evidence and real network/shard fault remain open | `[ ]` |

## Current snapshot — Talent canonical metadata round-trip (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Discovery metadata envelope | Talent binding preserves approved alias text, taxonomy versions, assignment provenance/review states and nested skill evidence while keeping the strict allowlist | `[x]` bounded |
| Search/Talent verification | Focused binding/context unit `7/7`; Discovery application plus production Talent engine integration `13/13`; targeted ESLint exit `0` | `[x]` bounded |
| Remaining Talent closure | HTTP/browser rendering, visual/AX, privacy/fairness, rebuild/cutover, cross-browser and release-manifest joins remain open | `[~]` |

## Current snapshot — release artifact result gate (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Artifact result enum | Validator rejects values outside `passed|failed|skipped` | `[x]` bounded |
| Required-case closure | Required cases reject referenced `failed`/`skipped` artifacts; deferred cases remain allowed without passed evidence | `[x]` bounded |
| Focused verification | Validator wrapper + fixture tests `43/43` (`23/23` + `20/20`); targeted ESLint exit `0`, including artifact-to-manifest `releaseId` joins, canonical artifact identities and exact required-layer mapping for test, role-play and screenshot artifacts | `[x]` bounded |
| Remaining release closure | No authoritative full manifest, per-case artifact/reviewer joins, immutable execution evidence or valid screenshot/hash bundle exists | `[ ]` |

## Current snapshot — TC-FST-024 cursor fail-closed recovery (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| Controller behavior | `SEARCH_CURSOR_INVALID`, `SEARCH_CURSOR_EXPIRED` and `SEARCH_CURSOR_STALE` render empty results with typed `discoveryFailure`; legacy fallback call count remains zero | `[x]` bounded |
| UI behavior | Search Center presents a visible cursor status, hides compatibility-mode messaging, and offers an explicit fresh search without `cursor=` | `[x]` bounded |
| Verification | Backend controller `3/3`; Search Center `18/18`; shell-aware URL suite included in `20/20`; scoped ESLint and Prettier checks pass | `[x]` bounded |
| Remaining closure | Real browser expiry/tamper journey, RP/VS/RES/SEC layers, cross-browser execution, screenshot/hash/ACL joins, manifest and reviewer sign-off remain open | `[~]` |

TC-FST-014 remains `[~]`: the shared lifecycle evidence is `26/26`, but the repository currently
has no production consumer for `FilterStateController`, so browser/Inertia wiring and legacy
flat-URL migration are not claimed.

## Current snapshot — consumer/recovery continuation (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| TC-FST-014 existing Marketplace consumer | Focused Vitest `6/6`: legacy flat-query readability, explicit history push (`replace: false`) and props rehydration without unsolicited navigation | `[~]` bounded |
| TC-FST-023 degraded Search page | Controller `4/4`, Search Center `20/20`: cursor plus source-unavailable/timeout/stale-index failures fail closed, with no legacy fallback and a cursor-free retry | `[~]` bounded |
| TC-FST-027 canonical builder rehydration | Expression/model/qualifier focused batch `8/8`; canonical `expression`/`preferences` prop changes replace local builder state | `[~]` bounded |
| RP-FST-09 UI cursor/recovery | Full Chromium role-play `5/5`; task-scoped cursor expiry and cursor-plus-unavailable-source states are visible in Search Center, and fresh retry removes `cursor` | `[~]` bounded |
| Remaining closure | Network/shard fault injection, browser race timing, cross-browser/WebKit, runtime AX, screenshot/hash/ACL/audit/reviewer joins and valid release manifest remain open | `[ ]` |

## Current snapshot — Search Center q-only and cursor navigation (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| TC-FST-002 q-only Search | New real Search Center Chromium role-play passes `1/1`; canonical `q`-only URL, authoritative Discovery result and no legacy result mode | `[~]` bounded |
| TC-FST-024 task cursor navigation | New real Search Center Chromium role-play passes `1/1`; one same-organization fixture contains 25 searchable tasks, Next retains `type=task` plus the opaque cursor, and the final page contains 1 result after the 24-result first page | `[~]` bounded |
| Test fixture boundedness | `searchTaskCount` is validated to 1–32 and all generated tasks are reindexed before the role-play | `[x]` bounded |
| Focused verification | Mapper unit `6/6`; q-only plus cursor-navigation Chromium batch `2/2`; scoped Prettier/ESLint checks remain bounded and no repository-wide suite was run | `[x]` bounded |
| Remaining closure | Cross-browser/WebKit, visual/AX, resilience, screenshot/hash/ACL/audit, release-manifest and reviewer joins remain open; TC-FST-028 still lacks a production typed relaxation proposal/apply/undo seam | `[ ]` |

The master matrix is intentionally unchanged at `0 [x] / 31 [~] / 0 [ ]`; these results add bounded
evidence and do not promote any master case to full closure.

## Current snapshot — secondary-label, selected-zero, and AST boundary slices (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| TC-FST-005 secondary-label recall | Real Search Center Chromium role-play `1/1` recalls one authorized task by secondary skill, tag and classification labels through canonical `q` plus `type=task` | `[~]` bounded |
| TC-FST-008 selected-zero facet | UI component test `1/1` keeps an exact zero-count selected facet inspectable/selected while another value is added | `[~]` bounded |
| AST-002 depth guard | Focused orchestration unit `15/15` rejects over-depth expressions before provider cost estimation or execution | `[~]` bounded |
| TC-FST-009 facet paging | No UI `nextCursor`/load-more contract exists yet; no test was invented for this missing seam | `[ ]` blocked |
| Remaining closure | Provider parity, saved semantic criteria, API/UI/RP/VS/AX, cross-browser, resilience, release-manifest and reviewer joins remain open | `[ ]` |

These additions are bounded implementation evidence only; the master matrix remains
`0 [x] / 31 [~] / 0 [ ]`.

## Current snapshot — Talent public-evidence recruiter journey (2026-08-10)

| Evidence slice | Fresh evidence | Status |
|---|---|---|
| TC-FST-012 recruiter UI | Existing Chromium role-play `1/1` submits two skill IDs plus `min_proficiency=l7`, returns the matching talent and public verified accomplishment evidence | `[~]` bounded |
| Privacy boundary | The rendered public evidence omits private source marker, task ID and reviewer/evidence facts | `[~]` bounded |
| Remaining Talent closure | Disputed evidence, fairness, cross-session, visual/AX, cross-browser, provider/API and release joins remain open | `[ ]` |
| Projection/authoring blockers | TC-FST-025/026 need live replay/crash/ledger-aware rollback contracts; TC-FST-029 lacks production proposal/manual-fallback wiring | `[ ]` |

The master matrix remains `0 [x] / 31 [~] / 0 [ ]`; this is real browser/privacy evidence, not
full release closure.

## Reduced implementation tranche / Definition of Done (2026-08-10)

| Boundary | Current decision | Matrix meaning |
|---|---|---|
| Implementation | Owned production seams, focused unit/contract/integration evidence, and truthful Chromium role-play where available | In scope for this tranche |
| Verification cadence | Focused lint/format and test commands run in batches after the code wave; no full-suite claim | In scope, bounded |
| Release gates | WebKit/Firefox, full visual/runtime AX, network/shard and process-crash resilience, authoritative manifest, immutable artifact joins, screenshot/hash/ACL/audit evidence, reviewer sign-off, and full-repository typecheck/lint/build/security/performance closure | Deferred |
| Missing contracts | TC-FST-009, browser portions of TC-FST-020/021, TC-FST-025/026, TC-FST-028 and TC-FST-029 are not closed without real production seams | Deferred, not fabricated |
| Final focused verification | Backend unit `44/44`; UI component `13/13`; Chromium Search Center role-play `3/3`; focused ESLint `0`; code/test Prettier `0` | Bounded tranche evidence |

The master matrix intentionally remains `0 [x] / 31 [~] / 0 [ ]`. That status is the release-gate
view and must not be converted into a percentage or promoted to full closure merely because a
bounded implementation slice passes.

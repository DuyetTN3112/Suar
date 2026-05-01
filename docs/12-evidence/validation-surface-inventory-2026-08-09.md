# Validation Surface Inventory — 2026-08-09

This is an evidence snapshot, not a runtime registry. The repository is a large dirty worktree,
so rows below describe the validation slices audited and migrated in this implementation pass.

| Surface | Transport boundary | Canonical input | Application intent | Negative evidence | Risk/status |
|---|---|---|---|---|---|
| Create/update Project Sprint | HTTP body + route params | `project_sprint_request_mapper.ts` | Sprint command factory | mapper unit tests; type/alias/enum failures | migrated |
| Move task to Sprint | HTTP body + route params | `project_sprint_request_mapper.ts` | `makeMoveTask` | wrong type, alias, UUID, reason | migrated |
| Reorder backlog | HTTP body + route params | `project_sprint_request_mapper.ts` | `makeReorderBacklog` | placement alias and UUID failures | migrated |
| End Sprint delivery | HTTP body + route params | `project_sprint_request_mapper.ts` | one delivery-to-review workflow | indexed incomplete-task failures; controller boundary | migrated |
| Create Review Observation | HTTP body | `create_review_observation_request_mapper.ts` | review action factory | indexed relation, schema, UUID, enum failures | migrated |
| Task assignment acknowledgement/clarification | HTTP body + route params | `task_assignment_interaction_request_mapper.ts` | one intent per controller action | route mismatch, wrong type, missing snapshot/reason | migrated |
| Organization settings update | HTTP body | `update_organization_settings_request_mapper.ts` | organization settings command | wrong field types and object envelope | migrated |
| Notification settings update | HTTP input | `buildNotificationSettingsUpdate` | user settings command | wrong boolean type | migrated |
| Cache admin set/get/clear/flush | HTTP body + route/header params | `cache_admin_request_mapper.ts` | HTTP cache action factory | wrong key, value, ttl, confirmation | migrated |
| Role staffing candidates | route params | `role_staffing_candidates_request_mapper.ts` | project query factory | missing/non-string route ids | migrated |
| Create project with staffing | HTTP input | `create_project_with_staffing_request_mapper.ts` | one staffing command | indexed staffing entry and focus enum failures | migrated |
| Organization invite member | HTTP input | `buildCurrentOrganizationInviteMemberInput` | invitation command factory | missing email/invalid role type | migrated |
| Filter query | HTTP body | `buildFilterCriteriaRequest` | filtering query factory | forged principal, unknown keys, invalid pagination | migrated |
| Skills project/role mutations | HTTP body + route params | `skill_route_request_mapper.ts`, `project_role_skill_request.ts` | Skill project action factory | wrong route types, missing skill/role fields, invalid enum/number/boolean/string values, invalid optional overrides | migrated |
| Admin package/user/role/rubric mutations | HTTP body + route params | admin mutation request mappers | admin action factories | wrong aliases, role enum, boolean, notes, rubric payload and route id | migrated slice |
| Test-only seed/cache/audit routes | Test transport body | `testing_route_request_mapper.ts` | test seed workflows | invalid timestamp/nonce, booleans, enums, arrays, audit scopes, cache operations; route-level malformed-body sweep | hardened internal surface; separate scope |
| Deprecated organization/review/bookmark/task aliases | Compatibility body + route params | compatibility route mappers | canonical action boundaries | malformed legacy aliases and route ids | migrated slice; alias inventory ongoing |
| AI dispute callbacks | Public callback body + signature header | `ai_dispute_callback_request_mapper.ts` | AI dispute evaluation command | invalid signature/timestamp/IDs/status/confidence/payload | migrated slice |
| Review workflow submit/respond/report | Web body + workflow route params | `task_review_workflow_request_mapper.ts`, `sprint_reverse_review_workflow_request_mapper.ts` | one review workflow command per action | wrong body shape, empty text, invalid rating, malformed route values | migrated |
| Search API query | Query input | `search_api_request_mapper.ts` | global search query | non-string query is rejected; blank compatibility preserved | migrated |
| Marketplace match-score routes | Route params | `marketplace_route_request_mapper.ts` | match-score/ranking query | missing or non-string task/application IDs | migrated |
| Task submission evidence index | Route params | `task_submission_evidence_request_mapper.ts` | evidence listing query | missing or non-string submission ID | migrated |
| Admin search projection operations | Query/body input | `admin_search_projection_request_mapper.ts` | one administration operation per action | wrong scalar types, missing fencing fields, invalid booleans | migrated |
| Public search page | Query input | `search_page_request_mapper.ts` | global search/discovery query | wrong query/type/field values rejected; legacy blank-query behavior preserved | migrated |
| Marketplace task applications page | Route + query input | `marketplace_task_applications_request_mapper.ts` | applications list query | malformed task ID/status/pagination rejected | migrated |
| Admin dispute/review/user list pages | Query input + dispute route | admin list request mappers | one list/detail query per action | wrong filter types, enum values, pagination aliases, route IDs rejected | migrated |
| Sprint backlog/sprint list and reverse review board | Route + query/session context | `sprint_query_request_mapper.ts`, `sprint_reverse_review_board_request_mapper.ts` | one query per action | malformed route/query values rejected; explicit context precedence | migrated |
| Filter context definition | Route params | `filter_context_request_mapper.ts` | context definition query | malformed context params fail closed without leaking existence | migrated |
| Testing auth and fixture routes | Test/dev internal transport | `testing_auth_request_mapper.ts`, `testing_route_request_mapper.ts`, testing-routes API-key middleware | fixture/token/session operations | wrong top-level shape, aliases, enum/token/email/length errors; cleanup token scope bounded | hardened internal surface |
| Task comments and attachments | API body + route params + upload metadata | `task_comment_request_mapper.ts`, `task_attachment_request.ts` | task comment/attachment commands | invalid IDs, enums, booleans, MIME/file metadata, finite size | migrated slice |
| Auth token issue/refresh | Compatibility body + aliases | `session_token_request_mapper.ts` | session token command | missing credentials, invalid refresh/org IDs, alias mismatch | migrated slice |
| Task create/assignment validators | HTTP/application input | task request validators | task lifecycle/assignment commands | wrong type, UUID, self-assignment, legacy fields | canonical issues added; mapper migration ongoing |
| HTTP validation boundary | API/compatibility transport | `ValidationException.issues` | exception handler | Problem Details + legacy envelope tests | migrated |

## Known verification limits

- The full route inventory contains compatibility, admin, callback, testing, and page-only
  surfaces; these are not falsely marked covered by this slice inventory.
- The generated mutation inventory now discovers 285 `post`/`put`/`patch`/`delete` declarations,
  including 26 test-only inline handlers that remain a separate scope review. The current run has
  8 rows needing review, all outside application scope. The collector now
  extracts inline arrow-handler bodies as well as controller actions; the remaining test-only
  rows are intentionally kept separate from production coverage. The collector scans
  chained declarations as well as `router.method(...)`; route fragments remain source evidence until
  nested prefixes are resolved into effective URLs.
- The validation guard currently enforces 93 migrated controller actions. The generated matrix is
  intentionally broader than the guard and reports 0 application rows needing follow-up instead
  of hiding them behind the migrated-controller allowlist.
- The generated matrix is route-shape evidence only; compatibility, admin, callback, testing,
  and page-only route families still require a separate reviewed inventory pass.
- Test-only routes are mounted only when `shouldMountTestingRoutes()` allows a test database (or an
  explicitly opted-in safe development database). Their 26 inline mutation rows remain a separate
  scope review; they must not be treated as production API coverage.
- The deprecated `/profile/settings` compatibility redirect is tracked separately from application
  mutation coverage and requires retirement follow-up rather than a request mapper.
- Seed cleanup is bounded at the transport boundary (token count, length, format, and escaped
  wildcard matching), but its deletion ownership is still inferred from seed markers and related
  foreign keys. A dedicated seed-run ownership ledger is a separate design item before this
  internal cleanup endpoint can claim exact row ownership.

# Admin Audit, Moderation, And System Surfaces Behavior Matrix

| Field | Value |
|---|---|
| Status | Draft audit |
| Last Reviewed | 2026-07-14 |
| Scope | System admin boundary, dashboards, users, organizations, audit logs, flagged reviews, dispute moderation, packages, proficiency/rubrics |
| Primary Docs | `docs/09-operations/user-manual-admin-guide-faq-training.md`, `docs/09-operations/runbook-monitoring-maintenance.md`, `docs/09-operations/production-incident-first-response.md` |
| Primary Runtime | `start/routes/admin.ts`, `start/routes/reviews.ts`, `app/modules/admin/**`, `app/modules/reviews/**` |
| Primary Tests | `app/modules/admin/tests/backend/**`, `app/modules/reviews/tests/backend/**`, `inertia/apps/admin/tests/e2e/admin/**`, `inertia/apps/admin/tests/modules/**` |

## Read This First

`/admin/*` is a system-admin boundary. It is not the same as `/org/*`.

`/api/admin/*` is a JSON read/mutation subset for admin surfaces. It should not be described as a complete duplicate of every Inertia page route under `/admin/*`.

This file is still an admin-domain evidence matrix, not a complete hierarchical test-case matrix. It mixes system authorization, dashboard, users, organizations, audit logs, moderation, packages, permissions, and control findings. Split it with `../hierarchical-test-case-decomposition.md` before calculating coverage.

## Matrix

| ID | Behavior | Actor / State | Input / Trigger | Expected Backend Result | Expected UI Result | Evidence | Status |
|---|---|---|---|---|---|---|---|
| ADM-001 | System admin routes require system-admin boundary | Superadmin/system_admin vs normal user | Visit `/admin/*` | Auth + `requireSystemAdmin()` + `systemAdminContext()` guard | Non-admin blocked/redirected | `start/routes/admin.ts`, `admin_proficiency_rubric_read.spec.ts` | covered route, partial E2E |
| ADM-002 | System admin is distinct from organization admin | Org owner/admin without system role | Visit `/admin/*` | Not sufficient for system admin access | Org owner cannot use admin shell | `start/routes/admin.ts`, `docs/09-operations/user-manual-admin-guide-faq-training.md` | documented, partial E2E |
| ADM-003 | Admin dashboard API exposes wrapped camelCase stats | System admin | `GET /api/admin/dashboard` | Wrapped `data` without `success`; users/orgs/tasks/subscriptions/moderation stats keys present | Dashboard cards should render | `app/modules/admin/tests/backend/integration/admin_read_api_standardization.spec.ts` | covered backend, missing E2E |
| ADM-004 | Admin users API returns filtered wrapped list | System admin | `GET /api/admin/users?search=...` | CamelCase user fields, pagination, filters | Users table/filter should render same rows | `admin_read_api_standardization.spec.ts`, `list_users_query.spec.ts`, `admin_users_page.test.ts` | covered backend, partial UI |
| ADM-005 | Admin user pagination deterministic on tied `created_at` | System admin, tied users | List users | Stable id desc tie-break | Pagination not reorder randomly | `admin_read_api_standardization.spec.ts` | covered backend, missing UI |
| ADM-006 | Admin organizations API returns filtered wrapped list | System admin | `GET /api/admin/organizations?search=...` | CamelCase org fields, counts, pagination, filters | Organizations page/search renders | `admin_read_api_standardization.spec.ts`, `list_organizations_query.spec.ts`, `admin_organizations_page.test.ts` | covered backend, partial UI |
| ADM-007 | Admin organization pagination deterministic on tied `created_at` | System admin, tied orgs | List orgs | Stable id desc tie-break | Pagination not reorder randomly | `admin_read_api_standardization.spec.ts` | covered backend, missing UI |
| ADM-008 | Admin audit logs API returns wrapped cursor list with investigation fields | System admin | `GET /api/admin/audit-logs` | Wrapped list, cursor pagination, user/resource/IP/userAgent/details fields | Admin audit list renders rows/detail panel | `admin_read_api_standardization.spec.ts`, `audit_logs.spec.ts`, `admin_audit_logs_page.test.ts`, `audit_log_surfaces.spec.ts` | covered backend and E2E |
| ADM-009 | Audit log query resolves user info from Postgres and records admin view event | System admin | List audit logs | User joined, details parsed, `admin.audit_log.viewed` event written | Investigation summary visible | `app/modules/admin/tests/backend/integration/audit_logs.spec.ts`, `admin_audit_logs_console_model.test.ts` | covered backend, partial UI |
| ADM-010 | Audit log cursor pagination avoids duplicates | System admin | Older/newer audit windows | No overlap; cursor metadata valid | Cursor controls stable | `audit_logs.spec.ts`, `admin_audit_logs_console_routing.test.ts` | covered backend, partial UI |
| ADM-011 | Direct page-number jumps in cursor mode reset to newest window | System admin | `page=3` without cursor | Newest cursor window returned to avoid offset drift | UI does not fake random offset jump | `audit_logs.spec.ts` | covered backend, missing E2E |
| ADM-012 | User audit scope returns rows owned by or performed by that user | System admin/user audit surface | User-scoped audit query | Only user-owned or actor rows returned | Personal audit hides other users | `audit_logs.spec.ts`, `audit_log_surfaces.spec.ts` | covered backend and E2E |
| ADM-013 | Organization audit scope returns org/project/task rows for that org only | Org owner/system admin context | Org-scoped audit query | Direct organization, project, task audit rows scoped to org | Org audit surface hides foreign org | `audit_logs.spec.ts`, `audit_log_surfaces.spec.ts` | covered backend and E2E |
| ADM-014 | System audit surface has one focused sidebar entry and no old workspace widgets | System admin | `/admin/audit-logs` | N/A | No duplicate workspace nav; detail has request/trace/IP/user-agent/raw payload | `inertia/apps/admin/tests/e2e/admin/audit_log_surfaces.spec.ts`, `admin_audit_logs_console.spec.ts`, `admin_audit_logs_page.test.ts` | covered E2E |
| ADM-015 | Flagged reviews list includes reviewer/reviewee and flag metadata | System admin | List flagged reviews | Reviewer/reviewee info, flag type, severity, status, comment | Flagged reviews table should render human details | `app/modules/admin/tests/backend/integration/flagged_reviews.spec.ts` | covered backend, missing E2E |
| ADM-016 | Flagged review resolve persists reviewed_by, status, notes, reviewed_at | System admin | Resolve flagged review | Status/notes/reviewer timestamp persisted | Queue row updates/disappears | `flagged_reviews.spec.ts`, `admin_api_standardization.spec.ts` | covered backend, missing E2E |
| ADM-017 | Flagged moderation filters preserve legacy params | System admin | Filter by reviewer/search/type/severity/status | Correct one-row result | Filter form should target same params | `flagged_reviews.spec.ts`, `admin_read_controller_aliases.spec.ts` | covered backend, missing UI |
| ADM-018 | Flagged moderation queue supports bidirectional cursor pagination | System admin | Older/newer queue windows | No overlap, cursor previous/next valid | Pagination controls stable | `flagged_reviews.spec.ts` | covered backend, missing UI |
| ADM-019 | Package update JSON route accepts camelCase and returns 204 | System admin | `PUT /admin/packages/:subscriptionId` | Plan/status/auto-renew/expires persisted | Package row should update | `admin_api_standardization.spec.ts` | covered backend, missing E2E |
| ADM-020 | Package UI preserves package filters in pagination links | System admin | Paginate packages | N/A | Filter params preserved | `admin_packages_page.test.ts` | covered component only |
| ADM-021 | Subscription dashboard pagination renders | System admin | Dashboard subscriptions page | N/A | Pagination visible for subscription accounts | `admin_dashboard_subscriptions_page.test.ts` | component only |
| ADM-022 | Admin proficiency scale page shows ordered levels | System admin | `/admin/proficiency` | Active proficiency scale read | Table with ordinal/code/display name | `proficiency_view_model.spec.ts`, `admin_proficiency_rubric_read.spec.ts` | covered backend and E2E |
| ADM-023 | Admin proficiency detail exposes full level definitions | System admin | `/admin/proficiency/:scaleId` | View model maps framework descriptor and level fields | Detail rows visible, version/active metadata | `proficiency_view_model.spec.ts`, `admin_proficiency_rubric_read.spec.ts` | covered backend and E2E |
| ADM-024 | Admin skill rubric page shows evidence guidance when rubric exists | System admin | `/admin/proficiency/rubrics/:skillId` | Rubric view model maps level detail | Level cards and evidence guidance visible | `proficiency_view_model.spec.ts`, `admin_proficiency_rubric_read.spec.ts` | partial; E2E can skip |
| ADM-025 | Non-admin cannot access admin proficiency pages | Regular user | `/admin/proficiency` | Guard blocks | Redirect or 403 | `admin_proficiency_rubric_read.spec.ts` | covered E2E |
| ADM-026 | Proficiency empty state renders | System admin, no active scale | `/admin/proficiency` | No active scale result | Empty state visible | `admin_proficiency_rubric_read.spec.ts` | partial; branch accepts table or empty |
| ADM-027 | Admin disputes list/detail surfaces show human-readable details without raw ID leaks | System admin | `/admin/disputes`, `/admin/disputes/:id` | Admin dispute APIs return nested case data | Human labels, no raw IDs | `app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts`, `admin_disputes_page.test.ts`, `admin_dispute_show_page.test.ts` | covered backend, partial UI |
| ADM-028 | Admin dispute resolve locks normal decision until required dossier data complete or override reason exists | System admin | Resolve dispute | Backend readiness blocks incomplete dossier unless override reason | Resolve button disabled/enabled correctly | `review_inherited_data_api_standardization.spec.ts`, `review_dispute_readiness.spec.ts`, `dispute_resolve_tab.test.ts`, `sprint_review_governance_experience.spec.ts` | covered backend and E2E |
| ADM-029 | Admin dispute AI operator preserves filters and pagination | System admin | `/admin/disputes/ai-operator` | AI evaluation list/query | Pagination/filter preserved | `review_collection_api_standardization.spec.ts`, `admin_disputes_ai_operator_page.test.ts` | covered backend, partial UI |
| ADM-030 | Admin read controller aliases accept camelCase filters | System admin API | CamelCase filter aliases | DTOs prefer camelCase aliases | UI/API clients can use canonical names | `admin_read_controller_aliases.spec.ts`, `admin_review_disputes_controller_aliases.spec.ts` | covered unit |
| ADM-031 | Admin audit mapper exposes observability fields and legacy fallback summary | System admin audit row | Map platform/legacy rows | Investigation metadata extracted; readable legacy summary fallback | Detail panel useful | `admin_audit_log_response_mapper.spec.ts`, `admin_audit_logs_console_model.test.ts` | covered unit/component |
| ADM-032 | Admin user role/suspend/activate routes exist but have weak behavior proof in admin module | System admin | `PUT /admin/users/:id/role|suspend|activate` | Role/status should persist and audit | UI controls should mutate rows | `start/routes/admin.ts` | missing direct admin behavior test |
| ADM-033 | Admin permissions and QR code pages exist but have little behavior proof | System admin | `/admin/permissions`, `/admin/qr-codes` | Pages/controllers respond | Pages render useful content | `start/routes/admin.ts` | missing behavior matrix rows/tests |
| ADM-034 | Admin dashboard page routes exist beyond API dashboard | System admin | `/admin`, `/admin/dashboards/users|operations|subscriptions` | Page props/query stats | Dashboard pages render correct cards | `start/routes/admin.ts`, `admin_dashboard_subscriptions_page.test.ts` | partial |
| ADM-035 | Admin E2E does not cover users, organizations, package mutation, flagged review resolution, dashboard stats | System admin | Browser flows | Backend may be correct | Full UI mutation paths unproven | Test inventory | missing E2E |

## Strong Coverage

- Admin audit log backend tests are meaningful: Postgres-backed rows, user join, scoped user/org filters, cursor pagination, and view audit event.
- Flagged review backend tests prove listing, filters, cursor pagination, and resolution persistence.
- Admin read API standardization tests guard JSON shape for dashboard/users/organizations/audit logs.
- Audit-log and proficiency pages have useful E2E coverage.

## Weak Coverage

- Admin users role/suspend/activate routes exist, but direct behavior tests were not found in admin module.
- Package update has backend proof but no UI/E2E mutation proof.
- Flagged review resolution has backend proof but no seeded browser proof.
- Many admin component tests only check pagination/filter link preservation.
- Admin proficiency E2E has skip/branch behavior for rubric/empty-state, so it should not be treated as a complete content matrix.

## Next Tests To Add

1. Admin user mutation backend + E2E: update role, suspend, activate; assert DB, audit log, and UI row state.
2. Flagged review moderation E2E: seed a flagged review, resolve it from `/admin/reviews/:id`, assert status and queue change.
3. Package mutation E2E: seed subscription, update plan/status from `/admin/packages`, assert row and persisted API value.
4. Dashboard stats contract-fixture bridge: seed users/orgs/tasks/subscriptions/flagged reviews and assert dashboard cards reflect exact counts.
5. Admin permissions/QR-code smoke plus behavior assertions, or mark those routes explicitly as low-priority read-only pages.

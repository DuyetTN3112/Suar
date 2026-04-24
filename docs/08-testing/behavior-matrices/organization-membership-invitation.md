# Organization Membership And Invitation Behavior Matrix

| Field | Value |
|---|---|
| Status | Draft audit |
| Last Reviewed | 2026-07-14 |
| Scope | Organization create/current context, invitations, join requests, member roles/removal, ownership transfer |
| Primary Docs | `docs/05-api/api-landscape-and-governance.md`, `docs/09-operations/user-manual-admin-guide-faq-training.md`, `docs/09-operations/production-incident-first-response.md` |
| Primary Runtime | `start/routes/organizations_current.ts`, `start/routes/users.ts`, `app/modules/organizations/**`, `app/modules/users/controllers/*invitation*` |
| Primary Tests | `app/modules/organizations/tests/backend/**`, `inertia/apps/org/tests/modules/invitations/**`, `inertia/apps/user/tests/modules/profile/invitations.test.ts`, `inertia/apps/org/tests/e2e/org/**` |

## Read This First

This flow uses `organization_users` as runtime truth for invitations, join requests, and membership status. The legacy mental model of a separate invitation table is wrong for current behavior.

`pending` membership can count as a membership row, but it must not grant approved workspace access. Any test that only asserts row existence is partial unless it also checks `status` and approved-membership semantics.

This file is still an organization governance evidence matrix, not a complete hierarchical test-case matrix. It mixes organization creation, invitation, join request, member role, ownership, and API contract concerns. Split it with `../hierarchical-test-case-decomposition.md` before calculating coverage.

## Matrix

| ID | Behavior | Actor / State | Input / Trigger | Expected Backend Result | Expected UI Result | Evidence | Status |
|---|---|---|---|---|---|---|---|
| ORG-001 | Organization creation seeds owner context, workflow, audit, notification | Active creator | Create organization | Organization, owner membership, default workflow, audit, welcome notification created | New org selectable/current | `app/modules/organizations/tests/backend/integration/create_org.spec.ts` | covered backend, partial UI |
| ORG-002 | Inactive creator cannot create organization | Inactive user | Create organization | Rejected before org side effects | Error state expected | `create_org.spec.ts` | covered backend, missing UI |
| ORG-003 | Duplicate org names get unique slugs | Active creators | Create orgs with same name | Separate orgs with unique slugs | Slugs/details should render distinctly | `create_org.spec.ts` | covered backend, missing UI |
| ORG-004 | Current organization resolver accepts only approved membership | Authenticated user with approved membership | Resolve/switch current org | Current org context valid | Org shell loads | `app/modules/organizations/middleware/organization_resolver_middleware.ts`, `docs/09-operations/user-manual-admin-guide-faq-training.md` | partial |
| ORG-005 | Pending membership does not grant approved org context | Pending member | Resolve current org / enter org shell | Not approved; protected data unavailable | Require-org/error or empty guarded state | `app/modules/organizations/tests/backend/integration/join_request.spec.ts`, `docs/09-operations/user-manual-admin-guide-faq-training.md` | covered backend, missing E2E |
| ORG-006 | Deleted/invalid current org should clear or fallback | User session points at invalid org | Resolve current org | Resolver clears invalid current org and may fallback to approved org | User not stuck in blank shell | `docs/09-operations/user-manual-admin-guide-faq-training.md`, `organization_resolver_middleware.ts` | documented risk, missing behavior test |
| ORG-007 | Switch organization API mutates current context with canonical shape | Approved member | Switch org JSON request | Wrapped camelCase payload, session/current org changed | Shell switches org | `app/modules/organizations/tests/backend/integration/switch_context_api_standardization.spec.ts` | covered backend, missing E2E |
| ORG-008 | Switch project API mutates current project context | Approved member with project | Switch project JSON request | Wrapped camelCase payload, session/current project changed | Project-scoped shell/data switches | `switch_context_api_standardization.spec.ts` | covered backend, missing E2E |
| ORG-009 | Invite member legacy JSON path creates pending invited membership | Owner/admin | `POST /org/members/invite` with email/role | 204; `organization_users` row pending, `invited_by`, role set | Invitation appears in org invitation list | `current_organization_mutation_api_standardization.spec.ts` | covered backend, partial UI |
| ORG-010 | Invite member canonical v1 path preserves behavior | Owner/admin | `POST /api/v1/me/organizations/current/member-invitations` | Same 204 and pending membership behavior | API clients can migrate | `current_organization_mutation_api_standardization.spec.ts` | covered backend |
| ORG-011 | Invite command writes audit and platform event, not legacy invitation table | Approved inviter | Invite existing user | Pending membership; org audit `invite`; platform event `organization.invitation.completed` | Audit/event consumers can show history | `app/modules/organizations/tests/backend/integration/org_invitations_query.spec.ts` | covered backend, missing UI |
| ORG-012 | Pending admin cannot invite users | Pending admin membership | Invite user | Forbidden; no invitee membership; no invitation audit trail | Invite control should be hidden/disabled | `org_invitations_query.spec.ts` | covered backend, missing UI |
| ORG-013 | Org invitations page lists only inviter-created pending memberships | Owner/admin | List invitations with search | Invited pending rows only; self-request rows excluded | Invitation table shows invited rows | `org_invitations_query.spec.ts`, `inertia/apps/org/tests/modules/invitations/index.test.ts` | covered backend, partial UI |
| ORG-014 | Invitation ordering is deterministic for tied timestamps | Owner/admin | List invitations with same `created_at` | Ordered by `user_id` desc tie-break | Pagination stable | `org_invitations_query.spec.ts` | covered backend, missing UI |
| ORG-015 | Org invitation pagination preserves search filter | Org admin page | Paginate invitation list | Query filters preserved | Previous link keeps search | `org_invitations_page.test.ts` | covered component only |
| ORG-016 | Invited user sees pending invitations page | Invited user | `/profile/invitations` | Pending invitation page from membership query | Pagination summary visible | `inertia/apps/user/tests/modules/profile/invitations.test.ts`, `app/modules/users/controllers/my_invitations_page_controller.ts` | partial |
| ORG-017 | Invited user accepts invitation | Invited user with pending invited membership | `PUT /me/invitations/:organizationId/accept` | Membership becomes approved through `AcceptOrganizationInvitationCommand`; mutation success | Success toast/back redirect; org becomes accessible | `app/modules/users/controllers/accept_my_invitation_controller.ts`, `organization_public_api.acceptInvitation` | missing direct test |
| ORG-018 | Invited user rejects invitation | Invited user with pending invited membership | `PUT /me/invitations/:organizationId/reject` | Membership rejected/removed per command semantics | Success toast/back redirect; invitation disappears | `app/modules/users/controllers/reject_my_invitation_controller.ts`, `organization_public_api.rejectInvitation` | missing direct test |
| ORG-019 | User creates join request as pending membership | Non-member applicant | Join organization | Pending `organization_users` membership with member role | Join request submitted state | `app/modules/organizations/tests/backend/integration/join_request.spec.ts`, `join_organization_api_standardization.spec.ts` | covered backend, missing E2E |
| ORG-020 | Approve join request updates status and removes pending query result | Owner/admin | Approve pending request | Membership approved; no longer pending | Request disappears; member appears | `join_request.spec.ts`, `membership.spec.ts`, `current_organization_mutation_api_standardization.spec.ts` | covered backend, partial UI |
| ORG-021 | Reject join request keeps row but marks rejected | Owner/admin | Reject pending request | Membership remains with `rejected`; still `isMember`, not approved | Request disappears/rejected feedback | `join_request.spec.ts` | covered backend, missing UI |
| ORG-022 | Join request list shows pending requests for current org | Owner/admin | `/org/invitations/requests` | Pending rows scoped to current org | Request table/pagination renders | `app/modules/organizations/tests/backend/integration/org_join_requests_query.spec.ts`, `org_join_requests_page.test.ts` | covered backend, partial UI |
| ORG-023 | Join request pagination intentionally drops keyword search | Org admin page | Paginate join requests after search | Search not preserved in link | Previous link omits `search` | `inertia/apps/org/tests/modules/invitations/join_requests.test.ts` | covered component only |
| ORG-024 | Member list endpoints prefer nested collection paths and preserve aliases | API client | Legacy/nested member list endpoints | Canonical camelCase collection | UI member list can consume shape | `app/modules/organizations/tests/backend/contract/organization_api_standardization.contract.spec.ts` | covered contract |
| ORG-025 | Member list query applies status/role/search filters | Owner/admin | List members with filters | Scoped collection and cache key reflect filters | Members page link preserves role/status | `list_organization_members_query.spec.ts`, `get_organization_members_query.spec.ts`, `org_members_page.test.ts` | covered backend, partial UI |
| ORG-026 | Owner promotes member to admin with side effects | Owner | Update member role | Role persisted; admin check true; cache invalidated; notification, audit, platform event emitted | Member row shows admin role | `app/modules/organizations/tests/backend/integration/membership.spec.ts` | covered backend, missing E2E |
| ORG-027 | Pending admin cannot change another role | Pending admin | Update target member role | Forbidden; role unchanged; cache unchanged; no notification/audit | Role controls hidden/disabled | `membership.spec.ts` | covered backend, missing UI |
| ORG-028 | Role change JSON legacy/v1 paths preserve 204 behavior | Owner/admin | `PUT /org/members/:id/role`, v1 equivalent | 204; role persisted | API clients can migrate | `current_organization_mutation_api_standardization.spec.ts` | covered backend |
| ORG-029 | Role policy protects owner/admin boundaries | Owner/admin/member states | Role mutation decision | Owner protections, self-update restrictions, invalid role rejection | Controls should match policy | `app/modules/organizations/tests/backend/unit/org_permission_policy.spec.ts` | covered unit, missing UI |
| ORG-030 | Custom role allowlist sanitizes roles/permissions | Owner/admin | Update custom roles | Built-ins preserved; sanitized custom roles accepted | Role selectors show safe options | `app/modules/organizations/tests/backend/unit/org_access_rules.spec.ts`, `organization_dto_contracts.spec.ts`, `current_organization_mutation_api_standardization.spec.ts` | covered backend, missing UI |
| ORG-031 | Remove member deletes membership and unassigns their tasks | Owner | Remove member with assigned task | Member count decreases; membership gone; their tasks unassigned; other tasks preserved; notification/audit/event emitted | Member disappears; affected tasks no longer assigned | `membership.spec.ts` | covered backend, missing E2E |
| ORG-032 | Remove member legacy/v1 JSON paths preserve 204 behavior | Owner/admin | `DELETE /org/members/:id`, v1 equivalent | 204; membership deleted | API clients can migrate | `current_organization_mutation_api_standardization.spec.ts` | covered backend |
| ORG-033 | Ownership transfer persists owner migration | Current owner, target approved admin | Transfer ownership | Org owner changes; old owner becomes admin; new owner owner; audit and two notifications | Ownership UI should reflect new owner | `app/modules/organizations/tests/backend/integration/transfer_organization_ownership.spec.ts` | covered backend, missing UI |
| ORG-034 | Non-owner cannot transfer ownership | Approved non-owner | Transfer ownership | Forbidden; org unchanged; no audit/notification | Transfer control unavailable | `transfer_organization_ownership.spec.ts` | covered backend, missing UI |
| ORG-035 | New owner must be approved admin-or-owner | Current owner, target member/not approved | Transfer ownership | Business error; no partial writes | Error state expected | `transfer_organization_ownership.spec.ts`, `org_permission_policy.spec.ts` | covered backend, missing UI |
| ORG-036 | Ownership notification failure does not roll back committed transfer | Current owner, notification transport fails | Transfer ownership | Owner migration and audit persist despite notification failure | UI may need retry/notice | `transfer_organization_ownership.spec.ts` | covered backend, missing UI |
| ORG-037 | Project member management E2E does not prove org membership flow | Project owner, seeded project/member | Add project member from candidate list | Project membership added | Project member card visible | `inertia/apps/org/tests/e2e/projects/project_member_management.spec.ts` | covered different flow |
| ORG-038 | Org-level invitation/join/member role flow has no seeded E2E | Owner/admin/applicant/invitee | Invite, accept/reject, join approve/reject, role change, remove | Backend may be correct, but full browser behavior unproven | UI regression can escape | Test inventory inspection | missing E2E |

## Strong Coverage

- Backend invitation/join/member mutation tests assert real DB state, audit/event side effects, cache invalidation, notification behavior, and canonical/legacy route compatibility.
- Ownership transfer tests are strong: success, non-owner rejection, invalid new owner rejection, no partial writes, and notification failure behavior.
- Unit policy tests cover owner/admin/member boundaries better than most UI tests.

## Weak Coverage

- Invited user accept/reject has controllers and public API calls but no direct backend or E2E test found.
- Org-level member management UI has component pagination tests, but no seeded E2E for invite, accept, reject, join approval/rejection, role mutation, remove member, or ownership transfer.
- Component tests mostly verify pagination URLs. They do not prove forms submit correct payloads, permission controls match backend policy, or rows update after mutation.
- Project member management E2E is useful but must not be counted as organization membership coverage.

## Next Tests To Add

1. Backend accept/reject invitation tests: seed pending invited membership, call `/me/invitations/:organizationId/accept|reject`, assert final `organization_users.status`, current-org access, and mutation response.
2. Seeded org invitation E2E: owner invites exact user, invitation appears in `/org/invitations`, invitee sees `/profile/invitations`, accepts, then can enter org workspace.
3. Seeded join request E2E: applicant joins org, owner sees request, approves/rejects, applicant access changes accordingly.
4. Seeded member role E2E: owner promotes member to admin, page updates, member gains admin-only control; pending admin cannot mutate role.
5. Seeded remove-member E2E: owner removes member assigned to a task, member disappears, task assignee clears through API/UI.

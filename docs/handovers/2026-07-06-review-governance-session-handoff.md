# Review Governance Handoff — 2026-07-06

> Historical handoff snapshot.
>
> Dùng file này để hiểu session state, risk, và checklist audit ở thời điểm 2026-07-06, không dùng làm bằng chứng rằng review governance hiện tại đã hoàn tất.
>
> Trước khi tin bất kỳ claim nào trong file này, đối chiếu lại với:
> - `docs/12-evidence/workstream-status-audit.md`
> - `docs/01-business/feature-specification.md`
> - `docs/05-api/api-landscape-and-governance.md`
> - `docs/08-testing/test-case-matrix.md`

## Goal

Continue shipping and verifying full review-governance flow for Suar:

- task comments under each task
- mention/tag parsing in task comments
- mention notifications
- comment edit/delete
- task comments counted as review/dispute evidence
- review zone after task is done
- required review quorum:
  - creator/task assigner required
  - manager path required
  - peer quorum required
- reviewee confirm vs dispute
- dispute two-way discussion
- report dispute to system admin
- reverse reviews for manager / peer / project / organization
- reverse review signals reflected on org/project/profile surfaces
- frontend polish so these flows are actually usable

Repo root:

- `/home/tranngocduyet/Projects/Suar`

Important operational note:

- backend/integration suites should be run sequentially in this repo
- parallel runs can collide on DB/HTTP port and produce false failures

---

## What is already done

### 1. Task comments + mentions + notifications

Implemented:

- create / list / update / delete task comments
- mention parsing from `@username`
- mention notifications
- `review_relevance` flag to mark comments as usable review/dispute evidence

Important files:

- `app/modules/tasks/actions/commands/create_task_comment_command.ts`
- `app/modules/tasks/actions/commands/delete_task_comment_command.ts`
- `app/modules/tasks/actions/support/task_comment_mentions.ts`
- `app/modules/tasks/controllers/task_submission_controller.ts`
- `app/modules/tasks/infra/models/task_comment.ts`
- `inertia/pages/tasks/components/detail/task_discussion_tab.svelte`

### 2. Review zone data on task detail

Implemented task-level review-zone summary showing:

- submission / review session / dispute IDs
- review session status
- manager / peer counts
- pending required/optional assignments

Important files:

- `app/modules/tasks/actions/queries/get_task_detail_query.ts`
- `inertia/pages/tasks/types.svelte.ts`
- `inertia/pages/tasks/components/detail/task_review_zone_card.svelte`
- `inertia/pages/tasks/show.svelte`

### 3. Dispute flow foundations

Implemented:

- dispute comments
- dispute evidences
- report dispute to admin
- admin dispute detail page
- organization dispute queue
- user dispute room

Important backend files:

- `app/modules/reviews/actions/commands/report_review_dispute_command.ts`
- `app/modules/reviews/controllers/report_review_dispute_controller.ts`
- `app/modules/reviews/actions/commands/respond_to_review_dispute_command.ts`

Important frontend files:

- `inertia/pages/reviews/disputes/show.svelte`
- `inertia/pages/reviews/disputes/components/*`
- `inertia/pages/admin/disputes/show.svelte`
- `inertia/pages/admin/disputes/index.svelte`
- `inertia/pages/org/disputes/index.svelte`

### 4. Reverse reviews

Implemented:

- reverse review read/query layer
- private vs anonymous masking rules
- project reverse review surface
- organization reverse review surface
- admin reverse review surface
- profile reverse review summary

Important files:

- `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts`
- `app/modules/reviews/actions/support/reverse_review_target_stats.ts`
- `app/modules/projects/actions/queries/get_project_detail_query.ts`
- `app/modules/organizations/actions/queries/get_organization_show_page_query.ts`
- `app/modules/users/actions/queries/get_profile_show_page_query.ts`
- `inertia/pages/reviews/components/reverse_review_list.svelte`
- `inertia/pages/reviews/reverse-reviews.svelte`
- `inertia/pages/org/reverse-reviews.svelte`
- `inertia/pages/admin/reviews/reverse-reviews.svelte`
- `inertia/pages/projects/show.svelte`
- `inertia/pages/organizations/show.svelte`
- `inertia/pages/profile/components/profile_overview_section.svelte`

### 5. Reviewer assignment / anti-stall groundwork

Implemented supporting reviewer assignment logic for review sessions.

Important files:

- `app/modules/reviews/infra/models/review_session_reviewer_assignment.ts`
- `app/modules/reviews/actions/support/review_session_reviewer_assignments.ts`
- `app/modules/reviews/actions/support/review_session_actor_access.ts`

### 6. UI polish already applied in this session chain

Polished heavily:

- `my-reviews`
- `pending reviews`
- reverse review feeds
- user dispute room
- admin dispute decision room
- organization dispute queue
- review show header/results

Important files:

- `inertia/pages/reviews/my-reviews.svelte`
- `inertia/pages/reviews/pending.svelte`
- `inertia/pages/reviews/components/review_card.svelte`
- `inertia/pages/reviews/components/review_show_header.svelte`
- `inertia/pages/reviews/components/review_results_section.svelte`
- `inertia/pages/admin/disputes/show.svelte`
- `inertia/pages/admin/disputes/index.svelte`
- `inertia/pages/org/disputes/index.svelte`

---

## Key tests already verified in this session

These were run successfully in current worktree.

### Backend

Run command used:

```bash
node ace test \
  --files=app/modules/tasks/tests/backend/contract/task_submission_api_standardization.contract.spec.ts \
  --files=app/modules/tasks/tests/backend/contract/task_detail.contract.spec.ts \
  --files=app/modules/reviews/tests/backend/integration/review_disputes_api_standardization.spec.ts \
  --files=app/modules/reviews/tests/backend/integration/reverse_review_reads.spec.ts \
  --files=app/modules/reviews/tests/backend/integration/reverse_review_page_contract.spec.ts \
  --files=app/modules/organizations/tests/backend/integration/organization_show_page_reviews.spec.ts \
  --files=app/modules/users/tests/backend/integration/profile_show_reverse_review_summary.spec.ts
```

Result:

- 23 tests passed

What those tests prove:

- task comments API supports create/list/update/delete
- camelCase request/response for task comments
- mention notification gets created
- task detail exposes review-zone data
- dispute reporting to admin works and sends admin notification
- reverse review masking rules work in `me` / `org` / `admin` scopes
- org page shows reverse review governance summary
- profile page query includes reverse review summary

### Focused frontend lint checks run and passed

These were run during this session on touched UI files:

- `inertia/pages/reviews/components/review_card.svelte`
- `inertia/pages/reviews/my-reviews.svelte`
- `inertia/pages/reviews/components/reverse_review_list.svelte`
- `inertia/pages/admin/disputes/show.svelte`
- `inertia/pages/admin/disputes/components/*`
- `inertia/pages/reviews/disputes/components/dispute_detail_discussion_tab.svelte`
- `inertia/pages/org/disputes/index.svelte`
- `inertia/pages/admin/disputes/index.svelte`
- `inertia/pages/reviews/components/review_show_header.svelte`
- `inertia/pages/reviews/components/review_results_section.svelte`
- `inertia/pages/organizations/show.svelte`
- `inertia/tests/e2e/reviews/reverse_review_access.spec.ts`

Note:

- repo still has unrelated pre-existing `svelte-check` failures outside this feature area
- do not treat global `svelte-check` red as proof these review changes are broken

---

## Important behavior decisions already encoded

### Task comment evidence

- task comments have `review_relevance`
- review/dispute UI surfaces now load and show review-relevant task comments as evidence

Important files:

- `inertia/pages/reviews/components/review_related_task_comments_panel.svelte`
- `inertia/pages/reviews/components/review_evidence_panel.svelte`
- `inertia/pages/reviews/disputes/components/dispute_detail_evidence_tab.svelte`

### Identity masking

Already cleaned:

- no raw `undefined/undefined` manager/peer text in review cards
- several dispute/reverse-review screens no longer schema evidence raw IDs in visible UI

But still needs continued audit for other old screens/tests.

### Org middleware fix

Already fixed:

- admin routes were blocked by org resolver middleware
- exemptions added for:
  - `/admin`
  - `/api/admin`

File:

- `app/modules/organizations/middleware/organization_resolver_middleware.ts`

---

## Current remaining gaps / likely next work

Do **not** assume goal is complete yet.

### 1. Completion audit still not finished

Need stronger proof for full objective:

- more frontend component/e2e coverage for new review/dispute/reverse-review UI
- possibly one focused backend integration around reviewer assignment anti-stall behavior if not already covered enough

### 2. Some tests may still reflect old UI

At least one E2E file was already updated:

- `inertia/tests/e2e/reviews/reverse_review_access.spec.ts`

But new session should still audit:

- `inertia/tests/component/admin/admin_disputes_page.test.ts`
- `inertia/tests/component/org/org_disputes_page.test.ts`
- `inertia/tests/e2e/reviews/org_dispute_queue.spec.ts`
- `inertia/tests/e2e/reviews/org_dispute_queue_flow.spec.ts`
- any `my-reviews` / `pending reviews` component coverage if present or worth adding

### 3. Review show page can still be improved

Current `review show` is much better, but not necessarily final.

Files to inspect next:

- `inertia/pages/reviews/show.svelte`
- `inertia/pages/reviews/components/confirmation_panel.svelte`
- `inertia/pages/reviews/components/review_evidence_panel.svelte`
- `inertia/pages/reviews/components/reverse_review_form.svelte`

### 4. Anti-stall governance policy not fully codified in docs/spec/tests

We discussed strategy:

- force creator/task assigner first
- prefer nearest / most relevant / highest-level available project members
- avoid notification spam

Need to verify whether code now fully reflects intended reviewer selection and escalation behavior, and whether docs mention it clearly enough.

Primary code to inspect:

- `app/modules/reviews/actions/support/review_session_reviewer_assignments.ts`
- `app/modules/tasks/actions/commands/submit_task_submission_command.ts`

### 5. Worktree is very dirty

Repo has many unrelated modifications and untracked files.

Rules for new session:

- do not revert unrelated changes
- keep edits tightly scoped
- use `apply_patch`

---

## Recommended next steps for new session

### Step 1. Continue proof-oriented audit

Inspect and verify:

- task comments requirement
- mention notifications
- dispute escalation to admin
- reverse review surfaced on:
  - user page
  - org page
  - admin page
  - project page
  - profile page

### Step 2. Add or update frontend tests for current UI

Recommended first targets:

- `inertia/tests/component/admin/admin_disputes_page.test.ts`
- `inertia/tests/component/org/org_disputes_page.test.ts`
- `inertia/tests/e2e/reviews/org_dispute_queue.spec.ts`

Goal:

- assert new hero/card layouts still preserve pagination/filter behavior
- assert no raw UUID leakage in key review/reverse-review feeds where identity should be human-readable

### Step 3. Audit reviewer assignment logic vs original product intent

Need to answer with code evidence:

- is creator/task assigner always required?
- is peer quorum enforced?
- are optional/backup reviewers assigned sanely?
- what prevents stalled review loops?

If gap found:

- patch code
- add focused integration test

### Step 4. Only after stronger audit, decide whether objective can be marked complete

Right now: **not proven complete**.

---

## Useful file map

### Task comments

- `app/modules/tasks/actions/commands/create_task_comment_command.ts`
- `app/modules/tasks/actions/commands/delete_task_comment_command.ts`
- `app/modules/tasks/actions/support/task_comment_mentions.ts`
- `app/modules/tasks/controllers/task_submission_controller.ts`
- `inertia/pages/tasks/components/detail/task_discussion_tab.svelte`

### Review zone / review show

- `app/modules/tasks/actions/queries/get_task_detail_query.ts`
- `inertia/pages/tasks/components/detail/task_review_zone_card.svelte`
- `inertia/pages/reviews/show.svelte`
- `inertia/pages/reviews/components/review_show_header.svelte`
- `inertia/pages/reviews/components/confirmation_panel.svelte`

### Disputes

- `app/modules/reviews/actions/commands/report_review_dispute_command.ts`
- `app/modules/reviews/controllers/report_review_dispute_controller.ts`
- `inertia/pages/reviews/disputes/show.svelte`
- `inertia/pages/admin/disputes/show.svelte`
- `inertia/pages/org/disputes/index.svelte`
- `inertia/pages/admin/disputes/index.svelte`

### Reverse reviews

- `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts`
- `app/modules/reviews/actions/support/reverse_review_target_stats.ts`
- `inertia/pages/reviews/components/reverse_review_list.svelte`
- `inertia/pages/reviews/reverse-reviews.svelte`
- `inertia/pages/org/reverse-reviews.svelte`
- `inertia/pages/admin/reviews/reverse-reviews.svelte`

### Organization / project / profile read models

- `app/modules/organizations/actions/queries/get_organization_show_page_query.ts`
- `app/modules/projects/actions/queries/get_project_detail_query.ts`
- `app/modules/users/actions/queries/get_profile_show_page_query.ts`
- `inertia/pages/organizations/show.svelte`
- `inertia/pages/projects/show.svelte`
- `inertia/pages/profile/components/profile_overview_section.svelte`

---

## Final note

This session already made strong progress and verified core backend behavior. The safest continuation is:

1. keep working from current worktree
2. avoid broad refactors
3. keep proving requirement-by-requirement with focused tests
4. do not mark goal complete until frontend + backend evidence is stronger for full end-to-end review governance

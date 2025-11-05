# Marketplace Module Split Design

## Goal

Tach marketplace thanh module rieng co ownership that su cho browse task, gui de xuat tham gia, rut de xuat, xem nguoi de xuat, va recruiting surface theo role. Phase nay uu tien dung boundary va UI flow, chua migrate storage khoi `task_applications`.

## Current State

Marketplace truoc day co hai duong song song:

- `/marketplace` redirect ve `/marketplace/tasks`.
- `/marketplace/tasks`, `/api/marketplace/tasks`, va `/api/v1/marketplace/tasks` do `app/modules/marketplace` serve.
- Proposal route `/api/v1/tasks/:taskId/apply` do marketplace controller own, nhung phase 1 van delegate xuong task command de ghi `task_applications`.
- Withdraw, my proposals, process proposal, review page, match/ranking routes do `app/modules/marketplace` own, nhung phase 1 van delegate query/command xuong task module va bang `task_applications`.
- `marketplace_applications` migration/schema van parked cho phase storage rieng.

Ket qua hien tai: marketplace da own browse/proposal/withdraw/my-proposals/review/process/ranking route boundary; storage va core invariants van delegate xuong tasks trong phase 1.

## Target Boundary

`app/modules/marketplace` owns:

- Marketplace task listing page and API contracts.
- Marketplace task detail context.
- Proposal submit and withdraw commands for public/external task proposals.
- Proposal review surface for marketplace submissions.
- Role-aware marketplace page props for user shell vs organization shell.

`app/modules/tasks` exposes ports:

- Read public/external tasks.
- Read task detail records needed by marketplace.
- Check proposal eligibility invariants.
- Assign task when proposal is approved.
- Invalidate task/proposal caches.

Storage phase 1:

- Keep `task_applications` as source of truth.
- Do not use `marketplace_applications` in runtime flow yet.
- Treat `marketplace_applications` migration/schema as parked until a separate storage migration phase.

## Role Flows

### Normal User

User sees `/marketplace/tasks` in app shell.

Expected actions:

- Browse external/all unassigned tasks.
- Filter by keyword, difficulty, skills, and sort.
- Send proposal with message and portfolio links.
- See proposal status on each card.
- Withdraw pending proposal.
- Navigate to `/my-applications`.

Normal user must not see org recruiting controls.

### Organization Owner/Admin

Org owner/admin sees marketplace in organization shell.

Expected actions:

- See marketplace demand as staffing/recruiting surface, not as a personal apply page.
- Navigate to create task, task proposals, talent directory, and bookmarks.
- For tasks owned by current organization/project, see proposal/review actions.
- For external tasks from other organizations, see read-only market signal.

Org owner/admin should not be encouraged to send personal proposals on their own org tasks.

### Project Owner/Manager

Project owner/manager can review proposals for tasks in projects they manage, even if not org owner/admin.

Expected actions:

- View proposals for project task.
- Approve/reject pending proposals.
- Use ranking/match data.

UI may use app shell or org shell depending current org role, but backend permission must allow project manager review.

### Org Member

Org member can browse marketplace as a normal user.

Org member must not call recruiting talent search/detail APIs unless they have recruiting/admin permission. Current page blocks this, but API route does not.

## Backend Requirements

1. Route ownership:
   - `/marketplace/tasks` Inertia route should be served by `app/modules/marketplace`.
   - `/api/marketplace/tasks` and `/api/v1/marketplace/tasks` should be served by `app/modules/marketplace`.
   - `/marketplace` should redirect to `/marketplace/tasks` or render the same marketplace page through marketplace module.

2. Proposal commands:
   - Marketplace proposal submit/withdraw commands live under `app/modules/marketplace`.
   - Commands write to `task_applications` through a marketplace repository adapter.
   - Commands reuse task eligibility and assignment invariants through tasks public ports instead of importing deep task infra where avoidable.

3. Proposal review:
   - Marketplace query/controller for task proposals lives under `app/modules/marketplace`.
   - Permission must allow task creator and project owner/manager.
   - If org owner/admin should manage all org task proposals, backend must explicitly support that.

4. Talent recruiting APIs:
   - Talent search/detail routes used by org recruiting must enforce the same access policy as `/org/talents`.
   - Bookmark APIs already call `ensureRecruiterAccess`; keep that pattern.

5. Deprecated/parked pieces:
   - Do not wire `marketplace_applications` into runtime flow in phase 1.
   - Avoid two active application sources.

## Frontend Requirements

1. Marketplace task route components now live under `inertia/apps/user/modules/marketplace/tasks.svelte` and `inertia/apps/org/modules/marketplace/tasks.svelte`; both receive role-aware props from the marketplace module.

2. Normal user card:
   - Primary CTA: send, withdraw, or manage proposal.
   - Secondary CTA: task detail.
   - Clear status: not applied, pending, approved, rejected.

3. Org owner/admin card:
   - Primary CTA for own/current org tasks: view proposals or manage task.
   - Secondary CTA: scout talent / open bookmarks.
   - External tasks from other orgs: personal proposal CTA is allowed only when actor is not in reviewer mode; otherwise show market signal.

4. Filters:
   - Expose backend-supported filters: keyword, difficulty, skills if data is available, sort by created/due date.
   - Preserve query params through pagination.

5. Org talents/bookmarks:
   - Keep under `/org/talents` and `/org/bookmarks`.
   - Polish labels and CTAs so they read as recruiting workspace.
   - Do not expose org-only controls in app shell.

## Testing Requirements

Backend tests:

- `/marketplace/tasks` route is handled by marketplace controller/page contract.
- `/marketplace` redirects or delegates to canonical marketplace task route.
- Marketplace proposal command writes `task_applications` and page state sees current proposal.
- Org member cannot access org talent search/detail API.
- Project manager can view/process applications for managed project task.

Frontend/component tests:

- Normal user sees proposal CTA and no org recruiting CTAs.
- Org owner/admin sees proposal/recruiting CTAs and does not see personal proposal CTA for own org task.
- Filters preserve keyword, difficulty, and sort params in pagination links.
- Empty states differ between user browse and org recruiting context.

## Out Of Scope For Phase 1

- Migrating runtime storage from `task_applications` to `marketplace_applications`.
- Removing all tasks module proposal/application commands before replacement coverage exists.
- Redesigning unrelated task detail pages.
- Changing review/ranking scoring formulas.

## Migration Notes

After phase 1 is stable, a separate phase can migrate storage:

1. Define canonical marketplace application schema.
2. Backfill from `task_applications`.
3. Update storage-backed my-proposals, ranking, process, audit, and assignment flows.
4. Remove compatibility reads after parity tests pass.

# Task Discussion And Review Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build task discussion with mentions and notifications, then extend review governance, dispute escalation, and organization reverse reviews across backend and frontend.

**Architecture:** Reuse `tasks`, `reviews`, and `notifications` modules. Add schema and contract extensions first, then wire backend commands/controllers, then update frontend surfaces that consume those contracts.

**Tech Stack:** AdonisJS, Lucid/Postgres, Svelte/Inertia, Vitest/Japa-style backend tests

## Global Constraints

- Use existing module boundaries; do not introduce a new top-level service unless existing modules cannot own the behavior cleanly.
- Preserve current API wrapping and camelCase response conventions.
- Keep task comments available to all actors who already have task access.
- Enforce creator-required review quorum before confirmation/dispute actions.

---

### Task 1: Discussion Schema And Notification Contracts

**Files:**
- Create: `database/migrations/20260706110000_extend_task_comments_and_review_governance.ts`
- Modify: `app/modules/tasks/infra/models/task_comment.ts`
- Modify: `app/modules/notifications/constants/notification_constants.ts`

**Interfaces:**
- Produces: mention-aware task comments and notification types for later backend/frontend work.

- [ ] Add migration for comment mentions, edited metadata, review relevance, review session governance fields, and dispute escalation fields.
- [ ] Update task comment model fields.
- [ ] Add notification constants for mentions and escalation.

### Task 2: Discussion Backend Commands And Controllers

**Files:**
- Modify: `app/modules/tasks/actions/commands/create_task_comment_command.ts`
- Modify: `app/modules/tasks/controllers/task_submission_controller.ts`

**Interfaces:**
- Consumes: Task 1 schema/contracts
- Produces: mention-aware comment create/list/update APIs

- [ ] Parse `@username` mentions during create/update.
- [ ] Persist mention rows and send notifications.
- [ ] Return comments with mention metadata and review relevance fields.

### Task 3: Review Governance Backend

**Files:**
- Modify: `app/modules/reviews/actions/commands/create_review_session_command.ts`
- Modify: `app/modules/reviews/actions/commands/submit_skill_review_command.ts`
- Modify: `app/modules/reviews/actions/commands/confirm_review_command.ts`
- Modify: `app/modules/reviews/infra/models/review_session.ts`

**Interfaces:**
- Consumes: Task 1 migration
- Produces: quorum-aware review sessions and blocked confirm/dispute until quorum

- [ ] Populate governance defaults at review-session creation.
- [ ] Recompute manager/peer/creator counters after each submission.
- [ ] Block confirm/dispute until quorum is satisfied.

### Task 4: Dispute Escalation And Case File Enrichment

**Files:**
- Modify: `app/modules/reviews/actions/commands/build_review_dispute_case_file_command.ts`
- Modify: `app/modules/reviews/actions/commands/respond_to_review_dispute_command.ts`
- Create: `app/modules/reviews/actions/commands/report_review_dispute_command.ts`
- Modify: `start/routes/reviews.ts`

**Interfaces:**
- Consumes: Task 1 migration, Task 2 discussion metadata, Task 3 governance state
- Produces: admin escalation flow with enriched case files

- [ ] Add report-to-admin command and route.
- [ ] Snapshot task comments including mention/review relevance metadata.
- [ ] Emit escalation notifications/audit signals.

### Task 5: Reverse Review Organization Targets

**Files:**
- Modify: `app/modules/reviews/actions/commands/submit_reverse_review_command.ts`
- Modify: `app/modules/reviews/actions/support/review_session_actor_access.ts`
- Modify: `app/modules/reviews/actions/queries/list_reverse_reviews_query.ts`

**Interfaces:**
- Consumes: existing reverse review flow
- Produces: organization-target reverse review reads and stats

- [ ] Keep organization target explicit and fully queryable.
- [ ] Add organization-target stats needed by org UI.

### Task 6: Frontend Discussion And Review Surfaces

**Files:**
- Modify: `inertia/pages/tasks/show.svelte`
- Modify: `inertia/pages/reviews/show.svelte`
- Modify: `inertia/pages/reviews/disputes/show.svelte`
- Modify: `inertia/pages/org/disputes/index.svelte`

**Interfaces:**
- Consumes: Tasks 2-5 backend contracts
- Produces: usable big-bang surfaces for discussion, governance, and escalation

- [ ] Render richer comment metadata and mention guidance in task discussion.
- [ ] Show review quorum state and lock/unlock confirm/dispute actions.
- [ ] Add dispute report CTA and status rendering.

### Task 7: Organization Reverse Review Surface

**Files:**
- Modify: `app/modules/reviews/controllers/show_reverse_reviews_page_controller.ts`
- Modify: `inertia/pages/org/reverse-reviews.svelte`

**Interfaces:**
- Consumes: Task 5 organization reverse review reads
- Produces: organization-facing reverse review visibility

- [ ] Add organization-focused summary cards and organization-target filtering.

### Task 8: Tests

**Files:**
- Create or modify tests under:
  - `app/modules/tasks/tests/backend/integration/`
  - `app/modules/reviews/tests/backend/integration/`
  - `inertia/tests/component/`

**Interfaces:**
- Consumes: all previous tasks
- Produces: regression coverage for new contracts and rules

- [ ] Cover mention notification and comment metadata.
- [ ] Cover quorum enforcement and dispute escalation.
- [ ] Cover organization reverse review stats/rendering.

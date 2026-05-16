# Organization Join Request Notification Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make organization join-request notifications identify the requester and open the authorized request-management screen from every notification shell.

**Architecture:** Keep notification rendering and deep-link resolution as the presentation boundary. Add a requester display-name snapshot at notification creation time, while leaving email and approve/reject actions in the existing organization request page.

**Tech Stack:** AdonisJS/TypeScript, Svelte 5, Inertia, Vitest/Japa, GitNexus CLI.

## Global Constraints

- Preserve unrelated existing worktree changes.
- Existing notifications without requester metadata must continue to render.
- Organization authorization remains enforced by `/org/invitations/requests`.
- Run GitNexus impact analysis before editing symbols and detect-changes before any commit.

### Task 1: Lock the notification rendering and deep-link behavior with tests

**Files:**
- Modify: `app/modules/notifications/tests/backend/unit/notification_catalog.spec.ts` or the focused renderer test location available in the current tree
- Modify: `inertia/apps/user/tests/modules/notifications/notification_deep_links.test.ts`

**Interfaces:**
- Consumes: `renderNotificationSnapshot`, `resolveNotificationDeepLink`
- Produces: failing regression tests for requester-aware copy and user-shell navigation

- [ ] **Step 1: Add a renderer test** asserting `organization_join_request` with `organizationName` and `requesterName` contains the requester name.
- [ ] **Step 2: Add a compatibility test** asserting the same notification without `requesterName` keeps the existing organization-only fallback.
- [ ] **Step 3: Add a deep-link test** asserting `organization_join_request` resolves to `/org/invitations/requests` from the user shell.
- [ ] **Step 4: Run the focused tests and confirm they fail for the missing behavior.**

### Task 2: Add requester identity to the notification snapshot

**Files:**
- Modify: `app/modules/organizations/actions/commands/invitations/create_join_request_command.ts`
- Modify: the existing user identity reader port/adapter used by organization commands, if required by current composition
- Modify: focused organization join-request integration/unit tests

**Interfaces:**
- Consumes: requesting user ID from `execCtx.userId`
- Produces: `parameters.requesterName` alongside `parameters.requesterId`

- [ ] **Step 1: Extend the command dependency using the existing user reader abstraction, not a direct model query.**
- [ ] **Step 2: Read the requester display name inside the transaction before staging notifications.**
- [ ] **Step 3: Add the failing assertion first for `requesterName`, then implement the minimal parameter addition.**
- [ ] **Step 4: Run the focused join-request integration test and notification contract test.**

### Task 3: Render requester-aware copy and resolve the correct destination

**Files:**
- Modify: `app/modules/notifications/domain/notification-feed/notification_renderer.ts`
- Modify: `inertia/apps/shared/notifications/notification_deep_links.ts`

**Interfaces:**
- Consumes: optional `requesterName` notification parameter and existing organization join-request type
- Produces: requester-aware message and `/org/invitations/requests` deep-link for user/org shells

- [ ] **Step 1: Make the renderer test pass with a requester-aware Vietnamese message and preserve the no-name fallback.**
- [ ] **Step 2: Make the resolver test pass by returning `/org/invitations/requests` for `organization_join_request` in the user shell.**
- [ ] **Step 3: Keep admin-shell behavior explicit and covered by the existing unresolved/authorization expectations.**
- [ ] **Step 4: Run all focused notification and organization tests.**

### Task 4: Verify the UI contract and repository impact

**Files:**
- Modify: `inertia/apps/user/tests/modules/notifications/notifications_page.test.ts` only if the current test lacks click coverage
- Modify: `inertia/apps/user/tests/shared/layout/notification_dropdown.stories.svelte` only if a story contract needs updating

- [ ] **Step 1: Run the notification page and dropdown/deep-link tests.**
- [ ] **Step 2: Run TypeScript/Svelte checks for the affected packages or the repository's documented test command.**
- [ ] **Step 3: Run `gitnexus detect-changes` and inspect that only expected notification/join-request symbols are affected.**
- [ ] **Step 4: Review the final diff and report any pre-existing failures separately.**

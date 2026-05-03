# Task Create Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify and clarify the task-create metadata popup in both organization and user workspaces without changing the task payload contract.

**Architecture:** Keep the existing `MetadataFields` component structure and select primitives. Remove only project/domain presentation, rename taxonomy labels with translation fallbacks, add helper copy for the task role, and replace visibility select markup with a native radio group while retaining the same `task_visibility` value updates.

**Tech Stack:** Svelte 5, TypeScript, Testing Library, Vitest, existing workspace UI components and translation store.

## Global Constraints

- Preserve `task_type`, `business_domain`, `problem_category`, `role_in_task`, and `task_visibility` payload keys.
- Apply equivalent changes in `inertia/apps/org` and `inertia/apps/user`.
- Do not modify unrelated existing worktree changes.
- Run focused tests before broader verification.

---

### Task 1: Lock the revised popup contract with tests

**Files:**
- Modify: `inertia/apps/org/tests/modules/tasks/components/modals/create_task_form.test.ts`
- Modify: `inertia/apps/user/tests/modules/tasks/components/modals/create_task_form.test.ts`

**Interfaces:**
- Consumes: existing `buildProps()` fixtures and rendered `CreateTaskForm`.
- Produces: assertions for labels, helper copy, hidden project/domain controls, and visibility control semantics.

- [ ] **Step 1: Add assertions for the revised labels and hidden fields**

Assert the setup tab contains `Dạng công việc`, `Bài toán cần giải quyết`, and `Vai trò cần cho task`; assert the old labels and `Nghiệp vụ`/`Dự án` presentation are absent.

- [ ] **Step 2: Add assertions for role guidance and radio choices**

Assert the role helper text is present and the three visibility choices are rendered as radio inputs with the current `internal` option selected.

- [ ] **Step 3: Run the focused tests and verify the expected failure**

Run:

```bash
npx vitest run inertia/apps/org/tests/modules/tasks/components/modals/create_task_form.test.ts inertia/apps/user/tests/modules/tasks/components/modals/create_task_form.test.ts
```

Expected: FAIL because the current component still renders the old labels, project/domain fields, and visibility select.

### Task 2: Implement the organization popup metadata changes

**Files:**
- Modify: `inertia/apps/org/modules/tasks/components/modals/create_task_form/metadata_fields.svelte`

**Interfaces:**
- Consumes: existing `formData`, `handleSelectChange`, translation store, taxonomy options, and assignee groups.
- Produces: clarified metadata UI with unchanged field names and values.

- [ ] **Step 1: Remove project and business-domain presentation**

Delete the selected-project display block and the business-domain select block. Keep the `project_id` prop/data contract intact for readiness and payload behavior.

- [ ] **Step 2: Rename task taxonomy labels through translation fallbacks**

Use the existing translation keys with Vietnamese fallback copy: `Dạng công việc`, `Bài toán cần giải quyết`, and `Vai trò cần cho task`. Keep the taxonomy option keys and values unchanged.

- [ ] **Step 3: Add role guidance without changing assignment semantics**

Render muted helper text below the role selector explaining that the role prioritizes suitable project members and is not the task creator/assignee field.

- [ ] **Step 4: Replace task visibility select with a radio group**

Render three labeled radio inputs bound to `formData.task_visibility`, calling `handleSelectChange('task_visibility', value)` on change. Preserve `internal`, `external`, and `all` values and the existing translated option labels.

- [ ] **Step 5: Run the organization focused test**

Run the organization test command from Task 1 and verify it passes.

### Task 3: Mirror the same behavior in the user popup

**Files:**
- Modify: `inertia/apps/user/modules/tasks/components/modals/create_task_form/metadata_fields.svelte`

**Interfaces:**
- Consumes: the existing user-workspace equivalents of the organization component APIs.
- Produces: the same visible labels, hidden fields, helper copy, and radio semantics in the user workspace.

- [ ] **Step 1: Apply the organization metadata markup changes to the user component**

Use the user workspace imports and translation store, while preserving the same field names and option values.

- [ ] **Step 2: Run both focused form tests**

Run:

```bash
npx vitest run inertia/apps/org/tests/modules/tasks/components/modals/create_task_form.test.ts inertia/apps/user/tests/modules/tasks/components/modals/create_task_form.test.ts
```

Expected: PASS.

### Task 4: Verify change scope and regressions

**Files:**
- No additional source files.

- [ ] **Step 1: Run typecheck/lint command used by the frontend workspace**

Inspect package scripts and run the narrowest available check covering Svelte/TypeScript compilation.

- [ ] **Step 2: Run GitNexus change detection**

Run `gitnexus detect-changes` from the repository root and confirm only the intended task-create components and tests are reported as affected by this work.

- [ ] **Step 3: Review the diff for unrelated changes**

Use `git diff --` with the exact modified paths and confirm existing unrelated worktree changes were not staged or overwritten.

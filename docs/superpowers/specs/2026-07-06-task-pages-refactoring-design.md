# Design Specification: Refactoring Task Detail and Create Pages

Current-state update 2026-07-17: this spec was written before the frontend multi-app split. Current task pages live under `inertia/apps/user/modules/tasks/*` and `inertia/apps/org/modules/tasks/*`; old `inertia/pages/tasks/*` paths below are legacy path references.

## 1. Goal

The objective is to refactor two large Inertia Svelte page files:
* `inertia/apps/user/modules/tasks/show.svelte` and `inertia/apps/org/modules/tasks/show.svelte`
* `inertia/apps/user/modules/tasks/create.svelte` and `inertia/apps/org/modules/tasks/create.svelte`

We will adhere to the **Single Responsibility Principle (SRP)** and **SOLID** design principles by breaking down these monolithic pages into modular, highly cohesive, and reusable components under the design system.

---

## 2. Refactoring `tasks/show.svelte`

### Proposed Structure
Instead of managing layout, audit logs, comments API state, and files upload API state in one file, we will delegate these concerns to specific subcomponents.

```
inertia/apps/{user,org}/modules/tasks/
├── show.svelte (Page Layout, Routing Actions only)
└── components/
    └── detail/
        ├── task_context_card.svelte (NEW - renders task context metadata card)
        ├── task_discussion_tab.svelte (NEW - encapsulated comments state & API calls)
        ├── task_files_tab.svelte (NEW - encapsulated file attachments state & API calls)
        └── task_history_tab.svelte (NEW - renders change logs)
```

### Components Specification

#### A. [NEW] `task_context_card.svelte`
* **Purpose**: Display the business context, acceptance criteria, verification method, tech stack, domain tags, learning objectives, and custom metadata for the task.
* **Props**:
  * `task: Task`
* **Internal Imports**:
  * `TaskExecutionBrief`

#### B. [NEW] `task_discussion_tab.svelte`
* **Purpose**: Manage and render comments. Encapsulated axios requests and local state.
* **Props**:
  * `taskId: string`
  * `currentUserId: string | null`
* **State Managed Internally**:
  * `comments`, `loadingComments`, `savingComment`, `deletingCommentId`, `editingCommentId`, `updatingComment`
  * `commentBody`, `commentReviewRelevance`, `editCommentBody`, `editCommentReviewRelevance`
* **API Handlers**:
  * `loadComments()`, `submitComment()`, `removeComment()`, `saveCommentEdit()`, `startEditingComment()`, `cancelEditingComment()`

#### C. [NEW] `task_files_tab.svelte`
* **Purpose**: Manage and render file attachments. Encapsulated axios requests and form state.
* **Props**:
  * `taskId: string`
  * `currentUserId: string | null`
* **State Managed Internally**:
  * `attachments`, `loadingAttachments`, `savingAttachment`, `deletingAttachmentId`
  * `attachmentForm`
* **API Handlers**:
  * `loadAttachments()`, `submitAttachment()`, `removeAttachment()`

#### D. [NEW] `task_history_tab.svelte`
* **Purpose**: Render the audit history logs of changes.
* **Props**:
  * `auditLogs: AuditLog[]`

---

## 3. Refactoring `tasks/create.svelte`

### Proposed Structure
We will extract the contract readiness checks and the professional role prefilling features into clean subcomponents.

```
inertia/apps/{user,org}/modules/tasks/
├── create.svelte (Page Shell, main Form Submit handler)
└── components/
    └── detail/
        ├── task_readiness_card.svelte (NEW - contract checklist card)
        └── task_role_prefill_panel.svelte (NEW - professional role suggestion & prefill panel)
```

### Components Specification

#### A. [NEW] `task_readiness_card.svelte`
* **Purpose**: Render the checklist showcasing task readiness before assignment.
* **Props**:
  * `contractChecks: Array<{ key: string; label: string; done: boolean }>`
  * `completedContractChecks: number`
  * `contractReadyForAssignment: boolean`

#### B. [NEW] `task_role_prefill_panel.svelte`
* **Purpose**: Load available roles for the project, handle role-based prefilling of skills & criteria templates, and recommend candidates.
* **Props**:
  * `projectId: string`
  * `assignedTo: string`
  * `requestedTaskType: string`
  * `requestedRoleId: string`
  * `assigneeGroups: any`
  * `formData: any`
  * `setFormData: Function`
  * `projectProfessionalRoleId: string` (bindable)
* **State Managed Internally**:
  * `selectedRoleId`, `availableRoles`, `prefilling`, `didAutoPrefillFromQuery`
* **API Handlers**:
  * `fetchAvailableRoles()`, `prefillRoleRequirements()`

---

## 4. Verification Plan

We will run automated type checks and lints to ensure there are no compilation or typescript errors:
* `pnpm run typecheck`
* `pnpm run svelte-check`
* `pnpm run lint:frontend`

We will also verify page functionality manually (or run unit tests) to guarantee that comments load, tệp uploads work, history displays correctly, and role-prefills fill fields as they did before.

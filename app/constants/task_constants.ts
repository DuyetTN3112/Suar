/**
 * Task Constants
 *
 * Constants liên quan đến Task, TaskApplication, TaskAssignment.
 * v3.0: task_status, task_label, task_priority, task_difficulty_levels tables xóa
 *       → inline VARCHAR CHECK trên tasks table
 *
 * CLEANUP 2026-03-01:
 *   - XÓA tất cả *Options arrays → 0 usages (frontend không import)
 *   - XÓA tất cả get*Name/get*NameVi helper functions → 0 usages
 *   - XÓA TaskListingType, taskListingTypeOptions → DB v3 không có listing_type column
 *
 * @module TaskConstants
 */

// ============================================================================
// Task Status (v3.0: was task_status table)
// ============================================================================

/**
 * Task Status — v3.0 inline CHECK trên tasks.status
 * CHECK ('todo','in_progress','done','cancelled','in_review')
 *
 * Phase 4 note: Will be replaced by task_statuses table (per-org configurable).
 * Kept for backward compatibility during migration.
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
  IN_REVIEW = 'in_review',
}

// ============================================================================
// Task Status Category (v4.0: system-fixed categories)
// ============================================================================

/**
 * Task Status Category — System-fixed, 4 categories.
 * Each custom status MUST belong to exactly 1 category.
 * System behaviors (review trigger, assignment completion) are tied to CATEGORY.
 *
 * - todo: Not started. Default for new tasks. No assignee required.
 * - in_progress: Working. REQUIRES assignee (assigned_to ≠ null).
 * - done: Completed. TERMINAL + AUTO-TRIGGER REVIEW.
 * - cancelled: Cancelled. Can reopen → todo.
 */
export enum TaskStatusCategory {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

/**
 * Default task statuses seeded when creating a new organization.
 * System statuses (is_system=true) cannot be deleted or have their category changed.
 */
export const DEFAULT_TASK_STATUSES: ReadonlyArray<{
  name: string
  slug: string
  category: TaskStatusCategory
  color: string
  sort_order: number
  is_default: boolean
  is_system: boolean
}> = [
  {
    name: 'TODO',
    slug: 'todo',
    category: TaskStatusCategory.TODO,
    color: '#6B7280',
    sort_order: 0,
    is_default: true,
    is_system: true,
  },
  {
    name: 'IN_PROGRESS',
    slug: 'in_progress',
    category: TaskStatusCategory.IN_PROGRESS,
    color: '#3B82F6',
    sort_order: 1,
    is_default: false,
    is_system: true,
  },
  {
    name: 'DONE_DEV',
    slug: 'done_dev',
    category: TaskStatusCategory.IN_PROGRESS,
    color: '#8B5CF6',
    sort_order: 2,
    is_default: false,
    is_system: false,
  },
  {
    name: 'IN_TESTING',
    slug: 'in_testing',
    category: TaskStatusCategory.IN_PROGRESS,
    color: '#F59E0B',
    sort_order: 3,
    is_default: false,
    is_system: false,
  },
  {
    name: 'REJECTED',
    slug: 'rejected',
    category: TaskStatusCategory.IN_PROGRESS,
    color: '#EF4444',
    sort_order: 4,
    is_default: false,
    is_system: false,
  },
  {
    name: 'DONE',
    slug: 'done',
    category: TaskStatusCategory.DONE,
    color: '#10B981',
    sort_order: 5,
    is_default: false,
    is_system: true,
  },
  {
    name: 'CANCELLED',
    slug: 'cancelled',
    category: TaskStatusCategory.CANCELLED,
    color: '#9CA3AF',
    sort_order: 6,
    is_default: false,
    is_system: true,
  },
]

/**
 * Default workflow transitions seeded for new orgs.
 * Keys: "from_slug → to_slug", value: conditions JSON.
 */
export const DEFAULT_WORKFLOW_TRANSITIONS: Array<{
  from_slug: string
  to_slug: string
  conditions: Record<string, unknown>
}> = [
  { from_slug: 'todo', to_slug: 'in_progress', conditions: { requires_assignee: true } },
  { from_slug: 'todo', to_slug: 'cancelled', conditions: {} },
  { from_slug: 'in_progress', to_slug: 'done_dev', conditions: {} },
  { from_slug: 'in_progress', to_slug: 'todo', conditions: {} },
  { from_slug: 'in_progress', to_slug: 'cancelled', conditions: {} },
  { from_slug: 'done_dev', to_slug: 'in_testing', conditions: {} },
  { from_slug: 'done_dev', to_slug: 'in_progress', conditions: {} },
  { from_slug: 'done_dev', to_slug: 'cancelled', conditions: {} },
  { from_slug: 'in_testing', to_slug: 'done', conditions: {} },
  { from_slug: 'in_testing', to_slug: 'rejected', conditions: {} },
  { from_slug: 'in_testing', to_slug: 'cancelled', conditions: {} },
  { from_slug: 'rejected', to_slug: 'in_progress', conditions: {} },
  { from_slug: 'rejected', to_slug: 'cancelled', conditions: {} },
  { from_slug: 'cancelled', to_slug: 'todo', conditions: {} },
]

/**
 * Statuses considered as "incomplete" (not done/cancelled)
 * Phase 4 note: Prefer TaskStatusCategory checks where possible.
 */
export const INCOMPLETE_TASK_STATUSES = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
] as const

/**
 * Statuses considered as "terminal" (final state)
 * Phase 4 note: Prefer TaskStatusCategory checks where possible.
 * Terminal categories: TaskStatusCategory.DONE, TaskStatusCategory.CANCELLED
 */
export const TERMINAL_TASK_STATUSES = [TaskStatus.DONE, TaskStatus.CANCELLED] as const

/**
 * Terminal status categories — use these for v4 category-based checks.
 */
export const TERMINAL_STATUS_CATEGORIES = [
  TaskStatusCategory.DONE,
  TaskStatusCategory.CANCELLED,
] as const

// ============================================================================
// Task Label (v3.0: was task_labels table)
// ============================================================================

/**
 * Task Label — v3.0 inline CHECK trên tasks.label
 * CHECK ('bug','feature','enhancement','documentation')
 */
export enum TaskLabel {
  BUG = 'bug',
  FEATURE = 'feature',
  ENHANCEMENT = 'enhancement',
  DOCUMENTATION = 'documentation',
}

// ============================================================================
// Task Priority (v3.0: was task_priorities table)
// ============================================================================

/**
 * Task Priority — v3.0 inline CHECK trên tasks.priority
 * CHECK ('low','medium','high','urgent')
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ============================================================================
// Task Difficulty (v3.0: was task_difficulty_levels table)
// ============================================================================

/**
 * Task Difficulty — v3.0 inline CHECK trên tasks.difficulty
 * CHECK ('easy','medium','hard','expert')
 */
export enum TaskDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

// ============================================================================
// Task Visibility — Marketplace (v4)
// ============================================================================

/**
 * Task Visibility — v4 marketplace CHECK trên tasks.task_visibility
 * CHECK ('internal','external','all')
 */
export enum TaskVisibility {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  ALL = 'all',
}

// ============================================================================
// Task Application Status
// ============================================================================

/**
 * Task Application Status
 * v3.0 CHECK: 'pending', 'approved', 'rejected', 'withdrawn'
 */
export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

/**
 * Task Application Source
 * v3.0 CHECK: 'public_listing', 'invitation', 'referral'
 */
export enum ApplicationSource {
  PUBLIC_LISTING = 'public_listing',
  INVITATION = 'invitation',
  REFERRAL = 'referral',
}

// ============================================================================
// Task Assignment Status
// ============================================================================

/**
 * Task Assignment Status
 * v3.0 CHECK: 'active', 'completed', 'cancelled' (PAUSED removed)
 */
export enum AssignmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Task Assignment Type
 * v3.0 CHECK: 'member', 'freelancer', 'volunteer'
 */
export enum AssignmentType {
  MEMBER = 'member',
  FREELANCER = 'freelancer',
  VOLUNTEER = 'volunteer',
}

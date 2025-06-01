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
 */
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  CANCELLED = 'cancelled',
  IN_REVIEW = 'in_review',
}

/**
 * Statuses considered as "incomplete" (not done/cancelled)
 */
export const INCOMPLETE_TASK_STATUSES = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
] as const

/**
 * Statuses considered as "terminal" (final state)
 */
export const TERMINAL_TASK_STATUSES = [TaskStatus.DONE, TaskStatus.CANCELLED] as const

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

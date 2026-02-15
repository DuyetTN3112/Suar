import type OrganizationUser from '#models/organization_user'
import type Organization from '#models/organization'
import type Project from '#models/project'
import type Task from '#models/task'
import type Message from '#models/message'
import type Conversation from '#models/conversation'
import type { DatabaseId } from '#types/database'

/**
 * Domain Events — khai báo tất cả events trong ứng dụng.
 *
 * Mỗi event tương ứng với 1 hoặc nhiều MySQL triggers/procedures
 * đã được chuyển sang Application layer.
 *
 * Sprint 4: All ID fields use `DatabaseId` (number | string)
 * to support both MySQL INT and PostgreSQL UUIDv7.
 *
 * Pattern: AdonisJS Emitter typed events
 * Ref: https://docs.adonisjs.com/guides/digging-deeper/emitter
 */

// === ORGANIZATION EVENTS ===
// Thay thế: after_organization_insert trigger (auto-create owner membership)
// Thay thế: before_organization_insert trigger (auto-generate slug)

export interface OrganizationCreatedEvent {
  organization: Organization
  ownerId: DatabaseId
  /** IP address của người tạo */
  ip?: string
}

export interface OrganizationUpdatedEvent {
  organization: Organization
  updatedBy: DatabaseId
  changes: Record<string, unknown>
}

export interface OrganizationDeletedEvent {
  organizationId: DatabaseId
  deletedBy: DatabaseId
}

// === ORGANIZATION MEMBER EVENTS ===
// Thay thế: approve_organization_membership procedure
// Thay thế: after_organization_user_update trigger (remove from conversations on status change)

export interface OrganizationMemberAddedEvent {
  organizationId: DatabaseId
  userId: DatabaseId
  roleId: DatabaseId
  invitedBy: DatabaseId | null
}

export interface OrganizationMemberRemovedEvent {
  organizationId: DatabaseId
  userId: DatabaseId
  removedBy: DatabaseId
}

export interface OrganizationMemberRoleChangedEvent {
  organizationId: DatabaseId
  userId: DatabaseId
  oldRoleId: DatabaseId
  newRoleId: DatabaseId
  changedBy: DatabaseId
}

export interface OrganizationMemberApprovedEvent {
  membership: OrganizationUser
  approvedBy: DatabaseId
}

// === PROJECT EVENTS ===
// Thay thế: after_project_insert trigger (auto-create owner project_member)
// Thay thế: before_insert_project trigger (validate permission + set defaults)

export interface ProjectCreatedEvent {
  project: Project
  creatorId: DatabaseId
  organizationId: DatabaseId
}

export interface ProjectUpdatedEvent {
  project: Project
  updatedBy: DatabaseId
  changes: Record<string, unknown>
}

export interface ProjectDeletedEvent {
  projectId: DatabaseId
  organizationId: DatabaseId
  deletedBy: DatabaseId
}

export interface ProjectMemberAddedEvent {
  projectId: DatabaseId
  userId: DatabaseId
  roleId: DatabaseId
  addedBy: DatabaseId
}

export interface ProjectMemberRemovedEvent {
  projectId: DatabaseId
  userId: DatabaseId
  removedBy: DatabaseId
}

export interface ProjectOwnershipTransferredEvent {
  projectId: DatabaseId
  fromUserId: DatabaseId
  toUserId: DatabaseId
  transferredBy: DatabaseId
}

// === TASK EVENTS ===
// Thay thế: task_version_after_update trigger (create version snapshot)
// Thay thế: check_assigned_to_insert, check_creator_organization triggers
// Thay thế: before_task_project_insert/update triggers

export interface TaskCreatedEvent {
  task: Task
  creatorId: DatabaseId
  organizationId: DatabaseId
  projectId: DatabaseId | null
}

export interface TaskUpdatedEvent {
  task: Task
  updatedBy: DatabaseId
  changes: Record<string, unknown>
  /** Snapshot trước khi update — cho task_versions */
  previousValues: Record<string, unknown>
}

export interface TaskStatusChangedEvent {
  task: Task
  oldStatusId: DatabaseId
  newStatusId: DatabaseId
  changedBy: DatabaseId
}

export interface TaskAssignedEvent {
  taskId: DatabaseId
  assigneeId: DatabaseId
  assignedBy: DatabaseId
  assignmentType: string
}

export interface TaskAccessRevokedEvent {
  taskId: DatabaseId
  userId: DatabaseId
  revokedBy: DatabaseId
  reason?: string
}

// === MESSAGE EVENTS ===
// Thay thế: update_last_message_at trigger (after INSERT on messages)
// Thay thế: after_message_delete trigger (update last_message_id)

export interface MessageSentEvent {
  message: Message
  conversation: Conversation
  senderId: DatabaseId
}

export interface MessageDeletedEvent {
  messageId: DatabaseId
  conversationId: DatabaseId
}

// === CONVERSATION EVENTS ===

export interface ConversationCreatedEvent {
  conversation: Conversation
  creatorId: DatabaseId
  participantIds: DatabaseId[]
}

// === USER EVENTS ===
// Thay thế: before_update_user_current_org trigger (validate org membership)
// Thay thế: before_user_insert/update triggers

export interface UserApprovedEvent {
  userId: DatabaseId
  approvedBy: DatabaseId
  organizationId: DatabaseId
}

export interface UserDeactivatedEvent {
  userId: DatabaseId
  deactivatedBy: DatabaseId
  reason?: string
}

export interface UserProfileUpdatedEvent {
  userId: DatabaseId
  changes: Record<string, unknown>
}

// === USER AUTH EVENTS (Sprint 7) ===

export interface UserLoginEvent {
  userId: DatabaseId
  ip: string
  userAgent: string
  /** 'web' | 'api' | 'oauth' */
  method: string
}

export interface UserLogoutEvent {
  userId: DatabaseId
  ip: string
}

// === TASK APPLICATION EVENTS (Sprint 7) ===
// When a user applies to work on a task, and when the application is reviewed

export interface TaskApplicationSubmittedEvent {
  applicationId: DatabaseId
  taskId: DatabaseId
  applicantId: DatabaseId
  projectId: DatabaseId
  /** The project owner or task creator who should be notified */
  ownerId: DatabaseId
}

export interface TaskApplicationReviewedEvent {
  applicationId: DatabaseId
  taskId: DatabaseId
  applicantId: DatabaseId
  reviewedBy: DatabaseId
  /** 'approved' | 'rejected' */
  status: string
}

// === REVIEW EVENTS (Sprint 7) ===

export interface ReviewSubmittedEvent {
  reviewSessionId: DatabaseId
  reviewerId: DatabaseId
  revieweeId: DatabaseId
  taskId: DatabaseId
  /** Scores per skill category */
  scores: Record<string, number>
}

export interface ReviewConfirmedEvent {
  confirmationId: DatabaseId
  reviewSessionId: DatabaseId
  reviewerId: DatabaseId
  confirmedBy: DatabaseId
}

// === SKILL EVENTS (Sprint 7) ===

export interface SkillScoreUpdatedEvent {
  userId: DatabaseId
  skillId: DatabaseId
  oldScore: number | null
  newScore: number
}

// === AUDIT LOG EVENT ===
// Centralized audit log — thay thế log_audit() stored procedure

export interface AuditLogEvent {
  userId: DatabaseId | null
  action: string
  entityType?: string
  entityId?: number | string | null
  ipAddress?: string
  userAgent?: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
}

// === NOTIFICATION EVENT ===
// Thay thế create_notification() stored procedure

export interface NotificationCreatedEvent {
  userId: DatabaseId
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
}

// === CACHE INVALIDATION EVENT ===
// Centralized cache invalidation

export interface CacheInvalidationEvent {
  entityType: string
  entityId?: number | string
  /** Patterns để invalidate (ví dụ: 'tasks:*', 'org:5:*') */
  patterns?: string[]
}

// === TYPE MAP cho AdonisJS Emitter ===

declare module '@adonisjs/core/types' {
  interface EventsList {
    // Organization
    'organization:created': OrganizationCreatedEvent
    'organization:updated': OrganizationUpdatedEvent
    'organization:deleted': OrganizationDeletedEvent
    'organization:member:added': OrganizationMemberAddedEvent
    'organization:member:removed': OrganizationMemberRemovedEvent
    'organization:member:role_changed': OrganizationMemberRoleChangedEvent
    'organization:member:approved': OrganizationMemberApprovedEvent

    // Project
    'project:created': ProjectCreatedEvent
    'project:updated': ProjectUpdatedEvent
    'project:deleted': ProjectDeletedEvent
    'project:member:added': ProjectMemberAddedEvent
    'project:member:removed': ProjectMemberRemovedEvent
    'project:ownership:transferred': ProjectOwnershipTransferredEvent

    // Task
    'task:created': TaskCreatedEvent
    'task:updated': TaskUpdatedEvent
    'task:status:changed': TaskStatusChangedEvent
    'task:assigned': TaskAssignedEvent
    'task:access:revoked': TaskAccessRevokedEvent

    // Conversation & Message
    'message:sent': MessageSentEvent
    'message:deleted': MessageDeletedEvent
    'conversation:created': ConversationCreatedEvent

    // User
    'user:approved': UserApprovedEvent
    'user:deactivated': UserDeactivatedEvent
    'user:profile:updated': UserProfileUpdatedEvent
    'user:login': UserLoginEvent
    'user:logout': UserLogoutEvent

    // Task Applications
    'task:application:submitted': TaskApplicationSubmittedEvent
    'task:application:reviewed': TaskApplicationReviewedEvent

    // Reviews
    'review:submitted': ReviewSubmittedEvent
    'review:confirmed': ReviewConfirmedEvent

    // Skills
    'skill:score:updated': SkillScoreUpdatedEvent

    // Cross-cutting
    'audit:log': AuditLogEvent
    'notification:created': NotificationCreatedEvent
    'cache:invalidate': CacheInvalidationEvent
  }
}

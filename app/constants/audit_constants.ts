/**
 * Audit Constants
 *
 * Constants liên quan đến Audit Log, Action Log.
 * Pattern học từ ancarat-bo: enum + options array + helper function
 *
 * @module AuditConstants
 */

/**
 * Audit Action Types
 * Các loại hành động trong hệ thống
 */
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SOFT_DELETE = 'soft_delete',
  HARD_DELETE = 'hard_delete',
  RESTORE = 'restore',
  LOGIN = 'login',
  LOGOUT = 'logout',
  APPROVE = 'approve',
  REJECT = 'reject',
  INVITE = 'invite',
  JOIN = 'join',
  LEAVE = 'leave',
  TRANSFER = 'transfer',
  // Task-specific actions
  ASSIGN = 'assign',
  UNASSIGN = 'unassign',
  UPDATE_STATUS = 'update_status',
  UPDATE_TIME = 'update_time',
  REVOKE_ACCESS = 'revoke_task_access',
  // Organization-specific actions
  SWITCH_ORGANIZATION = 'switch_organization',
  DEACTIVATE = 'deactivate',
  UPDATE_MEMBER_ROLE = 'update_member_role',
}

export const auditActionOptions = [
  { label: 'Create', labelVi: 'Tạo mới', value: AuditAction.CREATE },
  { label: 'Update', labelVi: 'Cập nhật', value: AuditAction.UPDATE },
  { label: 'Delete', labelVi: 'Xóa', value: AuditAction.DELETE },
  { label: 'Soft Delete', labelVi: 'Xóa mềm', value: AuditAction.SOFT_DELETE },
  { label: 'Hard Delete', labelVi: 'Xóa vĩnh viễn', value: AuditAction.HARD_DELETE },
  { label: 'Restore', labelVi: 'Khôi phục', value: AuditAction.RESTORE },
  { label: 'Login', labelVi: 'Đăng nhập', value: AuditAction.LOGIN },
  { label: 'Logout', labelVi: 'Đăng xuất', value: AuditAction.LOGOUT },
  { label: 'Approve', labelVi: 'Phê duyệt', value: AuditAction.APPROVE },
  { label: 'Reject', labelVi: 'Từ chối', value: AuditAction.REJECT },
  { label: 'Invite', labelVi: 'Mời', value: AuditAction.INVITE },
  { label: 'Join', labelVi: 'Tham gia', value: AuditAction.JOIN },
  { label: 'Leave', labelVi: 'Rời khỏi', value: AuditAction.LEAVE },
  { label: 'Transfer', labelVi: 'Chuyển giao', value: AuditAction.TRANSFER },
  // Task-specific actions
  { label: 'Assign', labelVi: 'Giao việc', value: AuditAction.ASSIGN },
  { label: 'Unassign', labelVi: 'Bỏ giao việc', value: AuditAction.UNASSIGN },
  { label: 'Update Status', labelVi: 'Cập nhật trạng thái', value: AuditAction.UPDATE_STATUS },
  { label: 'Update Time', labelVi: 'Cập nhật thời gian', value: AuditAction.UPDATE_TIME },
  { label: 'Revoke Access', labelVi: 'Thu hồi quyền truy cập', value: AuditAction.REVOKE_ACCESS },
  // Organization-specific actions
  {
    label: 'Switch Organization',
    labelVi: 'Chuyển tổ chức',
    value: AuditAction.SWITCH_ORGANIZATION,
  },
  { label: 'Deactivate', labelVi: 'Vô hiệu hóa', value: AuditAction.DEACTIVATE },
  {
    label: 'Update Member Role',
    labelVi: 'Cập nhật vai trò thành viên',
    value: AuditAction.UPDATE_MEMBER_ROLE,
  },
]

export function getAuditActionLabel(action: AuditAction): string {
  return auditActionOptions.find((option) => option.value === action)?.label ?? 'Unknown'
}

export function getAuditActionLabelVi(action: AuditAction): string {
  return auditActionOptions.find((option) => option.value === action)?.labelVi ?? 'Không xác định'
}

/**
 * Entity Types
 * Các loại entity trong hệ thống (dùng cho audit log)
 */
export enum EntityType {
  USER = 'user',
  ORGANIZATION = 'organization',
  ORGANIZATION_USER = 'organization_user',
  PROJECT = 'project',
  PROJECT_MEMBER = 'project_member',
  TASK = 'task',
  TASK_APPLICATION = 'task_application',
  TASK_ASSIGNMENT = 'task_assignment',
  REVIEW = 'review',
  NOTIFICATION = 'notification',
  CONVERSATION = 'conversation',
  MESSAGE = 'message',
}

export const entityTypeOptions = [
  { label: 'User', labelVi: 'Người dùng', value: EntityType.USER },
  { label: 'Organization', labelVi: 'Tổ chức', value: EntityType.ORGANIZATION },
  {
    label: 'Organization User',
    labelVi: 'Thành viên tổ chức',
    value: EntityType.ORGANIZATION_USER,
  },
  { label: 'Project', labelVi: 'Dự án', value: EntityType.PROJECT },
  { label: 'Project Member', labelVi: 'Thành viên dự án', value: EntityType.PROJECT_MEMBER },
  { label: 'Task', labelVi: 'Công việc', value: EntityType.TASK },
  { label: 'Task Application', labelVi: 'Đơn ứng tuyển', value: EntityType.TASK_APPLICATION },
  { label: 'Task Assignment', labelVi: 'Phân công', value: EntityType.TASK_ASSIGNMENT },
  { label: 'Review', labelVi: 'Đánh giá', value: EntityType.REVIEW },
  { label: 'Notification', labelVi: 'Thông báo', value: EntityType.NOTIFICATION },
  { label: 'Conversation', labelVi: 'Cuộc trò chuyện', value: EntityType.CONVERSATION },
  { label: 'Message', labelVi: 'Tin nhắn', value: EntityType.MESSAGE },
]

export function getEntityTypeLabel(entityType: EntityType): string {
  return entityTypeOptions.find((option) => option.value === entityType)?.label ?? 'Unknown'
}

/**
 * Fields to log for each entity type
 * Các fields cần log khi audit (pattern từ ancarat-bo)
 */
export const AUDIT_LOG_FIELDS = {
  [EntityType.USER]: ['id', 'username', 'email', 'status_id'] as const,
  [EntityType.ORGANIZATION]: ['id', 'name', 'slug', 'owner_id', 'plan'] as const,
  [EntityType.ORGANIZATION_USER]: ['organization_id', 'user_id', 'role_id', 'status'] as const,
  [EntityType.PROJECT]: ['id', 'name', 'organization_id', 'owner_id', 'status_id'] as const,
  [EntityType.TASK]: ['id', 'title', 'status_id', 'assigned_to', 'project_id'] as const,
} as const

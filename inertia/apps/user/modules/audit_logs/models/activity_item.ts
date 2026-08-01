export type AuditActivityCategory =
  | 'account'
  | 'access'
  | 'security'
  | 'organization'
  | 'membership'
  | 'project'
  | 'task'
  | 'review'
  | 'billing'
  | 'activity'

export type AuditActivityOutcome = 'recorded' | 'success' | 'warning' | 'failure'

export type UserAuditPerspective = 'performed_by_you' | 'affected_you'

export type UserAuditActivityKey =
  | 'account.created'
  | 'account.profile_updated'
  | 'account.restricted'
  | 'access.updated'
  | 'activity.recorded'
  | 'billing.created'
  | 'billing.removed'
  | 'billing.updated'
  | 'membership.invitation'
  | 'membership.removed'
  | 'membership.role_changed'
  | 'membership.updated'
  | 'organization.created'
  | 'organization.removed'
  | 'organization.updated'
  | 'project.created'
  | 'project.removed'
  | 'project.updated'
  | 'review.created'
  | 'review.removed'
  | 'review.updated'
  | 'security.activity'
  | 'security.connected_account'
  | 'security.credential_changed'
  | 'security.login'
  | 'security.logout'
  | 'task.created'
  | 'task.removed'
  | 'task.updated'

export type UserAuditActorType =
  | 'you'
  | 'another_authorized_user'
  | 'system'
  | 'automation'
  | 'integration'
  | 'unknown'

export type UserAuditChangeOperation = 'added' | 'removed' | 'changed'

export interface UserAuditChangeItem {
  readonly field: string
  readonly operation: UserAuditChangeOperation
  readonly before: string | number | boolean | null
  readonly after: string | number | boolean | null
  readonly redacted: boolean
}

export interface UserAuditActivityItem {
  readonly id: string
  readonly category: AuditActivityCategory
  readonly outcome: AuditActivityOutcome
  readonly title: string
  readonly description: string
  readonly occurredAt: string
  readonly activityKey: UserAuditActivityKey
  readonly perspective: UserAuditPerspective
  readonly actor: {
    readonly type: UserAuditActorType
    readonly label: string
  }
  readonly subject: {
    readonly category: AuditActivityCategory
    readonly label: string
  }
  readonly changes: readonly UserAuditChangeItem[]
  readonly changeCount: number
  readonly hasHiddenChanges: boolean
}

export interface UserAuditFilters {
  readonly search: string
  readonly resourceType: string | null
  readonly outcome: AuditActivityOutcome | null
  readonly from: string | null
  readonly to: string | null
  readonly after: string | null
  readonly before: string | null
}

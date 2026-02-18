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

export interface UserAuditActivityItem {
  readonly category: AuditActivityCategory
  readonly outcome: AuditActivityOutcome
  readonly title: string
  readonly description: string
  readonly occurredAt: string
}

export type OrganizationAuditActorType =
  | 'user'
  | 'deleted_user'
  | 'system'
  | 'automation'
  | 'integration'
  | 'unknown'

export type OrganizationAuditChangeOperation = 'added' | 'removed' | 'changed'

export interface OrganizationAuditChangeItem {
  readonly field: string
  readonly operation: OrganizationAuditChangeOperation
  readonly before: string | number | boolean | null
  readonly after: string | number | boolean | null
  readonly redacted: boolean
}

export interface OrganizationAuditActivityItem {
  readonly id: string
  readonly category: AuditActivityCategory
  readonly outcome: AuditActivityOutcome
  readonly title: string
  readonly description: string
  readonly occurredAt: string
  readonly actionCode: string
  readonly actionKey: string
  readonly actor: {
    readonly type: OrganizationAuditActorType
    readonly label: string
    readonly roleLabel: string | null
  }
  readonly target: {
    readonly type: string
    readonly id: string | null
    readonly label: string
  }
  readonly changes: readonly OrganizationAuditChangeItem[]
  readonly changeCount: number
  /** Compatibility labels for older server responses. */
  readonly actorLabel: string
  readonly subjectLabel: string
}

export interface OrganizationAuditFilters {
  readonly search: string
  readonly action: string | null
  readonly resourceType: string | null
  readonly outcome: AuditActivityOutcome | null
  readonly userId: string | null
  readonly from: string | null
  readonly to: string | null
  readonly after: string | null
  readonly before: string | null
}

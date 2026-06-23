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

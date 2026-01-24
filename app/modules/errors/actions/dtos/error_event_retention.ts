import type { ErrorEventServicePrincipalIdentity } from '#modules/authorization/public_contracts/error_event_service_principal'

export interface ErrorEventRetentionExecutionContext {
  userId: string | null
  operatorIdentity: ErrorEventServicePrincipalIdentity
}

export interface ErrorEventRetentionPreview {
  cutoff: Date
  dueCount: number
  countCapped: boolean
}

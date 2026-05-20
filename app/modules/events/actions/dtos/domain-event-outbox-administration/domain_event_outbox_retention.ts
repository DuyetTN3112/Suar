import type { DomainEventOutboxRetentionPrincipalIdentity } from '#modules/authorization/public_contracts/domain_event_outbox_retention_service_principal'

export interface DomainEventOutboxRetentionExecution {
  userId: string | null
  operatorIdentity: DomainEventOutboxRetentionPrincipalIdentity
}

export interface DomainEventOutboxRetentionWindowInput {
  now?: Date
  processedRetentionDays: number
  replayHistoryRetentionDays: number
  execution: DomainEventOutboxRetentionExecution
}

export interface DomainEventOutboxRetentionPreview {
  processedBefore: Date
  replayHistoryBefore: Date
  dueProcessedRows: number
  dueReplayHistoryRows: number
  processedCountCapped: boolean
  replayHistoryCountCapped: boolean
}

export interface DomainEventOutboxRetentionPurgeResult {
  processedBefore: Date
  replayHistoryBefore: Date
  purgedProcessedRows: number
  purgedReplayHistoryRows: number
}

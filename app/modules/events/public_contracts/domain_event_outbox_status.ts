import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export const DOMAIN_EVENT_OUTBOX_STATUS_COUNT_CAP = 10_000

export interface DomainEventOutboxStatusSummary {
  observedAt: Date
  countCap: number
  duePending: number
  duePendingCountCapped: boolean
  futureBackoffPending: number
  futureBackoffPendingCountCapped: boolean
  activeLeases: number
  activeLeaseCountCapped: boolean
  expiredLeases: number
  expiredLeaseCountCapped: boolean
  deadLetter: number
  deadLetterCountCapped: boolean
  oldestDuePendingAgeMs: number | null
  nextBackoffDueInMs: number | null
  nextActiveLeaseExpiryInMs: number | null
  oldestExpiredLeaseAgeMs: number | null
  oldestDeadLetterAgeMs: number | null
}

export interface DomainEventOutboxStatusReader {
  status(now?: Date): Promise<DomainEventOutboxStatusSummary>
}

let registeredReader: DomainEventOutboxStatusReader | undefined

export function registerDomainEventOutboxStatusReader(
  reader: DomainEventOutboxStatusReader
): void {
  if (registeredReader && registeredReader !== reader) {
    throw new InvariantViolationException('Domain event outbox status reader is already registered')
  }
  registeredReader = reader
}

export function readDomainEventOutboxStatus(
  now: Date = new Date()
): Promise<DomainEventOutboxStatusSummary> {
  if (!registeredReader) {
    throw new InvariantViolationException('Domain event outbox status reader is not registered')
  }
  return registeredReader.status(now)
}

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { DomainEventOutboxAdministrationRepository } from '#modules/events/actions/ports/outbound/domain_event_outbox_administration_ports'
import type { DurableDomainEventName } from '#modules/events/domain/domain_event_outbox'
import {
  DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT,
  type DomainEventOutboxDeadLetterPreviewInput,
  type DomainEventOutboxDeadLetterPreviewPage,
  type DomainEventOutboxReplayInput,
  type DomainEventOutboxReplayBatch,
  requireBoundedDomainEventOutboxAdminSelector,
  validateDomainEventOutboxPreviewInput,
} from '#modules/events/domain/domain_event_outbox_administration'
import {
  DOMAIN_EVENT_OUTBOX_STATUS_COUNT_CAP,
  type DomainEventOutboxStatusSummary,
} from '#modules/events/public_contracts/domain_event_outbox_status'

interface DeadLetterDatabaseRow {
  id: string
  sequence: number | string
  event_name: DurableDomainEventName
  dedupe_key: string
  aggregate_type:
    | 'task_assignment'
    | 'review_session'
    | 'review_dispute'
    | 'user_talent'
  aggregate_id: string
  attempt_count: number | string
  archived_attempt_count: number | string | null
  replay_count: number | string
  last_error_code: string | null
  dead_lettered_at: Date | string
}

interface ReplayDatabaseRow {
  id: string
  sequence: number | string
  event_name: DurableDomainEventName
  attempt_count: number | string
  last_error_code: string | null
  archived_attempt_count: number | string | null
  replay_count: number | string
}

function asTransactionClient(trx: object): TransactionClientContract {
  if (!('rawQuery' in trx) || typeof trx.rawQuery !== 'function') {
    throw new TypeError('Domain event outbox replay requires an active database transaction')
  }
  return trx as TransactionClientContract
}

function affectedRowCount(result: unknown): number {
  if (typeof result === 'number') return result
  if (typeof result === 'bigint') return Number(result)
  if (Array.isArray(result)) return result.length
  return 0
}

function ageInMilliseconds(now: Date, value: Date | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : Math.max(0, now.getTime() - date.getTime())
}

function timeUntilInMilliseconds(
  now: Date,
  value: Date | string | null | undefined
): number | null {
  if (value === null || value === undefined) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : Math.max(0, date.getTime() - now.getTime())
}

function cappedCount(value: number | string | null | undefined): {
  count: number
  capped: boolean
} {
  const observed = Number(value ?? 0)
  return {
    count: Math.min(observed, DOMAIN_EVENT_OUTBOX_STATUS_COUNT_CAP),
    capped: observed > DOMAIN_EVENT_OUTBOX_STATUS_COUNT_CAP,
  }
}

function applyExactSelector<TQuery extends {
  where(column: string, value: unknown): TQuery
}>(
  query: TQuery,
  selector: {
    id?: string
    eventName?: DurableDomainEventName
    dedupeKey?: string
  },
  prefix = ''
): TQuery {
  let selected = query
  if (selector.id !== undefined) {
    selected = selected.where(`${prefix}id`, selector.id)
  }
  if (selector.eventName !== undefined) {
    selected = selected.where(`${prefix}event_name`, selector.eventName)
  }
  if (selector.dedupeKey !== undefined) {
    selected = selected.where(`${prefix}dedupe_key`, selector.dedupeKey)
  }
  return selected
}

function validateReplayInput(input: DomainEventOutboxReplayInput): void {
  requireBoundedDomainEventOutboxAdminSelector(input.selector)
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(input.actorId)) {
    throw new RangeError('Domain event outbox replay actorId must be a UUID')
  }
  if (!/^[0-9a-f]{64}$/u.test(input.reasonDigest)) {
    throw new RangeError('Domain event outbox replay reasonDigest must be SHA-256 hex')
  }
  if (
    !Number.isSafeInteger(input.reasonLength) ||
    input.reasonLength < 10 ||
    input.reasonLength > 500
  ) {
    throw new RangeError('Domain event outbox replay reason length must be between 10 and 500')
  }
  if (Number.isNaN(input.now.getTime())) {
    throw new RangeError('Domain event outbox replay time must be valid')
  }
}

export class PostgresDomainEventOutboxAdministrationRepository
  extends DomainEventOutboxAdministrationRepository
{
  constructor() {
    super()
  }

  async status(now: Date = new Date()): Promise<DomainEventOutboxStatusSummary> {
    if (Number.isNaN(now.getTime())) {
      throw new RangeError('Domain event outbox status time must be valid')
    }
    const boundedRowLimit = DOMAIN_EVENT_OUTBOX_STATUS_COUNT_CAP + 1
    const result: unknown = await db.rawQuery(
      `
        WITH due_pending AS MATERIALIZED (
          SELECT available_at
          FROM domain_event_outbox
          WHERE status = 'pending'
            AND available_at <= ?
          ORDER BY available_at ASC, sequence ASC
          LIMIT ?
        ),
        future_backoff AS MATERIALIZED (
          SELECT available_at
          FROM domain_event_outbox
          WHERE status = 'pending'
            AND available_at > ?
          ORDER BY available_at ASC, sequence ASC
          LIMIT ?
        ),
        active_leases AS MATERIALIZED (
          SELECT locked_until
          FROM domain_event_outbox
          WHERE status = 'leased'
            AND locked_until > ?
          ORDER BY locked_until ASC, sequence ASC
          LIMIT ?
        ),
        expired_leases AS MATERIALIZED (
          SELECT locked_until
          FROM domain_event_outbox
          WHERE status = 'leased'
            AND locked_until <= ?
          ORDER BY locked_until ASC, sequence ASC
          LIMIT ?
        ),
        dead_letters AS MATERIALIZED (
          SELECT dead_lettered_at
          FROM domain_event_outbox
          WHERE status = 'dead_letter'
          ORDER BY dead_lettered_at ASC, sequence ASC
          LIMIT ?
        )
        SELECT
          (SELECT COUNT(*) FROM due_pending) AS due_pending,
          (SELECT MIN(available_at) FROM due_pending) AS oldest_due_pending_at,
          (SELECT COUNT(*) FROM future_backoff) AS future_backoff_pending,
          (SELECT MIN(available_at) FROM future_backoff) AS next_backoff_due_at,
          (SELECT COUNT(*) FROM active_leases) AS active_leases,
          (SELECT MIN(locked_until) FROM active_leases) AS next_active_lease_expiry_at,
          (SELECT COUNT(*) FROM expired_leases) AS expired_leases,
          (SELECT MIN(locked_until) FROM expired_leases) AS oldest_expired_lease_at,
          (SELECT COUNT(*) FROM dead_letters) AS dead_letter,
          (SELECT MIN(dead_lettered_at) FROM dead_letters) AS oldest_dead_letter_at
      `,
      [
        now,
        boundedRowLimit,
        now,
        boundedRowLimit,
        now,
        boundedRowLimit,
        now,
        boundedRowLimit,
        boundedRowLimit,
      ]
    )
    const row = (
      result as {
        rows?: Array<{
          due_pending: number | string
          oldest_due_pending_at: Date | string | null
          future_backoff_pending: number | string
          next_backoff_due_at: Date | string | null
          active_leases: number | string
          next_active_lease_expiry_at: Date | string | null
          expired_leases: number | string
          oldest_expired_lease_at: Date | string | null
          dead_letter: number | string
          oldest_dead_letter_at: Date | string | null
        }>
      }
    ).rows?.[0]
    const duePending = cappedCount(row?.due_pending)
    const futureBackoffPending = cappedCount(row?.future_backoff_pending)
    const activeLeases = cappedCount(row?.active_leases)
    const expiredLeases = cappedCount(row?.expired_leases)
    const deadLetter = cappedCount(row?.dead_letter)

    return {
      observedAt: new Date(now),
      countCap: DOMAIN_EVENT_OUTBOX_STATUS_COUNT_CAP,
      duePending: duePending.count,
      duePendingCountCapped: duePending.capped,
      futureBackoffPending: futureBackoffPending.count,
      futureBackoffPendingCountCapped: futureBackoffPending.capped,
      activeLeases: activeLeases.count,
      activeLeaseCountCapped: activeLeases.capped,
      expiredLeases: expiredLeases.count,
      expiredLeaseCountCapped: expiredLeases.capped,
      deadLetter: deadLetter.count,
      deadLetterCountCapped: deadLetter.capped,
      oldestDuePendingAgeMs: ageInMilliseconds(now, row?.oldest_due_pending_at),
      nextBackoffDueInMs: timeUntilInMilliseconds(now, row?.next_backoff_due_at),
      nextActiveLeaseExpiryInMs: timeUntilInMilliseconds(
        now,
        row?.next_active_lease_expiry_at
      ),
      oldestExpiredLeaseAgeMs: ageInMilliseconds(now, row?.oldest_expired_lease_at),
      oldestDeadLetterAgeMs: ageInMilliseconds(now, row?.oldest_dead_letter_at),
    }
  }

  async previewDeadLetters(
    unsafeInput: DomainEventOutboxDeadLetterPreviewInput
  ): Promise<DomainEventOutboxDeadLetterPreviewPage> {
    const input = validateDomainEventOutboxPreviewInput(unsafeInput)
    let query = db
      .from('domain_event_outbox as outbox')
      .select(
        'outbox.id',
        'outbox.sequence',
        'outbox.event_name',
        'outbox.dedupe_key',
        'outbox.aggregate_type',
        'outbox.aggregate_id',
        'outbox.attempt_count',
        'outbox.last_error_code',
        'outbox.dead_lettered_at',
        db.raw(`
          COALESCE((
            SELECT SUM(history.previous_attempt_count)
            FROM domain_event_outbox_replay_history AS history
            WHERE history.outbox_id = outbox.id
          ), 0) AS archived_attempt_count
        `),
        db.raw(`
          (
            SELECT COUNT(*)
            FROM domain_event_outbox_replay_history AS history
            WHERE history.outbox_id = outbox.id
          ) AS replay_count
        `)
      )
      .where('outbox.status', 'dead_letter')

    query = applyExactSelector(query, input.selector, 'outbox.')
    if (input.afterSequence !== undefined) {
      query = query.where('outbox.sequence', '>', input.afterSequence)
    }

    const rows = (await query
      .orderBy('outbox.sequence', 'asc')
      .limit(input.limit + 1)) as DeadLetterDatabaseRow[]
    const hasMore = rows.length > input.limit
    const items = rows.slice(0, input.limit).map((row) => {
      const attemptCount = Number(row.attempt_count)
      return {
        id: row.id,
        sequence: Number(row.sequence),
        eventName: row.event_name,
        dedupeKey: row.dedupe_key,
        aggregateType: row.aggregate_type,
        aggregateId: row.aggregate_id,
        attemptCount,
        lifetimeAttemptCount: attemptCount + Number(row.archived_attempt_count ?? 0),
        replayCount: Number(row.replay_count),
        errorCode: row.last_error_code ?? 'UNKNOWN_DOMAIN_EVENT_ERROR',
        deadLetteredAt: new Date(row.dead_lettered_at),
      }
    })

    return {
      items,
      hasMore,
      nextAfterSequence: hasMore && items.length > 0 ? (items.at(-1)?.sequence ?? null) : null,
    }
  }

  async replayDeadLetters(
    input: DomainEventOutboxReplayInput,
    unsafeTrx: object
  ): Promise<DomainEventOutboxReplayBatch> {
    validateReplayInput(input)
    const selector = requireBoundedDomainEventOutboxAdminSelector(input.selector)
    const trx = asTransactionClient(unsafeTrx)

    let countQuery = trx
      .from('domain_event_outbox as outbox')
      .where('outbox.status', 'dead_letter')
      .count('* as total')
    countQuery = applyExactSelector(countQuery, selector, 'outbox.')
    const countRow = (await countQuery.first()) as { total: number | string } | undefined
    const matchedCount = Number(countRow?.total ?? 0)
    if (matchedCount > DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT) {
      throw new RangeError(
        `Domain event outbox replay matches more than ${DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT} rows; narrow the selector`
      )
    }

    let query = trx
      .from('domain_event_outbox as outbox')
      .select(
        'outbox.id',
        'outbox.sequence',
        'outbox.event_name',
        'outbox.attempt_count',
        'outbox.last_error_code',
        trx.raw(`
          COALESCE((
            SELECT SUM(history.previous_attempt_count)
            FROM domain_event_outbox_replay_history AS history
            WHERE history.outbox_id = outbox.id
          ), 0) AS archived_attempt_count
        `),
        trx.raw(`
          (
            SELECT COUNT(*)
            FROM domain_event_outbox_replay_history AS history
            WHERE history.outbox_id = outbox.id
          ) AS replay_count
        `)
      )
      .where('outbox.status', 'dead_letter')
    query = applyExactSelector(query, selector, 'outbox.')

    const rows = (await query
      .orderBy('outbox.sequence', 'asc')
      .limit(DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT + 1)
      .forUpdate()
      .skipLocked()) as ReplayDatabaseRow[]
    if (rows.length !== matchedCount) {
      return {
        rows: [],
        matchedCount,
        deferredCount: Math.abs(matchedCount - rows.length),
        hasMoreOrLocked: true,
      }
    }
    if (rows.length === 0) {
      return {
        rows: [],
        matchedCount: 0,
        deferredCount: 0,
        hasMoreOrLocked: false,
      }
    }

    await trx.table('domain_event_outbox_replay_history').insert(
      rows.map((row) => ({
        outbox_id: row.id,
        replayed_by: input.actorId,
        reason_digest: input.reasonDigest,
        reason_length: input.reasonLength,
        previous_attempt_count: Number(row.attempt_count),
        previous_error_code: row.last_error_code,
        replayed_at: input.now,
      }))
    )

    const result = await trx
      .from('domain_event_outbox')
      .whereIn(
        'id',
        rows.map((row) => row.id)
      )
      .where('status', 'dead_letter')
      .update({
        status: 'pending',
        attempt_count: 0,
        available_at: input.now,
        locked_by: null,
        locked_until: null,
        lease_token: null,
        processed_at: null,
        dead_lettered_at: null,
        last_error_code: null,
        updated_at: input.now,
      })
    if (affectedRowCount(result) !== rows.length) {
      throw new InvariantViolationException(
        'Domain event outbox replay lost its dead-letter concurrency fence'
      )
    }

    return {
      rows: rows.map((row) => ({
        id: row.id,
        sequence: Number(row.sequence),
        eventName: row.event_name,
        previousAttemptCount: Number(row.attempt_count),
        lifetimeAttemptCount:
          Number(row.attempt_count) + Number(row.archived_attempt_count ?? 0),
        replayCount: Number(row.replay_count) + 1,
        previousStatus: 'dead_letter',
      })),
      matchedCount,
      deferredCount: 0,
      hasMoreOrLocked: false,
    }
  }
}

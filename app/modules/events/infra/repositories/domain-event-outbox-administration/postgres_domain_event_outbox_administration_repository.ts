import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  PostgresDomainEventOutboxStatusReader,
  applyExactSelector,
} from './postgres_domain_event_outbox_status_reader.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { DomainEventOutboxAdministrationRepository } from '#modules/events/actions/ports/outbound/domain-event-outbox-administration/domain_event_outbox_administration_ports'
import type { DurableDomainEventName } from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import {
  DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT,
  type DomainEventOutboxDeadLetterPreviewInput,
  type DomainEventOutboxDeadLetterPreviewPage,
  type DomainEventOutboxReplayInput,
  type DomainEventOutboxReplayBatch,
  requireBoundedDomainEventOutboxAdminSelector,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox_administration'
import type { DomainEventOutboxStatusSummary } from '#modules/events/public_contracts/domain_event_outbox_status'

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
  readonly #statusReader: PostgresDomainEventOutboxStatusReader

  constructor(
    statusReader: PostgresDomainEventOutboxStatusReader = new PostgresDomainEventOutboxStatusReader()
  ) {
    super()
    this.#statusReader = statusReader
  }

  async status(now: Date = new Date()): Promise<DomainEventOutboxStatusSummary> {
    return this.#statusReader.status(now)
  }

  async previewDeadLetters(
    unsafeInput: DomainEventOutboxDeadLetterPreviewInput
  ): Promise<DomainEventOutboxDeadLetterPreviewPage> {
    return this.#statusReader.previewDeadLetters(unsafeInput)
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


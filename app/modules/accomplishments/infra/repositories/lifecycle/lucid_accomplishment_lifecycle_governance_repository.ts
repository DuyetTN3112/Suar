import db from '@adonisjs/lucid/services/db'

import {
  assertCorrectionTarget,
  assertGovernedSemantics,
  assertHeadMatchesAggregate,
  loadAndValidateSignals,
  loadLifecycleHead,
  parseAggregate,
  parseLifecycleRow,
  signalStateFor,
  transitionedAggregate,
  updateSignals,
} from './lucid_accomplishment_lifecycle_invariants.js'
import {
  ACCOMPLISHMENT_TABLE,
  AccomplishmentLifecycleCorrectionTargetException,
  AccomplishmentLifecycleSourceCollisionException,
  AccomplishmentLifecycleTransitionConflictException,
  asTimestamp,
  expectedRevision,
  LIFECYCLE_TABLE,
  LOCK_TIMEOUT,
  PUBLIC_PROJECTION_TABLE,
  result,
  type AccomplishmentRow,
  type LifecycleRow,
} from './lucid_accomplishment_lifecycle_types.js'

import type {
  AccomplishmentLifecycleGovernanceWriter,
  GovernAccomplishmentLifecycleInput,
  PersistedAccomplishmentLifecycleTransition,
} from '#modules/accomplishments/actions/ports/outbound/lifecycle/accomplishment_lifecycle_governance_writer'
import { validateAccomplishmentLifecycleTransition } from '#modules/accomplishments/domain/lifecycle/accomplishment_lifecycle_rules'
import type { AccomplishmentContentHasher } from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'

export {
  AccomplishmentLifecycleCorrectionTargetException,
  AccomplishmentLifecycleSourceCollisionException,
  AccomplishmentLifecycleTransitionConflictException,
}

export class LucidAccomplishmentLifecycleGovernanceRepository
  implements AccomplishmentLifecycleGovernanceWriter
{
  constructor(
    private readonly hasher: AccomplishmentContentHasher = new NodeAccomplishmentContentHasher()
  ) {}

  async transition(
    input: GovernAccomplishmentLifecycleInput
  ): Promise<PersistedAccomplishmentLifecycleTransition> {
    const requestedRevision = expectedRevision(input, this.hasher)
    const lockIds = [
      ...new Set(
        [input.accomplishmentId, input.relatedAccomplishmentId].filter(
          (value): value is string => value !== null
        )
      ),
    ].sort()

    return db.transaction(async (trx) => {
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
      for (const accomplishmentId of lockIds) {
        await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
          `accomplishment-lifecycle:${accomplishmentId}`,
        ])
      }

      const row = (await trx
        .from(ACCOMPLISHMENT_TABLE)
        .where('id', input.accomplishmentId)
        .forUpdate()
        .first()) as AccomplishmentRow | undefined
      if (!row) throw NotFoundException.resource('Verified accomplishment', input.accomplishmentId)

      const current = parseAggregate(row, this.hasher)
      const head = await loadLifecycleHead(trx, input.accomplishmentId)
      assertHeadMatchesAggregate(current, head.revision)

      const replayRow = (await trx
        .from(LIFECYCLE_TABLE)
        .where({
          accomplishment_id: input.accomplishmentId,
          source_fact_type: input.sourceFact.type,
          source_fact_id: input.sourceFact.id,
        })
        .first()) as LifecycleRow | undefined
      if (replayRow) {
        const replay = parseLifecycleRow(replayRow)
        if (this.hasher.hash(replay) !== this.hasher.hash(requestedRevision)) {
          throw new AccomplishmentLifecycleSourceCollisionException(
            input.accomplishmentId,
            input.sourceFact.id
          )
        }
        return result(false, replay, current)
      }

      const revisionIdCollision = (await trx
        .from(LIFECYCLE_TABLE)
        .where('id', requestedRevision.id)
        .first()) as { id: string } | undefined
      if (revisionIdCollision) {
        throw new AccomplishmentLifecycleSourceCollisionException(
          input.accomplishmentId,
          input.sourceFact.id
        )
      }

      if (
        head.revision.id !== input.expectedLifecycleRevisionId ||
        head.revision.sequence !== input.expectedLifecycleSequence ||
        current.lifecycleState !== input.expectedLifecycleState ||
        current.visibility !== input.expectedVisibility
      ) {
        throw new AccomplishmentLifecycleTransitionConflictException(input.accomplishmentId)
      }

      assertGovernedSemantics(input)
      const validation = validateAccomplishmentLifecycleTransition({
        previousState: current.lifecycleState,
        nextState: requestedRevision.nextState,
        previousVisibility: current.visibility,
        nextVisibility: requestedRevision.visibility,
        reasonCode: requestedRevision.reasonCode,
      })
      if (!validation.allowed) {
        throw new BusinessLogicException('Accomplishment lifecycle transition is not allowed', {
          reasonCodes: validation.blockerCodes,
        })
      }
      if (
        current.lifecycleState === 'frozen' &&
        requestedRevision.reasonCode === 'dispute_resolved' &&
        requestedRevision.nextState !== head.revision.previousState
      ) {
        throw new BusinessLogicException(
          'Dispute resolution must restore the exact pre-dispute accomplishment state'
        )
      }
      if (
        asTimestamp(requestedRevision.occurredAt, 'occurredAt').getTime() <
        asTimestamp(head.revision.occurredAt, 'head occurredAt').getTime()
      ) {
        throw new AccomplishmentLifecycleTransitionConflictException(input.accomplishmentId)
      }

      await assertCorrectionTarget(trx, current, requestedRevision.relatedAccomplishmentId)
      const signals = await loadAndValidateSignals(trx, current)
      const transitioned = transitionedAggregate(current, requestedRevision, this.hasher)

      await trx.table(LIFECYCLE_TABLE).insert({
        id: requestedRevision.id,
        contract_version: requestedRevision.contractVersion,
        schema_version: 'suar.accomplishment_lifecycle_revision.v1',
        accomplishment_id: requestedRevision.accomplishmentId,
        sequence: requestedRevision.sequence,
        previous_state: requestedRevision.previousState,
        next_state: requestedRevision.nextState,
        visibility: requestedRevision.visibility,
        reason_code: requestedRevision.reasonCode,
        source_fact_id: requestedRevision.sourceFact.id,
        source_fact_type: requestedRevision.sourceFact.type,
        source_fact_hash: requestedRevision.sourceFact.hash,
        actor_type: requestedRevision.actor.type,
        actor_user_id: requestedRevision.actor.userId,
        policy_version: requestedRevision.policyVersion,
        supersedes_revision_id: requestedRevision.supersedesRevisionId,
        related_accomplishment_id: requestedRevision.relatedAccomplishmentId,
        revision_payload: JSON.stringify(requestedRevision),
        occurred_at: asTimestamp(requestedRevision.occurredAt, 'occurredAt'),
        created_at: asTimestamp(requestedRevision.occurredAt, 'occurredAt'),
      })
      await updateSignals(trx, signals, signalStateFor(requestedRevision))

      if (
        ['frozen', 'superseded', 'revoked'].includes(requestedRevision.nextState) ||
        requestedRevision.visibility !== 'public'
      ) {
        await trx
          .from(PUBLIC_PROJECTION_TABLE)
          .where('accomplishment_id', current.id)
          .whereNull('retired_at')
          .update({ retired_at: asTimestamp(requestedRevision.occurredAt, 'occurredAt') })
      }

      await trx
        .from(ACCOMPLISHMENT_TABLE)
        .where('id', current.id)
        .update({
          lifecycle_state: transitioned.lifecycleState,
          visibility: transitioned.visibility,
          canonical_hash: transitioned.canonicalHash,
          canonical_payload: JSON.stringify(transitioned),
          updated_at: asTimestamp(transitioned.updatedAt, 'updatedAt'),
        })

      return result(true, requestedRevision, transitioned)
    })
  }
}

export const lucidAccomplishmentLifecycleGovernanceRepository =
  new LucidAccomplishmentLifecycleGovernanceRepository()

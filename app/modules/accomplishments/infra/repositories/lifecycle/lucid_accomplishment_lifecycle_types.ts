import type {
  GovernAccomplishmentLifecycleInput,
  PersistedAccomplishmentLifecycleTransition,
} from '#modules/accomplishments/actions/ports/outbound/lifecycle/accomplishment_lifecycle_governance_writer'
import {
  deterministicUuidFromSha256,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import {
  parseAccomplishmentLifecycleRevisionV1,
  type AccomplishmentLifecycleRevisionV1,
} from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import type {
  AccomplishmentLifecycleStateV1,
  AccomplishmentVisibilityV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

export const ACCOMPLISHMENT_TABLE = 'verified_work_accomplishments'
export const LIFECYCLE_TABLE = 'accomplishment_lifecycle_revisions'
export const SIGNAL_TABLE = 'accomplishment_capability_signals'
export const PUBLIC_PROJECTION_TABLE = 'accomplishment_public_projections'
export const LOCK_TIMEOUT = '5000ms'

export interface AccomplishmentRow {
  id: string
  user_id: string
  task_assignment_id: string
  lifecycle_state: AccomplishmentLifecycleStateV1
  visibility: AccomplishmentVisibilityV1
  canonical_hash: string
  canonical_payload: unknown
}

export interface LifecycleRow {
  id: string
  accomplishment_id: string
  sequence: number | string
  previous_state: AccomplishmentLifecycleStateV1 | null
  next_state: AccomplishmentLifecycleStateV1
  visibility: AccomplishmentVisibilityV1
  reason_code: AccomplishmentLifecycleRevisionV1['reasonCode']
  source_fact_id: string
  source_fact_type: AccomplishmentLifecycleRevisionV1['sourceFact']['type']
  source_fact_hash: string
  actor_type: AccomplishmentLifecycleRevisionV1['actor']['type']
  actor_user_id: string | null
  policy_version: string
  supersedes_revision_id: string | null
  related_accomplishment_id: string | null
  revision_payload: unknown
}

export interface SignalRow {
  id: string
  signal_state: 'active' | 'frozen' | 'superseded' | 'revoked'
  signal_payload: unknown
}

export interface CorrectionTargetRow {
  id: string
  user_id: string
  task_assignment_id: string
  lifecycle_state: AccomplishmentLifecycleStateV1
}

export class AccomplishmentLifecycleSourceCollisionException extends ConflictException {
  constructor(accomplishmentId: string, sourceFactId: string) {
    super('Accomplishment lifecycle source fact was already used with different content', {
      accomplishmentId,
      sourceFactId,
    })
  }
}

export class AccomplishmentLifecycleTransitionConflictException extends ConflictException {
  constructor(accomplishmentId: string) {
    super('Accomplishment lifecycle head changed before this transition could be applied', {
      accomplishmentId,
    })
  }
}

export class AccomplishmentLifecycleCorrectionTargetException extends BusinessLogicException {
  constructor(accomplishmentId: string, relatedAccomplishmentId: string | null) {
    super('Accomplishment correction must point to an existing governed successor', {
      accomplishmentId,
      relatedAccomplishmentId,
    })
  }
}

export function asSequence(value: number | string, accomplishmentId: string): number {
  const sequence = Number(value)
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new PersistedDataIntegrityException('Accomplishment lifecycle sequence is corrupt', {
      accomplishmentId,
    })
  }
  return sequence
}

export function asTimestamp(value: string, field: string): Date {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    throw new BusinessLogicException(`Accomplishment lifecycle ${field} is invalid`)
  }
  return timestamp
}

export function setEquals(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  )
}

export function revisionIdentity(
  input: GovernAccomplishmentLifecycleInput,
  hasher: AccomplishmentContentHasher
): string {
  return deterministicUuidFromSha256(
    hasher.hash({
      schemaVersion: 'suar.accomplishment_lifecycle_transition_identity.v1',
      accomplishmentId: input.accomplishmentId,
      sourceFactType: input.sourceFact.type,
      sourceFactId: input.sourceFact.id,
    })
  )
}

export function expectedRevision(
  input: GovernAccomplishmentLifecycleInput,
  hasher: AccomplishmentContentHasher
): AccomplishmentLifecycleRevisionV1 {
  return parseAccomplishmentLifecycleRevisionV1({
    contractVersion: 1,
    id: revisionIdentity(input, hasher),
    accomplishmentId: input.accomplishmentId,
    sequence: input.expectedLifecycleSequence + 1,
    previousState: input.expectedLifecycleState,
    nextState: input.nextLifecycleState,
    visibility: input.nextVisibility,
    reasonCode: input.reasonCode,
    sourceFact: input.sourceFact,
    actor: input.actor,
    policyVersion: input.policyVersion,
    supersedesRevisionId:
      input.nextLifecycleState === 'superseded' ? input.expectedLifecycleRevisionId : null,
    relatedAccomplishmentId: input.relatedAccomplishmentId,
    occurredAt: input.occurredAt,
  })
}

export function result(
  inserted: boolean,
  revision: AccomplishmentLifecycleRevisionV1,
  current: VerifiedWorkAccomplishmentV1
): PersistedAccomplishmentLifecycleTransition {
  return {
    inserted,
    revision,
    currentLifecycleState: current.lifecycleState,
    currentVisibility: current.visibility,
    currentCanonicalHash: current.canonicalHash as TvaSha256,
  }
}

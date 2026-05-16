import db from '@adonisjs/lucid/services/db'

import type {
  AccomplishmentPublicationCanonicalSource,
  AccomplishmentPublicationFactsStore,
  PersistedDisclosureDecision,
  PersistedPublicationConsent,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_facts_store'
import type { GovernedAccomplishmentPublicationSource } from '#modules/accomplishments/actions/ports/outbound/publication/governed_accomplishment_publication_source_reader'
import {
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import {
  hashAccomplishmentDisclosureDecision,
  hashAccomplishmentPublicationConsent,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_identity'
import type {
  AuthoritativeAccomplishmentDisclosureDecision,
  AuthoritativeAccomplishmentPublicationConsent,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_rules'
import { parseAccomplishmentCapabilitySignalV1 } from '#modules/accomplishments/public_contracts/verified-work/accomplishment_capability_signal_v1'
import {
  parseAccomplishmentLifecycleRevisionV1,
} from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'
import {
  parseVerifiedWorkAccomplishmentV1,
  type VerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

const ACCOMPLISHMENT_TABLE = 'verified_work_accomplishments'
const LIFECYCLE_TABLE = 'accomplishment_lifecycle_revisions'
const SIGNAL_TABLE = 'accomplishment_capability_signals'
const DECISION_TABLE = 'accomplishment_disclosure_decisions'
const CONSENT_TABLE = 'accomplishment_publication_consents'

interface SourceRow {
  id: string
  user_id: string
  canonical_hash: string
  canonical_payload: unknown
  lifecycle_state: VerifiedWorkAccomplishmentV1['lifecycleState']
}

interface LifecycleRow {
  id: string
  accomplishment_id: string
  next_state: VerifiedWorkAccomplishmentV1['lifecycleState']
  revision_payload: unknown
}

interface SignalRow {
  signal_payload: unknown
}

interface DecisionRow {
  id: string
  decision_hash: string
  decision_payload: unknown
}

interface ConsentRow {
  id: string
  idempotency_key: string
  consent_fact_hash: string
  consent_payload: unknown
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new PersistedDataIntegrityException(`Accomplishment publication ${field} is corrupt`, {})
  }
  return value as Record<string, unknown>
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new PersistedDataIntegrityException(`Accomplishment publication ${field} is corrupt`, {})
  }
  return value
}

function hashValue(value: unknown, field: string): TvaSha256 {
  const hash = stringValue(value, field)
  if (!/^sha256:[0-9a-f]{64}$/.test(hash)) {
    throw new PersistedDataIntegrityException(`Accomplishment publication ${field} is corrupt`, {})
  }
  return hash as TvaSha256
}

function parseDecision(row: DecisionRow): AuthoritativeAccomplishmentDisclosureDecision {
  const payload = record(row.decision_payload, 'decision payload')
  const decision: Record<string, unknown> & { decisionHash: TvaSha256 } = {
    ...payload,
    decisionHash: hashValue(payload['decisionHash'] ?? row.decision_hash, 'decision hash'),
  }
  if (
    decision['decisionId'] !== row.id ||
    decision.decisionHash !== row.decision_hash ||
    typeof decision['allowed'] !== 'boolean' ||
    decision['content'] === null ||
    typeof decision['content'] !== 'object'
  ) {
    throw new PersistedDataIntegrityException('Accomplishment disclosure decision envelope is corrupt', {})
  }
  return decision as unknown as AuthoritativeAccomplishmentDisclosureDecision
}

function parseConsent(row: ConsentRow): PersistedPublicationConsent {
  const payload = record(row.consent_payload, 'consent payload')
  const consent: Record<string, unknown> & {
    consentFactHash: TvaSha256
    idempotencyKey: string
  } = {
    ...payload,
    consentFactHash: hashValue(payload['consentFactHash'] ?? row.consent_fact_hash, 'consent hash'),
    idempotencyKey: row.idempotency_key,
  }
  if (
    consent['consentFactId'] !== row.id ||
    consent.consentFactHash !== row.consent_fact_hash ||
    typeof consent['granted'] !== 'boolean'
  ) {
    throw new PersistedDataIntegrityException('Accomplishment publication consent envelope is corrupt', {})
  }
  return consent as unknown as PersistedPublicationConsent
}

export default class LucidAccomplishmentPublicationFactsStore
  implements AccomplishmentPublicationFactsStore
{
  constructor(private readonly hasher: AccomplishmentContentHasher) {}

  private async loadBase(
    accomplishmentId: string
  ): Promise<AccomplishmentPublicationCanonicalSource | null> {
    const row = (await db
      .from(ACCOMPLISHMENT_TABLE)
      .where('id', accomplishmentId)
      .first()) as SourceRow | undefined
    if (!row) return null

    const accomplishment = parseVerifiedWorkAccomplishmentV1(row.canonical_payload)
    if (
      accomplishment.id !== row.id ||
      accomplishment.userId !== row.user_id ||
      accomplishment.lifecycleState !== row.lifecycle_state ||
      accomplishment.canonicalHash !== row.canonical_hash ||
      hashVerifiedAccomplishmentPayload(accomplishment, this.hasher) !== row.canonical_hash
    ) {
      throw new PersistedDataIntegrityException('Verified accomplishment source is corrupt', {
        accomplishmentId,
      })
    }

    const lifecycle = (await db
      .from(LIFECYCLE_TABLE)
      .where('accomplishment_id', accomplishmentId)
      .orderBy('sequence', 'desc')
      .first()) as LifecycleRow | undefined
    if (!lifecycle) {
      throw new PersistedDataIntegrityException('Accomplishment lifecycle head is missing', {
        accomplishmentId,
      })
    }
    const revision = parseAccomplishmentLifecycleRevisionV1(lifecycle.revision_payload)
    if (
      revision.id !== lifecycle.id ||
      revision.accomplishmentId !== accomplishmentId ||
      revision.nextState !== lifecycle.next_state ||
      revision.nextState !== accomplishment.lifecycleState
    ) {
      throw new PersistedDataIntegrityException('Accomplishment lifecycle head is corrupt', {
        accomplishmentId,
      })
    }

    const signals = (await db
      .from(SIGNAL_TABLE)
      .where('accomplishment_id', accomplishmentId)) as SignalRow[]
    const signalById = new Map(
      signals.map((signalRow) => {
        const signal = parseAccomplishmentCapabilitySignalV1(signalRow.signal_payload)
        return [signal.id, signal] as const
      })
    )
    const allowedCapabilities = accomplishment.capabilitySignalIds
      .map((id) => signalById.get(id))
      .filter((signal): signal is NonNullable<typeof signal> => signal?.signalState === 'active')
      .map((signal) => ({
        capabilityId: signal.capabilityId,
        label: signal.observedBehaviour,
        confidenceBand: signal.confidenceBand,
      }))

    return {
      accomplishment,
      lifecycleRevisionId: revision.id,
      lifecycleState: revision.nextState,
      hasOpenDispute: revision.nextState === 'frozen',
      allowedCapabilities,
    }
  }

  async loadCanonicalSource(
    accomplishmentId: string
  ): Promise<AccomplishmentPublicationCanonicalSource | null> {
    return this.loadBase(accomplishmentId)
  }

  async loadForPublication(
    accomplishmentId: string
  ): Promise<GovernedAccomplishmentPublicationSource | null> {
    const base = await this.loadBase(accomplishmentId)
    if (!base) return null
    const decisionRow = (await db
      .from(DECISION_TABLE)
      .where('accomplishment_id', accomplishmentId)
      .orderBy('decided_at', 'desc')
      .first()) as DecisionRow | undefined
    const consentRow = (await db
      .from(CONSENT_TABLE)
      .where('accomplishment_id', accomplishmentId)
      .orderBy('consented_at', 'desc')
      .first()) as ConsentRow | undefined
    if (!decisionRow || !consentRow) return null

    const decision = parseDecision(decisionRow)
    const consent = parseConsent(consentRow)
    const { decisionHash, ...decisionWithoutHash } = decision
    const { consentFactHash, idempotencyKey: _idempotencyKey, ...consentWithoutHash } = consent
    if (
      hashAccomplishmentDisclosureDecision(decisionWithoutHash, this.hasher) !== decisionHash ||
      hashAccomplishmentPublicationConsent(consentWithoutHash, this.hasher) !== consentFactHash
    ) {
      throw new PersistedDataIntegrityException('Accomplishment publication fact hash mismatch', {
        accomplishmentId,
      })
    }
    return {
      ...base,
      disclosureDecision: decision,
      publicationConsent: (() => {
        const { idempotencyKey: _idempotencyKey, ...publicationConsent } = consent
        return publicationConsent
      })(),
    }
  }

  async loadPreparedPublication(
    accomplishmentId: string,
    idempotencyKey: string
  ): Promise<{
    readonly decision: AuthoritativeAccomplishmentDisclosureDecision
    readonly consent: AuthoritativeAccomplishmentPublicationConsent
  } | null> {
    const consentRow = (await db
      .from(CONSENT_TABLE)
      .where({ accomplishment_id: accomplishmentId, idempotency_key: idempotencyKey })
      .orderBy('created_at', 'desc')
      .first()) as ConsentRow | undefined
    if (!consentRow) return null

    const consent = parseConsent(consentRow)
    const decisionRow = (await db
      .from(DECISION_TABLE)
      .where('id', consent.disclosureDecisionId)
      .first()) as DecisionRow | undefined
    if (!decisionRow) {
      throw new PersistedDataIntegrityException('Accomplishment publication decision is missing', {
        accomplishmentId,
      })
    }
    const decision = parseDecision(decisionRow)
    const { decisionHash, ...decisionWithoutHash } = decision
    const { consentFactHash, idempotencyKey: _idempotencyKey, ...consentWithoutHash } = consent
    if (
      hashAccomplishmentDisclosureDecision(decisionWithoutHash, this.hasher) !== decisionHash ||
      hashAccomplishmentPublicationConsent(consentWithoutHash, this.hasher) !== consentFactHash
    ) {
      throw new PersistedDataIntegrityException('Accomplishment publication fact hash mismatch', {
        accomplishmentId,
      })
    }
    const { idempotencyKey: _consentIdempotencyKey, ...authoritativeConsent } = consent
    return { decision, consent: authoritativeConsent }
  }

  async appendDecision(input: PersistedDisclosureDecision): Promise<void> {
    const existing = (await db
      .from(DECISION_TABLE)
      .where('id', input.decisionId)
      .first()) as DecisionRow | undefined
    if (existing) {
      if (existing.decision_hash !== input.decisionHash) {
        throw new InvariantViolationException('Accomplishment disclosure decision identity collision')
      }
      return
    }
    await db.table(DECISION_TABLE).insert({
      id: input.decisionId,
      accomplishment_id: input.accomplishmentId,
      subject_user_id: input.subjectUserId,
      decision_hash: input.decisionHash,
      policy_version: input.policyVersion,
      decision_payload: JSON.stringify(input),
      decided_at: new Date(input.decidedAt),
      created_at: new Date(input.decidedAt),
    })
  }

  async appendConsent(input: PersistedPublicationConsent): Promise<void> {
    const existing = (await db
      .from(CONSENT_TABLE)
      .where({ accomplishment_id: input.accomplishmentId, idempotency_key: input.idempotencyKey })
      .first()) as ConsentRow | undefined
    if (existing) {
      if (existing.consent_fact_hash !== input.consentFactHash) {
        throw new InvariantViolationException('Accomplishment publication consent identity collision')
      }
      return
    }
    await db.table(CONSENT_TABLE).insert({
      id: input.consentFactId,
      accomplishment_id: input.accomplishmentId,
      subject_user_id: input.subjectUserId,
      idempotency_key: input.idempotencyKey,
      consent_fact_hash: input.consentFactHash,
      source_canonical_hash: input.sourceCanonicalHash,
      source_lifecycle_revision_id: input.sourceLifecycleRevisionId,
      disclosure_decision_id: input.disclosureDecisionId,
      disclosure_decision_hash: input.disclosureDecisionHash,
      disclosure_policy_version: input.disclosurePolicyVersion,
      granted: input.granted,
      consent_payload: JSON.stringify(input),
      consented_at: new Date(input.consentedAt),
      created_at: new Date(input.consentedAt),
    })
  }
}

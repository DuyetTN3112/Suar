import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { AccomplishmentTransaction } from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import type {
  AccomplishmentPublicProjectionWriter,
  CreateAccomplishmentPublicProjectionInput,
  PersistedAccomplishmentPublicProjectionResult,
  RetireActiveAccomplishmentPublicProjectionInput,
  RetiredAccomplishmentPublicProjectionResult,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_writer'
import {
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import {
  parseAccomplishmentPublicProjectionV1,
  type AccomplishmentPublicProjectionV1,
} from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'
import {
  parseVerifiedWorkAccomplishmentV1,
  type VerifiedWorkAccomplishmentV1,
} from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

const PUBLIC_PROJECTION_TABLE = 'accomplishment_public_projections'
const ACCOMPLISHMENT_TABLE = 'verified_work_accomplishments'
const LIFECYCLE_TABLE = 'accomplishment_lifecycle_revisions'
const LOCK_TIMEOUT = '5000ms'

interface AccomplishmentSourceRow {
  id: string
  user_id: string
  canonical_hash: string
  canonical_payload: unknown
  lifecycle_state: string
  title: string
  concise_statement: string
  action: string
  object: string
  ownership_level: string
}

interface LifecycleHeadRow {
  id: string
  next_state: string
}

interface PublicProjectionRow {
  id: string
  projection_key: string
  accomplishment_id: string
  user_id: string
  publication_version: number | string
  public_payload: unknown
  retired_at: Date | string | null
}

export class AccomplishmentPublicProjectionCollisionException extends InvariantViolationException {
  constructor(projectionKey: string) {
    super(`Accomplishment public projection identity collision: ${projectionKey}`)
  }
}

export class StaleAccomplishmentPublicationSourceException extends InvariantViolationException {
  constructor(accomplishmentId: string) {
    super(`Accomplishment publication source is stale or no longer publishable: ${accomplishmentId}`)
  }
}

function date(value: string, field: string): Date {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new InvariantViolationException(`Accomplishment public projection ${field} is invalid`)
  }
  return parsed
}

function iso(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new PersistedDataIntegrityException('Accomplishment public projection timestamp is corrupt', {})
  }
  return parsed.toISOString()
}

function version(value: number | string): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new PersistedDataIntegrityException('Accomplishment public projection version is corrupt', {})
  }
  return parsed
}

function exactPayload(
  row: PublicProjectionRow,
  expected: AccomplishmentPublicProjectionV1,
  hasher: AccomplishmentContentHasher
): AccomplishmentPublicProjectionV1 {
  const stored = parseAccomplishmentPublicProjectionV1(row.public_payload)
  if (
    row.id !== stored.id ||
    row.accomplishment_id !== stored.accomplishmentId ||
    row.user_id !== stored.userId ||
    version(row.publication_version) !== stored.publicationVersion
  ) {
    throw new PersistedDataIntegrityException(
      'Accomplishment public projection envelope does not match its payload',
      { projectionId: row.id }
    )
  }
  if (hasher.hash(stored) !== hasher.hash(expected)) {
    throw new AccomplishmentPublicProjectionCollisionException(row.projection_key)
  }
  return stored
}

async function lockCurrentSource(
  trx: TransactionClientContract,
  projection: Pick<
    AccomplishmentPublicProjectionV1,
    | 'accomplishmentId'
    | 'userId'
    | 'sourceLifecycleRevisionId'
    | 'sourceCanonicalHash'
    | 'title'
    | 'conciseStatement'
    | 'action'
    | 'object'
    | 'ownershipLevel'
    | 'verification'
  >,
  hasher: AccomplishmentContentHasher
): Promise<VerifiedWorkAccomplishmentV1> {
  const source = (await trx
    .from(ACCOMPLISHMENT_TABLE)
    .where('id', projection.accomplishmentId)
    .forUpdate()
    .first()) as AccomplishmentSourceRow | undefined
  if (!source) {
    throw new StaleAccomplishmentPublicationSourceException(projection.accomplishmentId)
  }
  const canonical = parseVerifiedWorkAccomplishmentV1(source.canonical_payload)
  const computedCanonicalHash = hashVerifiedAccomplishmentPayload(canonical, hasher)
  const lifecycle = (await trx
    .from(LIFECYCLE_TABLE)
    .where('accomplishment_id', source.id)
    .orderBy('sequence', 'desc')
    .forUpdate()
    .first()) as LifecycleHeadRow | undefined
  if (
    !lifecycle ||
    !['verified', 'partially_verified'].includes(source.lifecycle_state) ||
    !['verified', 'partially_verified'].includes(lifecycle.next_state) ||
    lifecycle.id !== projection.sourceLifecycleRevisionId ||
    lifecycle.next_state !== source.lifecycle_state ||
    canonical.lifecycleState !== source.lifecycle_state ||
    canonical.verification.status !== source.lifecycle_state ||
    canonical.id !== source.id ||
    canonical.userId !== source.user_id ||
    canonical.canonicalHash !== source.canonical_hash ||
    computedCanonicalHash !== source.canonical_hash ||
    projection.userId !== source.user_id ||
    projection.sourceCanonicalHash !== source.canonical_hash ||
    projection.verification.status !== source.lifecycle_state ||
    projection.title !== source.title ||
    projection.conciseStatement !== source.concise_statement ||
    projection.action !== source.action ||
    projection.object !== source.object ||
    projection.ownershipLevel !== source.ownership_level
  ) {
    throw new StaleAccomplishmentPublicationSourceException(projection.accomplishmentId)
  }
  return canonical
}

function insertRow(
  projectionKey: string,
  projection: AccomplishmentPublicProjectionV1
): Record<string, unknown> {
  return {
    id: projection.id,
    projection_key: projectionKey,
    contract_version: projection.contractVersion,
    schema_version: 'suar.accomplishment_public_projection.v1',
    disclosure_policy_version: projection.disclosure.disclosurePolicyVersion,
    accomplishment_id: projection.accomplishmentId,
    user_id: projection.userId,
    publication_version: projection.publicationVersion,
    source_lifecycle_revision_id: projection.sourceLifecycleRevisionId,
    source_canonical_hash: projection.sourceCanonicalHash,
    title: projection.title,
    concise_statement: projection.conciseStatement,
    action: projection.action,
    object: projection.object,
    task_type: projection.taskType,
    business_domain: projection.businessDomain,
    problem_category: projection.problemCategory,
    role: projection.role,
    ownership_level: projection.ownershipLevel,
    autonomy_level: projection.autonomyLevel,
    collaboration_type: projection.collaborationType,
    environment: projection.context.environment,
    system_area: projection.context.systemArea,
    scale_summary: projection.context.scaleSummary,
    verification_status: projection.verification.status,
    confidence_band: projection.verification.confidenceBand,
    provenance_class: projection.verification.provenanceClass,
    evidence_availability: projection.verification.evidenceAvailability,
    redaction_state: projection.disclosure.redactionState,
    public_payload: JSON.stringify(projection),
    published_at: date(projection.publishedAt, 'published timestamp'),
    source_updated_at: date(projection.sourceUpdatedAt, 'source timestamp'),
    retired_at: null,
  }
}

export class AccomplishmentPublicProjectionRepository
  implements AccomplishmentPublicProjectionWriter
{
  constructor(
    private readonly hasher: AccomplishmentContentHasher = new NodeAccomplishmentContentHasher()
  ) {}

  async publish(
    input: CreateAccomplishmentPublicProjectionInput,
    transaction?: AccomplishmentTransaction
  ): Promise<PersistedAccomplishmentPublicProjectionResult> {
    if (!/^appub:v1:[0-9a-f]{64}$/.test(input.projectionKey)) {
      throw new InvariantViolationException('Accomplishment public projection key is invalid')
    }
    parseAccomplishmentPublicProjectionV1({ ...input.projection, publicationVersion: 1 })

    const persist = async (trx: TransactionClientContract) => {
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
        `accomplishment-public:${input.projection.accomplishmentId}`,
      ])
      await lockCurrentSource(trx, input.projection, this.hasher)

      const existing = (await trx
        .from(PUBLIC_PROJECTION_TABLE)
        .where('projection_key', input.projectionKey)
        .forUpdate()
        .first()) as PublicProjectionRow | undefined
      if (existing) {
        const expected = parseAccomplishmentPublicProjectionV1({
          ...input.projection,
          publicationVersion: version(existing.publication_version),
        })
        return { inserted: false, projection: exactPayload(existing, expected, this.hasher) }
      }
      const duplicateId = (await trx
        .from(PUBLIC_PROJECTION_TABLE)
        .where('id', input.projection.id)
        .forUpdate()
        .first()) as PublicProjectionRow | undefined
      if (duplicateId) {
        throw new AccomplishmentPublicProjectionCollisionException(input.projectionKey)
      }

      const aggregate = (await trx
        .from(PUBLIC_PROJECTION_TABLE)
        .where('accomplishment_id', input.projection.accomplishmentId)
        .max('publication_version as maximum')
        .first()) as { maximum?: number | string | null } | undefined
      const publicationVersion = aggregate?.maximum ? version(aggregate.maximum) + 1 : 1
      const projection = parseAccomplishmentPublicProjectionV1({
        ...input.projection,
        publicationVersion,
      })
      await trx
        .from(PUBLIC_PROJECTION_TABLE)
        .where('accomplishment_id', projection.accomplishmentId)
        .whereNull('retired_at')
        .update({ retired_at: date(projection.publishedAt, 'published timestamp') })
      await trx.table(PUBLIC_PROJECTION_TABLE).insert(insertRow(input.projectionKey, projection))
      return { inserted: true, projection }
    }
    return transaction
      ? persist(transaction as TransactionClientContract)
      : db.transaction(persist)
  }

  async retireActive(
    input: RetireActiveAccomplishmentPublicProjectionInput,
    transaction?: AccomplishmentTransaction
  ): Promise<RetiredAccomplishmentPublicProjectionResult> {
    if (!Number.isSafeInteger(input.publicationVersion) || input.publicationVersion < 1) {
      throw new InvariantViolationException('Accomplishment publication version is invalid')
    }
    const retiredAt = date(input.retiredAt, 'retirement timestamp')
    const persist = async (trx: TransactionClientContract) => {
      await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
      await trx.rawQuery('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
        `accomplishment-public:${input.accomplishmentId}`,
      ])
      const source = (await trx
        .from(ACCOMPLISHMENT_TABLE)
        .where('id', input.accomplishmentId)
        .forUpdate()
        .first()) as AccomplishmentSourceRow | undefined
      if (!source || source.user_id !== input.subjectUserId) {
        throw new StaleAccomplishmentPublicationSourceException(input.accomplishmentId)
      }
      const target = (await trx
        .from(PUBLIC_PROJECTION_TABLE)
        .where('id', input.projectionId)
        .where('accomplishment_id', input.accomplishmentId)
        .forUpdate()
        .first()) as PublicProjectionRow | undefined
      if (
        !target ||
        target.user_id !== input.subjectUserId ||
        version(target.publication_version) !== input.publicationVersion
      ) {
        throw new AccomplishmentPublicProjectionCollisionException(
          `unpublish:${input.accomplishmentId}:${input.publicationVersion}`
        )
      }
      if (target.retired_at !== null) {
        return {
          changed: false,
          projectionId: target.id,
          publicationVersion: version(target.publication_version),
          retiredAt: iso(target.retired_at),
        }
      }
      await trx.from(PUBLIC_PROJECTION_TABLE).where('id', target.id).update({ retired_at: retiredAt })
      return {
        changed: true,
        projectionId: target.id,
        publicationVersion: version(target.publication_version),
        retiredAt: retiredAt.toISOString(),
      }
    }
    return transaction
      ? persist(transaction as TransactionClientContract)
      : db.transaction(persist)
  }
}

export const accomplishmentPublicProjectionRepository =
  new AccomplishmentPublicProjectionRepository()

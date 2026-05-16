import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export type LegacyAccomplishmentClassification =
  | 'native_immutable_candidate'
  | 'high_confidence_reconstructed'
  | 'retrospective_user_confirmed'
  | 'insufficient_unverified'
  | 'corrupt_quarantined'

export interface LegacyAccomplishmentSource {
  readonly sourceId: string
  readonly userId: string | null
  readonly taskAssignmentId: string | null
  readonly taskId: string | null
  readonly hasImmutableAssignmentSnapshot: boolean
  readonly hasCompletionReport: boolean
  readonly hasGovernedReviewConfirmation: boolean
  readonly hasVerifiedClaim: boolean
  readonly hasSufficientEvidence: boolean
  readonly userConfirmedRetrospective: boolean
  readonly sourceCorrupt: boolean
}

export interface LegacyBackfillOutcome {
  readonly sourceId: string
  readonly userId: string | null
  readonly classification: LegacyAccomplishmentClassification
  readonly writable: boolean
  readonly reason: string
}

export interface LegacyBackfillPlanInput {
  readonly records: readonly LegacyAccomplishmentSource[]
  readonly cursor: string | null
  readonly limit: number
  readonly tenantUserIds: ReadonlySet<string> | null
  readonly mode: 'dry_run' | 'apply'
}

export interface LegacyBackfillPlan {
  readonly mode: 'dry_run' | 'apply'
  readonly processed: number
  readonly outcomes: readonly LegacyBackfillOutcome[]
  readonly nextCursor: string | null
}

export interface LegacyAccomplishmentBackfillCheckpoint {
  readonly scopeKey: string
  readonly cursor: string | null
  readonly processedSourceIds: readonly string[]
}

export interface LegacyAccomplishmentBackfillReader {
  list(input: {
    readonly scopeKey: string
    readonly cursor: string | null
    readonly limit: number
  }): Promise<readonly LegacyAccomplishmentSource[]>
}

export interface LegacyAccomplishmentBackfillCheckpointStore {
  load(scopeKey: string): Promise<LegacyAccomplishmentBackfillCheckpoint | null>
  save(checkpoint: LegacyAccomplishmentBackfillCheckpoint): Promise<void>
}

export interface LegacyAccomplishmentBackfillWriter {
  persistRetrospective(input: {
    readonly source: LegacyAccomplishmentSource
    readonly outcome: LegacyBackfillOutcome
  }): Promise<void>
}

export function classifyLegacyAccomplishmentSource(
  source: LegacyAccomplishmentSource
): LegacyAccomplishmentClassification {
  if (
    source.sourceCorrupt ||
    source.sourceId.length === 0 ||
    source.userId === null ||
    source.taskAssignmentId === null ||
    source.taskId === null
  ) {
    return 'corrupt_quarantined'
  }

  if (
    source.hasImmutableAssignmentSnapshot &&
    source.hasCompletionReport &&
    source.hasGovernedReviewConfirmation &&
    source.hasVerifiedClaim &&
    source.hasSufficientEvidence
  ) {
    return 'native_immutable_candidate'
  }

  if (source.userConfirmedRetrospective) {
    return 'retrospective_user_confirmed'
  }

  if (
    source.hasImmutableAssignmentSnapshot &&
    source.hasCompletionReport &&
    source.hasGovernedReviewConfirmation &&
    source.hasSufficientEvidence
  ) {
    return 'high_confidence_reconstructed'
  }

  return 'insufficient_unverified'
}

function outcomeFor(
  source: LegacyAccomplishmentSource,
  mode: LegacyBackfillPlanInput['mode']
): LegacyBackfillOutcome {
  const classification = classifyLegacyAccomplishmentSource(source)
  const writable = mode === 'apply' && classification === 'retrospective_user_confirmed'

  const reason = writable
    ? 'Write only a retrospective-labeled historical fact; never a verified accomplishment.'
    : classification === 'native_immutable_candidate'
      ? 'Requires the native governed projector; backfill must not mint a verified fact.'
      : classification === 'high_confidence_reconstructed'
        ? 'Requires explicit reconstruction policy and provenance review before writing.'
        : classification === 'insufficient_unverified'
          ? 'Insufficient immutable evidence; keep legacy compatibility output only.'
          : classification === 'corrupt_quarantined'
            ? 'Quarantine for operator repair; do not write an accomplishment.'
            : 'Dry-run only; no persistent write is permitted.'

  return {
    sourceId: source.sourceId,
    userId: source.userId,
    classification,
    writable,
    reason,
  }
}

export function planLegacyAccomplishmentBackfill(
  input: LegacyBackfillPlanInput
): LegacyBackfillPlan {
  if (!Number.isSafeInteger(input.limit) || input.limit < 1) {
    throw new TypeError('Legacy backfill limit must be a positive safe integer')
  }

  const cursorIndex = input.cursor === null
    ? -1
    : input.records.findIndex((record) => record.sourceId === input.cursor)
  const startIndex = cursorIndex < 0 ? 0 : cursorIndex + 1
  const page = input.records
    .slice(startIndex)
    .filter((record) => input.tenantUserIds === null || (record.userId !== null && input.tenantUserIds.has(record.userId)))
    .slice(0, input.limit)
  const outcomes = page.map((record) => outcomeFor(record, input.mode))
  const last = page.at(-1)
  const next = input.records
    .slice(startIndex + page.length)
    .find((record) => input.tenantUserIds === null || (record.userId !== null && input.tenantUserIds.has(record.userId)))

  return {
    mode: input.mode,
    processed: outcomes.length,
    outcomes,
    nextCursor: next?.sourceId ?? (last ? null : input.cursor),
  }
}

export class RunLegacyAccomplishmentBackfillCommand {
  constructor(
    private readonly reader: LegacyAccomplishmentBackfillReader,
    private readonly checkpoints: LegacyAccomplishmentBackfillCheckpointStore,
    private readonly writer: LegacyAccomplishmentBackfillWriter
  ) {}

  async execute(input: {
    readonly scopeKey: string
    readonly tenantUserIds: ReadonlySet<string> | null
    readonly limit: number
    readonly mode: 'dry_run' | 'apply'
  }): Promise<LegacyBackfillPlan> {
    if (input.scopeKey.length === 0) {
      throw new TypeError('Legacy backfill scope key is required')
    }

    const checkpoint = await this.checkpoints.load(input.scopeKey)
    const records = await this.reader.list({
      scopeKey: input.scopeKey,
      cursor: checkpoint?.cursor ?? null,
      limit: input.limit,
    })
    const plan = planLegacyAccomplishmentBackfill({
      records,
      cursor: null,
      limit: input.limit,
      tenantUserIds: input.tenantUserIds,
      mode: input.mode,
    })

    if (input.mode === 'dry_run') {
      return plan
    }

    const processedSourceIds = new Set(checkpoint?.processedSourceIds ?? [])
    for (const outcome of plan.outcomes) {
      if (!outcome.writable || processedSourceIds.has(outcome.sourceId)) continue
      const source = records.find((candidate) => candidate.sourceId === outcome.sourceId)
      if (!source) {
        throw new InvariantViolationException(`Legacy backfill source disappeared: ${outcome.sourceId}`)
      }
      await this.writer.persistRetrospective({ source, outcome })
      processedSourceIds.add(outcome.sourceId)
    }

    await this.checkpoints.save({
      scopeKey: input.scopeKey,
      cursor: plan.nextCursor,
      processedSourceIds: [...processedSourceIds],
    })
    return plan
  }
}

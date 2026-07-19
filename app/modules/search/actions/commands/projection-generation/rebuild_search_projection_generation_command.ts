import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { BaseCommand } from '#modules/search/actions/base_command'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import {
  advanceSearchProjectionGeneration,
  createSearchProjectionGeneration,
  validateSearchProjectionGeneration,
  type SearchProjectionGeneration,
} from '#modules/search/domain/projection-generation/search_projection_generation'
import { buildSearchGenerationIndexName } from '#modules/search/public_contracts/search_index_naming'
interface CandidateLifecycle {
  readonly aliasName: string
  buildCandidate(populate: (physicalIndexName: string) => Promise<number>, generation: string): Promise<{
    readonly physicalIndexName: string
    readonly previousIndexNames: readonly string[]
    readonly documentCount: number
  }>
}

export interface RebuildSearchProjectionGenerationInput {
  readonly id: string
  readonly target: string
  readonly generation: string
  readonly sourceEntityRevision: string
  readonly contextVersion: string
  readonly taxonomyVersions: Readonly<Record<string, number>>
  readonly enrichmentVersion: string
  readonly expectedDocumentCount: number
  readonly expectedCompletenessChecksum: string
  readonly actualCompletenessChecksum: string
  readonly checkpoint: string
  readonly eventGap: boolean
  readonly now: string
  readonly populate: (physicalIndexName: string) => Promise<number>
}

export class RebuildSearchProjectionGenerationCommand extends BaseCommand<
  RebuildSearchProjectionGenerationInput,
  SearchProjectionGeneration
> {
  constructor(
    private readonly generations: SearchProjectionGenerationRepository,
    private readonly lifecycle: CandidateLifecycle,
  ) {
    super()
  }

  async handle(input: RebuildSearchProjectionGenerationInput): Promise<SearchProjectionGeneration> {
    let generation = createSearchProjectionGeneration({
      id: input.id,
      target: input.target,
      generation: input.generation,
      physicalIndexName: buildSearchGenerationIndexName(this.lifecycle.aliasName, input.generation),
      sourceEntityRevision: input.sourceEntityRevision,
      contextVersion: input.contextVersion,
      taxonomyVersions: input.taxonomyVersions,
      enrichmentVersion: input.enrichmentVersion,
      now: input.now,
    })
    generation = await this.generations.create(generation)
    let lockVersion = 1
    try {
      generation = advanceSearchProjectionGeneration(generation, 'catching_up', input.now)
      lockVersion = await this.persist(generation, lockVersion)
      const candidate = await this.lifecycle.buildCandidate(input.populate, input.generation)
      generation = advanceSearchProjectionGeneration(generation, 'validating', input.now)
      generation = { ...generation, sourceEntityRevision: input.sourceEntityRevision, checkpoint: input.checkpoint, documentCount: candidate.documentCount, completenessChecksum: input.actualCompletenessChecksum }
      lockVersion = await this.persist(generation, lockVersion, candidate.documentCount)
      const outcome = validateSearchProjectionGeneration(generation, {
        expectedDocumentCount: input.expectedDocumentCount,
        actualDocumentCount: candidate.documentCount,
        expectedChecksum: input.expectedCompletenessChecksum,
        actualChecksum: input.actualCompletenessChecksum,
        eventGap: input.eventGap,
      })
      generation = advanceSearchProjectionGeneration(generation, outcome, input.now)
      await this.persist(generation, lockVersion, candidate.documentCount)
      return generation
    } catch (error) {
      if (generation.status !== 'failed' && generation.status !== 'requires_repair' && generation.status !== 'ready' && generation.status !== 'active') {
        try {
          await this.persist(advanceSearchProjectionGeneration(generation, 'failed', input.now), lockVersion)
        } catch {
          // Preserve the original rebuild error; the durable failure transition is best effort.
        }
      }
      throw error
    }
  }

  private async persist(generation: SearchProjectionGeneration, lockVersion: number, documentCount = generation.documentCount): Promise<number> {
    const updated = await this.generations.transition({
      id: generation.id,
      expectedLockVersion: lockVersion,
      status: generation.status,
      sourceEntityRevision: generation.sourceEntityRevision,
      checkpoint: generation.checkpoint,
      documentCount,
      completenessChecksum: generation.completenessChecksum,
      updatedAt: generation.updatedAt,
    })
    if (updated === null) throw new ConflictException('search_projection_generation_lock_conflict')
    return updated.lockVersion
  }
}

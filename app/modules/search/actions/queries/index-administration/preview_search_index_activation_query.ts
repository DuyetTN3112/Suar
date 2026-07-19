import { BaseQuery } from '#modules/search/actions/base_query'
import type { SearchIndexPlanTokenGenerator } from '#modules/search/actions/ports/outbound/search_index_administration_port'
import type { SearchProjectionGenerationRepository } from '#modules/search/actions/ports/outbound/search_projection_generation_repository'
import type { SearchProjectionGeneration } from '#modules/search/domain/projection-generation/search_projection_generation'

interface SearchGenerationRoutingPort {
  getBackingIndices(): Promise<readonly string[]>
}

export interface SearchIndexActivationPreview {
  readonly mode: 'preview'
  readonly activeIndexNames: readonly string[]
  readonly candidate: Omit<SearchProjectionGeneration, 'createdAt' | 'updatedAt'> | null
  readonly expectedLockVersion: number | null
  readonly expectedStateToken: string
  readonly blockers: readonly string[]
}

function stateToken(
  generation: SearchProjectionGeneration | null,
  activeIndexNames: readonly string[],
  tokenGenerator: SearchIndexPlanTokenGenerator
): string {
  return tokenGenerator.generate({ generation, activeIndexNames })
}

export class PreviewSearchIndexActivationQuery extends BaseQuery<
  { readonly id: string },
  SearchIndexActivationPreview
> {
  constructor(
    private readonly generations: SearchProjectionGenerationRepository,
    private readonly routing: SearchGenerationRoutingPort,
    private readonly tokenGenerator: SearchIndexPlanTokenGenerator
  ) {
    super()
  }

  async handle(input: { readonly id: string }): Promise<SearchIndexActivationPreview> {
    const [candidate, activeIndexNames] = await Promise.all([
      this.generations.findById(input.id),
      this.routing.getBackingIndices(),
    ])
    const records = candidate === null ? [] : await this.generations.listByTarget(candidate.target)
    const record = records.find(({ generation }) => generation.id === candidate?.id) ?? null
    const candidateProjection = candidate === null
      ? null
      : (({ createdAt: _createdAt, updatedAt: _updatedAt, ...projection }) => projection)(candidate)
    const blockers = candidate === null
      ? ['generation_missing']
      : candidate.status === 'ready'
        ? []
        : ['generation_not_ready']

    return {
      mode: 'preview',
      activeIndexNames: [...activeIndexNames],
      candidate: candidateProjection,
      expectedLockVersion: record?.lockVersion ?? null,
      expectedStateToken: stateToken(candidate, activeIndexNames, this.tokenGenerator),
      blockers,
    }
  }

  execute(input: { readonly id: string }): Promise<SearchIndexActivationPreview> {
    return this.handle(input)
  }
}

export { stateToken as searchIndexActivationStateToken }

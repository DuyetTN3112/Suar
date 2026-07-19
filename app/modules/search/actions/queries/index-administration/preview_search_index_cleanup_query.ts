import { BaseQuery } from '#modules/search/actions/base_query'
import type {
  PreviewSearchIndexCleanupInput,
  SearchIndexCleanupPlan,
} from '#modules/search/actions/dtos/search_index_administration'
import type {
  SearchIndexAdministrationPort,
  SearchIndexPlanTokenGenerator,
} from '#modules/search/actions/ports/outbound/search_index_administration_port'
import type { SearchIndexDescriptor } from '#modules/search/domain/index-administration/search_index_administration'
import {
  buildSearchIndexCleanupCandidates,
  buildSearchIndexCleanupPlanTokenPayload,
  normalizeSearchIndexCleanupPolicy,
  resolveSearchIndexDescriptors,
} from '#modules/search/domain/index-administration/search_index_administration_policy'

export class PreviewSearchIndexCleanupQuery extends BaseQuery<
  PreviewSearchIndexCleanupInput,
  SearchIndexCleanupPlan
> {
  constructor(
    private readonly administration: SearchIndexAdministrationPort,
    private readonly descriptors: readonly SearchIndexDescriptor[],
    private readonly planTokenGenerator: SearchIndexPlanTokenGenerator,
    private readonly now: () => Date = () => new Date()
  ) {
    super()
  }

  async handle(input: PreviewSearchIndexCleanupInput): Promise<SearchIndexCleanupPlan> {
    const policy = normalizeSearchIndexCleanupPolicy(input, this.now())
    const descriptors = resolveSearchIndexDescriptors(
      this.descriptors,
      input.target ?? 'all'
    )
    const inventories = await Promise.all(
      descriptors.map((descriptor) => this.administration.inspect(descriptor))
    )
    const candidates = buildSearchIndexCleanupCandidates(inventories, policy)
    const planToken = this.planTokenGenerator.generate(
      buildSearchIndexCleanupPlanTokenPayload({
        policy,
        inventories,
        candidates,
      })
    )

    return {
      mode: 'preview',
      retainRetired: policy.retainRetired,
      olderThanHours: policy.olderThanHours,
      cutoff: policy.cutoff.toISOString(),
      planToken,
      inventories,
      candidates,
      deletedIndexNames: [],
    }
  }
}

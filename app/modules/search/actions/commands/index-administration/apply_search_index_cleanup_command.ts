import { BaseCommand } from '#modules/search/actions/base_command'
import type {
  ApplySearchIndexCleanupInput,
  SearchIndexCleanupPlan,
} from '#modules/search/actions/dtos/search_index_administration'
import type {
  SearchIndexAdministrationPort,
  SearchIndexPlanTokenGenerator,
} from '#modules/search/actions/ports/outbound/search_index_administration_port'
import type { SearchIndexDescriptor } from '#modules/search/domain/index-administration/search_index_administration'
import { SearchIndexAdministrationError } from '#modules/search/domain/index-administration/search_index_administration_error'
import {
  assertSearchIndexCleanupApplyPolicy,
  buildSearchIndexCleanupCandidates,
  buildSearchIndexCleanupPlanTokenPayload,
  normalizeSearchIndexCleanupPolicy,
  resolveExactSearchIndexDescriptor,
} from '#modules/search/domain/index-administration/search_index_administration_policy'

export class ApplySearchIndexCleanupCommand extends BaseCommand<
  ApplySearchIndexCleanupInput,
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

  async handle(input: ApplySearchIndexCleanupInput): Promise<SearchIndexCleanupPlan> {
    assertSearchIndexCleanupApplyPolicy(input)
    const policy = normalizeSearchIndexCleanupPolicy(input, this.now())
    const descriptor = resolveExactSearchIndexDescriptor(
      this.descriptors,
      input.target ?? 'all'
    )
    const inventory = await this.administration.inspect(descriptor)
    const inventories = [inventory]
    const candidates = buildSearchIndexCleanupCandidates(inventories, policy)
    const planToken = this.planTokenGenerator.generate(
      buildSearchIndexCleanupPlanTokenPayload({
        policy,
        inventories,
        candidates,
      })
    )
    if (input.expectedPlanToken !== planToken) {
      throw new SearchIndexAdministrationError(
        'SEARCH_INDEX_CLEANUP_PLAN_MISMATCH',
        'Search cleanup apply does not match the exact reviewed preview plan'
      )
    }

    const indexNames = candidates.map((candidate) => candidate.indexName)
    if (indexNames.length > 0) {
      await this.administration.deleteRetired({
        descriptor,
        indexNames,
        expectedActiveIndexNames: inventory.activeIndexNames,
      })
    }

    return {
      mode: 'applied',
      retainRetired: policy.retainRetired,
      olderThanHours: policy.olderThanHours,
      cutoff: policy.cutoff.toISOString(),
      planToken,
      inventories,
      candidates,
      deletedIndexNames: [...indexNames].sort(),
    }
  }
}

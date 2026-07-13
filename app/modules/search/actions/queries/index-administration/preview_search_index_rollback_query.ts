import { BaseQuery } from '#modules/search/actions/base_query'
import type {
  PreviewSearchIndexRollbackInput,
  SearchIndexRollbackPlan,
} from '#modules/search/actions/dtos/search_index_administration'
import type { SearchIndexAdministrationPort } from '#modules/search/actions/ports/outbound/search_index_administration_port'
import type { SearchIndexDescriptor } from '#modules/search/domain/index-administration/search_index_administration'
import {
  buildSearchIndexRollbackPlan,
  resolveExactSearchIndexDescriptor,
} from '#modules/search/domain/index-administration/search_index_administration_policy'

export class PreviewSearchIndexRollbackQuery extends BaseQuery<
  PreviewSearchIndexRollbackInput,
  SearchIndexRollbackPlan
> {
  constructor(
    private readonly administration: SearchIndexAdministrationPort,
    private readonly descriptors: readonly SearchIndexDescriptor[]
  ) {
    super()
  }

  async handle(input: PreviewSearchIndexRollbackInput): Promise<SearchIndexRollbackPlan> {
    const descriptor = resolveExactSearchIndexDescriptor(this.descriptors, input.target)
    const inventory = await this.administration.inspect(descriptor)
    return {
      mode: 'preview',
      ...buildSearchIndexRollbackPlan(descriptor, inventory, input),
    }
  }
}

import type { InspectSearchIndicesInput } from '#modules/search/actions/dtos/search_index_administration'
import type { SearchIndexAdministrationPort } from '#modules/search/actions/ports/outbound/search_index_administration_port'
import type {
  SearchIndexDescriptor,
  SearchIndexInventory,
} from '#modules/search/domain/search_index_administration'
import { resolveSearchIndexDescriptors } from '#modules/search/domain/search_index_administration_policy'

export class InspectSearchIndicesQuery {
  constructor(
    private readonly administration: SearchIndexAdministrationPort,
    private readonly descriptors: readonly SearchIndexDescriptor[]
  ) {}

  async handle(input: InspectSearchIndicesInput = {}): Promise<SearchIndexInventory[]> {
    const descriptors = resolveSearchIndexDescriptors(
      this.descriptors,
      input.target ?? 'all'
    )
    return Promise.all(
      descriptors.map((descriptor) => this.administration.inspect(descriptor))
    )
  }
}

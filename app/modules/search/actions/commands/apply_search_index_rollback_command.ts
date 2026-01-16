import type {
  ApplySearchIndexRollbackInput,
  SearchIndexRollbackPlan,
} from '#modules/search/actions/dtos/search_index_administration'
import type { SearchIndexAdministrationPort } from '#modules/search/actions/ports/outbound/search_index_administration_port'
import type { SearchIndexDescriptor } from '#modules/search/domain/search_index_administration'
import {
  assertSearchIndexRollbackApplyPolicy,
  buildSearchIndexRollbackPlan,
  resolveExactSearchIndexDescriptor,
} from '#modules/search/domain/search_index_administration_policy'

export class ApplySearchIndexRollbackCommand {
  constructor(
    private readonly administration: SearchIndexAdministrationPort,
    private readonly descriptors: readonly SearchIndexDescriptor[],
    private readonly allowUnverifiedRollbackApply: boolean
  ) {}

  async handle(input: ApplySearchIndexRollbackInput): Promise<SearchIndexRollbackPlan> {
    assertSearchIndexRollbackApplyPolicy({
      ...input,
      allowUnverifiedRollbackApply: this.allowUnverifiedRollbackApply,
    })
    const descriptor = resolveExactSearchIndexDescriptor(this.descriptors, input.target)
    const inventory = await this.administration.inspect(descriptor)
    const plan = buildSearchIndexRollbackPlan(descriptor, inventory, input)
    await this.administration.activate({
      descriptor,
      expectedCurrentIndexName: input.expectedCurrentIndexName,
      targetIndexName: input.rollbackIndexName,
    })
    return {
      mode: 'applied',
      ...plan,
    }
  }
}

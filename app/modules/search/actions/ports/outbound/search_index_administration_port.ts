import type {
  SearchIndexDescriptor,
  SearchIndexInventory,
} from '#modules/search/domain/index-administration/search_index_administration'

export type {
  SearchIndexDescriptor,
  SearchIndexGenerationRecord,
  SearchIndexInventory,
  SearchIndexTarget,
} from '#modules/search/domain/index-administration/search_index_administration'

export interface DeleteRetiredSearchIndicesInput {
  descriptor: SearchIndexDescriptor
  indexNames: string[]
  expectedActiveIndexNames: string[]
}

export interface ActivateSearchIndexInput {
  descriptor: SearchIndexDescriptor
  expectedCurrentIndexName: string
  targetIndexName: string
}

export interface SearchIndexAdministrationPort {
  inspect(descriptor: SearchIndexDescriptor): Promise<SearchIndexInventory>
  deleteRetired(input: DeleteRetiredSearchIndicesInput): Promise<void>
  activate(input: ActivateSearchIndexInput): Promise<void>
}

export interface SearchIndexPlanTokenGenerator {
  generate(payload: unknown): string
}

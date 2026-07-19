import type {
  SearchIndexCleanupCandidate,
  SearchIndexInventory,
  SearchIndexRollbackPlanData,
} from '#modules/search/domain/index-administration/search_index_administration'

export interface InspectSearchIndicesInput {
  target?: string
}

export interface PreviewSearchIndexCleanupInput {
  target?: string
  retainRetired?: number
  olderThanHours?: number
}

export interface ApplySearchIndexCleanupInput extends PreviewSearchIndexCleanupInput {
  reason?: string
  confirmation?: string
  expectedPlanToken?: string
}

export interface SearchIndexCleanupPlan {
  mode: 'preview' | 'applied'
  retainRetired: number
  olderThanHours: number
  cutoff: string
  planToken: string
  inventories: SearchIndexInventory[]
  candidates: SearchIndexCleanupCandidate[]
  deletedIndexNames: string[]
}

export interface PreviewSearchIndexRollbackInput {
  target: string
  expectedCurrentIndexName: string
  rollbackIndexName: string
  allowEmpty?: boolean
}

export interface ApplySearchIndexRollbackInput extends PreviewSearchIndexRollbackInput {
  reason?: string
  confirmation?: string
}

export interface SearchIndexRollbackPlan extends SearchIndexRollbackPlanData {
  mode: 'preview' | 'applied'
}

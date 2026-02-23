export type SearchIndexTarget =
  | 'talents'
  | 'tasks'
  | 'projects'
  | 'skills'
  | 'organizations'
  | 'users'

export interface SearchIndexDescriptor {
  target: SearchIndexTarget
  aliasName: string
  initialPhysicalIndexName: string
}

export interface SearchIndexGenerationRecord {
  indexName: string
  active: boolean
  writeIndex: boolean
  aliases: string[]
  documentCount: number
  createdAt: string | null
}

export interface SearchIndexInventory {
  target: SearchIndexTarget
  aliasName: string
  initialPhysicalIndexName: string
  activeIndexNames: string[]
  generations: SearchIndexGenerationRecord[]
}

export interface SearchIndexCleanupCandidate {
  target: SearchIndexTarget
  aliasName: string
  indexName: string
  documentCount: number
  createdAt: string
}

export interface SearchIndexCleanupPolicy {
  retainRetired: number
  olderThanHours: number
  cutoff: Date
}

export interface SearchIndexRollbackPlanData {
  target: SearchIndexTarget
  aliasName: string
  previousIndexName: string
  rollbackIndexName: string
  previousDocumentCount: number
  rollbackDocumentCount: number
}

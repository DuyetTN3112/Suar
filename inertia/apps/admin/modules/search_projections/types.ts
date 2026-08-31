export type SearchIndexTarget =
  | 'talents'
  | 'tasks'
  | 'projects'
  | 'skills'
  | 'organizations'
  | 'users'
  | 'comments'

export type SearchProjectionStatus =
  | 'unknown'
  | 'building'
  | 'catching_up'
  | 'validating'
  | 'blocked'
  | 'ready'
  | 'active'
  | 'failed'

export interface SearchProjectionGenerationView {
  readonly id: string
  readonly target: string
  readonly generation: string
  readonly status: SearchProjectionStatus
  readonly checkpoint: string | null
  readonly sourceEntityRevision: string
  readonly documentCount: number | null
  readonly expectedDocumentCount: number | null
  readonly completenessChecksum: string | null
  readonly updatedAt: string
  readonly blocker?: string
}

export interface SearchProjectionPreview {
  readonly kind: 'activate' | 'rollback'
  readonly generationId: string
  readonly previewToken: string
  readonly isStale: boolean
  readonly staleReason?: string
  readonly expectedLockVersion?: number
  readonly expectedCurrentIndexNames?: readonly string[]
  readonly expectedStateToken?: string
}

export interface SearchIndexGenerationRecord {
  readonly indexName: string
  readonly active: boolean
  readonly writeIndex: boolean
  readonly aliases: readonly string[]
  readonly documentCount: number
  readonly createdAt: string | null
}

export interface SearchIndexInventory {
  readonly target: SearchIndexTarget
  readonly aliasName: string
  readonly initialPhysicalIndexName: string
  readonly activeIndexNames: readonly string[]
  readonly generations: readonly SearchIndexGenerationRecord[]
}

export interface SearchIndexCleanupCandidate {
  readonly target: SearchIndexTarget
  readonly aliasName: string
  readonly indexName: string
  readonly documentCount: number
  readonly createdAt: string
}

export interface SearchIndexCleanupPlan {
  readonly mode: 'preview' | 'applied'
  readonly retainRetired: number
  readonly olderThanHours: number
  readonly cutoff: string
  readonly planToken: string
  readonly inventories: readonly SearchIndexInventory[]
  readonly candidates: readonly SearchIndexCleanupCandidate[]
  readonly deletedIndexNames: readonly string[]
}

export interface SearchIndexRollbackPlan {
  readonly mode: 'preview' | 'applied'
  readonly target: SearchIndexTarget
  readonly aliasName: string
  readonly previousIndexName: string
  readonly rollbackIndexName: string
  readonly previousDocumentCount: number
  readonly rollbackDocumentCount: number
}

export interface SearchIndexActivationPreview {
  readonly mode: 'preview'
  readonly activeIndexNames: readonly string[]
  readonly candidate: Record<string, unknown> | null
  readonly expectedLockVersion: number | null
  readonly expectedStateToken: string
  readonly blockers: readonly string[]
}

export interface ActivationApplyInput {
  readonly id: string
  readonly expectedLockVersion: number
  readonly expectedCurrentIndexNames?: readonly string[]
  readonly expectedStateToken: string
  readonly now: string
}

export interface CleanupPreviewInput {
  readonly target?: SearchIndexTarget
  readonly retainRetired?: number
  readonly olderThanHours?: number
}

export interface CleanupApplyInput extends CleanupPreviewInput {
  readonly reason: string
  readonly confirmation: string
  readonly expectedPlanToken: string
}

export interface RollbackPreviewInput {
  readonly target: SearchIndexTarget
  readonly expectedCurrentIndexName: string
  readonly rollbackIndexName: string
  readonly allowEmpty?: boolean
}

export interface RollbackApplyInput extends RollbackPreviewInput {
  readonly reason: string
  readonly confirmation: string
}

export type SearchProjectionLoadingAction =
  | 'load'
  | 'cleanup-preview'
  | 'cleanup-apply'
  | 'rollback-preview'
  | 'rollback-apply'
  | 'activation-preview'
  | 'activation-apply'
  | 'reconcile'
  | null

export interface SearchProjectionAdminSnapshot {
  readonly generations: readonly SearchProjectionGenerationView[]
  readonly activeGenerationId: string | null
  readonly preview: SearchProjectionPreview | null
  readonly inventories?: readonly SearchIndexInventory[]
  readonly cleanupPreview?: SearchIndexCleanupPlan | null
  readonly rollbackPreview?: SearchIndexRollbackPlan | null
  readonly stalePreview?: 'cleanup' | 'rollback' | null
  readonly error: string | null
  readonly loadingAction: SearchProjectionLoadingAction
}

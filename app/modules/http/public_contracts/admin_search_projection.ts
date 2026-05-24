export interface AdminSearchProjectionOperator {
  id: string
  systemRole: string
  actorType: 'service' | 'human'
  authenticationProvenance: 'runtime_environment' | 'session'
}

export interface AdminSearchProjectionCleanupInput {
  target?: string
  retainRetired?: number
  olderThanHours?: number
  reason?: string
  confirmation?: string
  expectedPlanToken?: string
}

export interface AdminSearchProjectionRollbackInput {
  target: string
  expectedCurrentIndexName: string
  rollbackIndexName: string
  allowEmpty?: boolean
  reason?: string
  confirmation?: string
}

export interface AdminSearchProjectionInspectInput {
  target?: string
}

export interface AdminSearchProjectionActivationPreviewInput {
  id: string
}

export interface AdminSearchProjectionActivationApplyInput {
  id: string
  expectedLockVersion: number
  expectedCurrentIndexNames?: string[]
  expectedStateToken: string
  now: string
}

export interface AdminSearchProjectionInventoryGeneration {
  indexName: string
  active: boolean
  documentCount: number
  createdAt: string | null
}

export interface AdminSearchProjectionInventory {
  target: string
  generations: readonly AdminSearchProjectionInventoryGeneration[]
}

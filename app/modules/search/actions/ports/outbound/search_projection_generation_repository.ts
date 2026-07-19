import type { SearchProjectionGeneration, SearchProjectionGenerationStatus } from '#modules/search/domain/projection-generation/search_projection_generation'

export interface SearchProjectionGenerationRecord {
  readonly generation: SearchProjectionGeneration
  readonly lockVersion: number
}

export interface SearchProjectionGenerationRepository {
  create(generation: SearchProjectionGeneration): Promise<SearchProjectionGeneration>
  findById(id: string): Promise<SearchProjectionGeneration | null>
  listByTarget(target: string): Promise<readonly SearchProjectionGenerationRecord[]>
  withTargetLock<T>(target: string, callback: (repository: SearchProjectionGenerationRepository) => Promise<T>): Promise<T>
  transition(input: { readonly id: string; readonly expectedLockVersion: number; readonly status: SearchProjectionGenerationStatus; readonly sourceEntityRevision: string; readonly checkpoint: string | null; readonly documentCount: number | null; readonly completenessChecksum: string | null; readonly updatedAt: string }): Promise<{ readonly generation: SearchProjectionGeneration; readonly lockVersion: number } | null>
}

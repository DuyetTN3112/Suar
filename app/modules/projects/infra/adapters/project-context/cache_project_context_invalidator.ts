import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { ProjectContextCacheInvalidator } from '#modules/projects/actions/ports/outbound/project-context/project_context_cache_invalidator'

/**
 * Resolved-brief cache keys already embed an immutable version token, so a newly
 * published context version can never read a previous version's entry. This
 * invalidator therefore only sweeps superseded entries to reclaim space, and it
 * is deliberately best-effort: a cache outage must not fail a publication that
 * has already committed.
 */
export class CacheProjectContextInvalidator implements ProjectContextCacheInvalidator {
  async invalidateResolvedTaskContext(projectId: string, versionToken: string): Promise<void> {
    if (projectId.length === 0 || versionToken.length === 0) return
    await cacheStore.deleteByPatternBestEffort(
      cacheStore.buildKey('task', 'resolved-brief', 'v1', 'project', projectId, '*')
    )
  }
}

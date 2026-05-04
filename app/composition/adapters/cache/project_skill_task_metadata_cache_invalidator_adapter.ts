import type { ProjectSkillTaskMetadataCacheInvalidator } from '#modules/skills/actions/ports/outbound/project_skill_task_metadata_cache_invalidator'
import { cacheInvalidationStore } from '#modules/cache/public_contracts/cache_store'

/**
 * Rotates the logical Task metadata generation. This is intentionally not a
 * Redis scan and does not flush the cache plane.
 */
export class ProjectSkillTaskMetadataCacheInvalidatorAdapter
  implements ProjectSkillTaskMetadataCacheInvalidator
{
  async invalidateTaskMetadata(): Promise<void> {
    await cacheInvalidationStore.deleteByPattern('task:metadata:*')
  }
}

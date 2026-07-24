/**
 * Invalidates only the cached data used to build the Task creation metadata.
 *
 * A Project skill range changes which minimum levels a creator may choose, so
 * that metadata must not remain warm after the Project configuration changes.
 */
export interface ProjectSkillTaskMetadataCacheInvalidator {
  invalidateTaskMetadata(): Promise<void>
}

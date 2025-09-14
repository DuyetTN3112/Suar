import * as projectMemberQueries from './read/project_member_queries.js'
import * as projectMemberMutations from './write/project_member_mutations.js'

/**
 * ProjectMemberRepository
 *
 * Barrel file that combines read and write operations for project members.
 * This maintains backward compatibility with existing imports.
 */
const ProjectMemberRepository = {
  ...projectMemberQueries,
  ...projectMemberMutations,
}

export default ProjectMemberRepository

// Re-export types
export type { DatabaseId } from '#types/database'

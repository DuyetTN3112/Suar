import * as organizationUser from './organization_user_repository.js'
import * as orgAccessQueries from './read/org_access_repository.js'
import * as organizationQueries from './read/organization_repository.js'
import * as organizationMutations from './write/organization_mutations.js'

/**
 * Barrel file for Organization repositories.
 * Re-exports read and write operations.
 */
const OrganizationRepository = {
  ...organizationQueries,
  ...orgAccessQueries,
  ...organizationMutations,
  ...organizationUser,
}

export default OrganizationRepository

// Re-export types
export type { DatabaseId } from '#types/database'

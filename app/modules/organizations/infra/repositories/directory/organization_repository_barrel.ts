import * as organizationQueries from '../read/directory/organization_repository.js'
import * as organizationMutations from '../write/directory/organization_mutations.js'

/**
 * Barrel file for Organization repositories.
 * Re-exports read and write operations.
 */
const OrganizationRepository = {
  ...organizationQueries,
  ...organizationMutations,
}

export default OrganizationRepository

// Re-export types

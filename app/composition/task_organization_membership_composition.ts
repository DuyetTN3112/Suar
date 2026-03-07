import { OrganizationTaskMembershipWriterAdapter } from './adapters/organization_task_membership_writer_adapter.js'
import { organizationCacheInvalidator } from './organization_cache_composition.js'

export const taskOrganizationMembershipWriter = new OrganizationTaskMembershipWriterAdapter(
  organizationCacheInvalidator
)

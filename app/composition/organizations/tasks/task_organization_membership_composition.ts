import { organizationCacheInvalidator } from '../access/organization_cache_composition.js'

import { OrganizationTaskMembershipWriterAdapter } from './adapters/organization_task_membership_writer_adapter.js'

export const taskOrganizationMembershipWriter = new OrganizationTaskMembershipWriterAdapter(
  organizationCacheInvalidator
)

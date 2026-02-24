import { OrganizationProjectLifecycleAdapter } from './adapters/organization_project_lifecycle_adapter.js'
import { ComposedOrganizationDeletionCommandFactory } from './factories/organization_directory_action_factories.js'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWriter,
} from './organization_persistence_composition.js'

import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'

export const organizationProjectLifecycleReader = new OrganizationProjectLifecycleAdapter()
export const organizationDeletionCommandFactory = new ComposedOrganizationDeletionCommandFactory(
  organizationProjectLifecycleReader,
  organizationTransactionRunner,
  organizationReader,
  organizationWriter,
  organizationMembershipRepository,
  organizationEventPublisher
)

export function makeDeleteOrganizationCommand(context: OrganizationActionContext) {
  return organizationDeletionCommandFactory.make(context)
}

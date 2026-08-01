import type CreateOrganizationCommand from '#modules/organizations/directory/actions/command/create_organization_command'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'

/**
 * Inbound construction contract for organization creation.
 */
export abstract class OrganizationCreationCommandFactory {
  abstract make(context: OrganizationActionContext): CreateOrganizationCommand
}

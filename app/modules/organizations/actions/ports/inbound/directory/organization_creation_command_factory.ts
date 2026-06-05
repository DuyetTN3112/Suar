import type CreateOrganizationCommand from '#modules/organizations/actions/commands/directory/create_organization_command'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'

/**
 * Inbound construction contract for organization creation.
 */
export abstract class OrganizationCreationCommandFactory {
  abstract make(context: OrganizationActionContext): CreateOrganizationCommand
}

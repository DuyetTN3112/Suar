import type DeleteOrganizationCommand from '#modules/organizations/actions/commands/directory/delete_organization_command'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'

/**
 * Inbound construction contract for organization deletion.
 */
export abstract class OrganizationDeletionCommandFactory {
  abstract make(context: OrganizationActionContext): DeleteOrganizationCommand
}

import type DeleteOrganizationCommand from '#modules/organizations/directory/actions/command/delete_organization_command'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'

/**
 * Inbound construction contract for organization deletion.
 */
export abstract class OrganizationDeletionCommandFactory {
  abstract make(context: OrganizationActionContext): DeleteOrganizationCommand
}

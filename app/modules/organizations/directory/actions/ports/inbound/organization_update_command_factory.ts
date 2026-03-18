import type UpdateOrganizationCommand from '#modules/organizations/directory/actions/command/update_organization_command'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'

/**
 * Inbound construction contract for organization updates.
 */
export abstract class OrganizationUpdateCommandFactory {
  abstract make(context: OrganizationActionContext): UpdateOrganizationCommand
}

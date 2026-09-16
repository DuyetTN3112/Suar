import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type UpdateOrganizationCommand from '#modules/organizations/actions/commands/directory/update_organization_command'

/**
 * Inbound construction contract for organization updates.
 */
export abstract class OrganizationUpdateCommandFactory {
  abstract make(context: OrganizationActionContext): UpdateOrganizationCommand
}

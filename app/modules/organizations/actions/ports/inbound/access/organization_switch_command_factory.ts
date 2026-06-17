import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type SwitchOrganizationCommand from '#modules/organizations/actions/commands/access/switch_organization_command'

/**
 * Inbound construction contract for the organization-switching command.
 */
export abstract class OrganizationSwitchCommandFactory {
  abstract make(context: OrganizationActionContext): SwitchOrganizationCommand
}

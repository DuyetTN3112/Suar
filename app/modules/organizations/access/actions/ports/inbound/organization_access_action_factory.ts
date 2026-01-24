import type { OrganizationActionContext } from '#modules/organizations/access/actions/action_context'
import type UpdateCustomRolesCommand from '#modules/organizations/access/actions/command/update_custom_roles_command'
import type GetAccessConfigurationQuery from '#modules/organizations/access/actions/query/get_access_configuration_query'
import type GetAssignableOrganizationRolesQuery from '#modules/organizations/access/actions/query/get_assignable_organization_roles_query'

/**
 * Inbound construction contract for context-bound organization access use cases.
 */
export abstract class OrganizationAccessActionFactory {
  abstract makeGetAccessConfiguration(
    context: OrganizationActionContext
  ): GetAccessConfigurationQuery

  abstract makeGetAssignableRoles(
    context: OrganizationActionContext
  ): GetAssignableOrganizationRolesQuery

  abstract makeUpdateCustomRoles(context: OrganizationActionContext): UpdateCustomRolesCommand
}

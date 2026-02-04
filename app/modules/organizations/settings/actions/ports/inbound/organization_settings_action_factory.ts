import type { OrganizationActionContext } from '#modules/organizations/settings/actions/action_context'
import type UpdateOrganizationSettingsCommand from '#modules/organizations/settings/actions/command/update_organization_settings_command'
import type GetOrganizationSettingsQuery from '#modules/organizations/settings/actions/query/get_organization_settings_query'

/**
 * Inbound construction contract for organization settings use cases.
 */
export abstract class OrganizationSettingsActionFactory {
  abstract makeGetSettings(context: OrganizationActionContext): GetOrganizationSettingsQuery
  abstract makeUpdateSettings(
    context: OrganizationActionContext
  ): UpdateOrganizationSettingsCommand
}

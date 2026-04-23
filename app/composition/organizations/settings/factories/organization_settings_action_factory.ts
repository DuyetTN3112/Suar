import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import UpdateOrganizationSettingsCommand from '#modules/organizations/actions/commands/settings/update_organization_settings_command'
import { OrganizationSettingsActionFactory } from '#modules/organizations/actions/ports/inbound/settings/organization_settings_action_factory'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWriter,
} from '#modules/organizations/actions/ports/outbound/settings/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import GetOrganizationSettingsQuery from '#modules/organizations/actions/queries/settings/get_organization_settings_query'

export class ComposedOrganizationSettingsActionFactory extends OrganizationSettingsActionFactory {
  constructor(
    private readonly organizations: OrganizationReader,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly transactions: OrganizationTransactionRunner
  ) {
    super()
  }

  makeGetSettings(context: OrganizationActionContext): GetOrganizationSettingsQuery {
    return new GetOrganizationSettingsQuery(context, this.organizations, this.memberships)
  }

  makeUpdateSettings(context: OrganizationActionContext): UpdateOrganizationSettingsCommand {
    return new UpdateOrganizationSettingsCommand(
      context,
      this.transactions,
      this.organizations,
      this.organizationWriter,
      this.memberships
    )
  }
}

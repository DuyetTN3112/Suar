import type { OrganizationActionContext } from '#modules/organizations/settings/actions/action_context'
import UpdateOrganizationSettingsCommand from '#modules/organizations/settings/actions/command/update_organization_settings_command'
import { OrganizationSettingsActionFactory } from '#modules/organizations/settings/actions/ports/inbound/organization_settings_action_factory'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWriter,
} from '#modules/organizations/settings/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/settings/actions/ports/outbound/organization_transaction'
import GetOrganizationSettingsQuery from '#modules/organizations/settings/actions/query/get_organization_settings_query'

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

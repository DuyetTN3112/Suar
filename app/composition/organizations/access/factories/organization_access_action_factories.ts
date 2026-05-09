import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import SwitchOrganizationCommand from '#modules/organizations/actions/commands/access/switch_organization_command'
import UpdateCustomRolesCommand from '#modules/organizations/actions/commands/access/update_custom_roles_command'
import { OrganizationAccessActionFactory } from '#modules/organizations/actions/ports/inbound/access/organization_access_action_factory'
import { OrganizationSwitchCommandFactory } from '#modules/organizations/actions/ports/inbound/access/organization_switch_command_factory'
import type { OrganizationAdministrationRepository } from '#modules/organizations/actions/ports/outbound/access/organization_administration_repository'
import type { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/access/organization_external_dependencies'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWriter,
} from '#modules/organizations/actions/ports/outbound/access/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import GetAccessConfigurationQuery from '#modules/organizations/actions/queries/access/get_access_configuration_query'
import GetAssignableOrganizationRolesQuery from '#modules/organizations/actions/queries/access/get_assignable_organization_roles_query'

export class ComposedOrganizationAccessActionFactory extends OrganizationAccessActionFactory {
  constructor(
    private readonly administration: OrganizationAdministrationRepository,
    private readonly organizations: OrganizationReader,
    private readonly organizationWriter: OrganizationWriter,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly transactions: OrganizationTransactionRunner
  ) {
    super()
  }

  makeGetAccessConfiguration(context: OrganizationActionContext): GetAccessConfigurationQuery {
    return new GetAccessConfigurationQuery(
      context,
      this.administration,
      this.organizations,
      this.memberships
    )
  }

  makeGetAssignableRoles(context: OrganizationActionContext): GetAssignableOrganizationRolesQuery {
    return new GetAssignableOrganizationRolesQuery(context, this.organizations)
  }

  makeUpdateCustomRoles(context: OrganizationActionContext): UpdateCustomRolesCommand {
    return new UpdateCustomRolesCommand(
      context,
      this.transactions,
      this.organizations,
      this.organizationWriter,
      this.memberships
    )
  }
}

export class ComposedOrganizationSwitchCommandFactory extends OrganizationSwitchCommandFactory {
  constructor(
    private readonly users: OrganizationUserReaderWriter,
    private readonly transactions: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {
    super()
  }

  make(context: OrganizationActionContext): SwitchOrganizationCommand {
    return new SwitchOrganizationCommand(
      context,
      this.users,
      this.transactions,
      this.organizations,
      this.memberships
    )
  }
}

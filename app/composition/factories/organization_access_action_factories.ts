import type { OrganizationActionContext } from '#modules/organizations/access/actions/action_context'
import SwitchOrganizationCommand from '#modules/organizations/access/actions/command/switch_organization_command'
import UpdateCustomRolesCommand from '#modules/organizations/access/actions/command/update_custom_roles_command'
import { OrganizationAccessActionFactory } from '#modules/organizations/access/actions/ports/inbound/organization_access_action_factory'
import { OrganizationSwitchCommandFactory } from '#modules/organizations/access/actions/ports/inbound/organization_switch_command_factory'
import type { OrganizationAdministrationRepository } from '#modules/organizations/access/actions/ports/outbound/organization_administration_repository'
import type { OrganizationUserReaderWriter } from '#modules/organizations/access/actions/ports/outbound/organization_external_dependencies'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
  OrganizationWriter,
} from '#modules/organizations/access/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/access/actions/ports/outbound/organization_transaction'
import GetAccessConfigurationQuery from '#modules/organizations/access/actions/query/get_access_configuration_query'
import GetAssignableOrganizationRolesQuery from '#modules/organizations/access/actions/query/get_assignable_organization_roles_query'

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

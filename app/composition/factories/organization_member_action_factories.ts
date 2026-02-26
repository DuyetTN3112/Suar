import GetAssignableOrganizationRolesQuery from '#modules/organizations/access/actions/query/get_assignable_organization_roles_query'
import type { OrganizationActionContext } from '#modules/organizations/members/actions/action_context'
import ApprovePendingOrganizationMemberCommand from '#modules/organizations/members/actions/command/approve_pending_organization_member_command'
import BulkAddMembersCommand from '#modules/organizations/members/actions/command/bulk_add_members_command'
import RemoveMemberCommand from '#modules/organizations/members/actions/command/remove_member_command'
import UpdateMemberRoleCommand from '#modules/organizations/members/actions/command/update_member_role_command'
import { OrganizationMemberAdministrationCommandFactory } from '#modules/organizations/members/actions/ports/inbound/organization_member_administration_command_factory'
import { OrganizationMemberApprovalCommandFactory } from '#modules/organizations/members/actions/ports/inbound/organization_member_approval_command_factory'
import { OrganizationMemberCandidateQueryFactory } from '#modules/organizations/members/actions/ports/inbound/organization_member_candidate_query_factory'
import { OrganizationMemberQueryFactory } from '#modules/organizations/members/actions/ports/inbound/organization_member_query_factory'
import { OrganizationMembershipCommandFactory } from '#modules/organizations/members/actions/ports/inbound/organization_membership_command_factory'
import type { OrganizationAdministrationRepository } from '#modules/organizations/members/actions/ports/outbound/organization_administration_repository'
import type { OrganizationEventPublisher } from '#modules/organizations/members/actions/ports/outbound/organization_event_publisher'
import type { OrganizationUserReaderWriter } from '#modules/organizations/members/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationMemberCandidateReader } from '#modules/organizations/members/actions/ports/outbound/organization_member_candidate_reader'
import type { OrganizationMemberProjectOffboarding } from '#modules/organizations/members/actions/ports/outbound/organization_member_project_offboarding'
import type { OrganizationMemberSearchCandidateReader } from '#modules/organizations/members/actions/ports/outbound/organization_member_search_candidate_reader'
import type { OrganizationNotificationStager } from '#modules/organizations/members/actions/ports/outbound/organization_notification_stager'
import type { OrganizationPendingMemberApprovalGateway } from '#modules/organizations/members/actions/ports/outbound/organization_pending_member_approval_gateway'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/members/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/members/actions/ports/outbound/organization_transaction'
import GetOrganizationMembersIndexPageQuery from '#modules/organizations/members/actions/query/get_organization_members_index_page_query'
import ListOrganizationMemberCandidatesQuery from '#modules/organizations/members/actions/query/list_organization_member_candidates_query'
import ListOrganizationMembersQuery from '#modules/organizations/members/actions/query/list_organization_members_query'

export class ComposedOrganizationMemberAdministrationCommandFactory extends OrganizationMemberAdministrationCommandFactory {
  constructor(
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly projectOffboarding: OrganizationMemberProjectOffboarding,
    private readonly transactions: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly events: OrganizationEventPublisher
  ) {
    super()
  }

  makeRemove(
    context: OrganizationActionContext,
    notificationStager: OrganizationNotificationStager = this.notificationStager,
    projectOffboarding: OrganizationMemberProjectOffboarding = this.projectOffboarding
  ): RemoveMemberCommand {
    return new RemoveMemberCommand(
      context,
      notificationStager,
      projectOffboarding,
      this.transactions,
      this.memberships,
      this.events
    )
  }

  makeUpdateRole(context: OrganizationActionContext): UpdateMemberRoleCommand {
    return new UpdateMemberRoleCommand(
      context,
      this.notificationStager,
      this.transactions,
      this.organizations,
      this.memberships,
      this.events
    )
  }
}

export class ComposedOrganizationMemberApprovalCommandFactory extends OrganizationMemberApprovalCommandFactory {
  constructor(private readonly approvalGateway: OrganizationPendingMemberApprovalGateway) {
    super()
  }

  make(context: OrganizationActionContext): ApprovePendingOrganizationMemberCommand {
    return new ApprovePendingOrganizationMemberCommand(context, this.approvalGateway)
  }
}

export class ComposedOrganizationMemberCandidateQueryFactory extends OrganizationMemberCandidateQueryFactory {
  constructor(private readonly candidates: OrganizationMemberCandidateReader) {
    super()
  }

  make(context: OrganizationActionContext): ListOrganizationMemberCandidatesQuery {
    return new ListOrganizationMemberCandidatesQuery(context, this.candidates)
  }
}

export class ComposedOrganizationMemberQueryFactory extends OrganizationMemberQueryFactory {
  constructor(
    private readonly administration: OrganizationAdministrationRepository,
    private readonly memberSearch: OrganizationMemberSearchCandidateReader,
    private readonly organizations: OrganizationReader
  ) {
    super()
  }

  makeListMembers(context: OrganizationActionContext): ListOrganizationMembersQuery {
    return new ListOrganizationMembersQuery(context, this.administration, this.memberSearch)
  }

  makeMembersIndexPage(context: OrganizationActionContext): GetOrganizationMembersIndexPageQuery {
    return new GetOrganizationMembersIndexPageQuery(
      this.makeListMembers(context),
      new GetAssignableOrganizationRolesQuery(context, this.organizations)
    )
  }
}

export class ComposedOrganizationMembershipCommandFactory extends OrganizationMembershipCommandFactory {
  constructor(
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly transactions: OrganizationTransactionRunner,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly events: OrganizationEventPublisher
  ) {
    super()
  }

  makeBulkAdd(context: OrganizationActionContext): BulkAddMembersCommand {
    return new BulkAddMembersCommand(
      context,
      this.notificationStager,
      this.userReaderWriter,
      this.transactions,
      this.memberships,
      this.events
    )
  }
}

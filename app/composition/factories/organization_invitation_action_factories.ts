import GetAssignableOrganizationRolesQuery from '#modules/organizations/access/actions/query/get_assignable_organization_roles_query'
import type { OrganizationCacheInvalidator } from '#modules/organizations/directory/actions/ports/outbound/organization_cache_invalidator'
import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import AcceptOrganizationInvitationCommand from '#modules/organizations/invitations/actions/command/accept_organization_invitation_command'
import InviteUserCommand from '#modules/organizations/invitations/actions/command/invite_user_command'
import ProcessJoinRequestCommand from '#modules/organizations/invitations/actions/command/process_join_request_command'
import RejectOrganizationInvitationCommand from '#modules/organizations/invitations/actions/command/reject_organization_invitation_command'
import RequestOrganizationJoinCommand from '#modules/organizations/invitations/actions/command/request_organization_join_command'
import { OrganizationInvitationCommandFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_invitation_command_factory'
import { OrganizationInvitationQueryFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_invitation_query_factory'
import { OrganizationJoinRequestCommandFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_join_request_command_factory'
import type { OrganizationAdministrationRepository } from '#modules/organizations/invitations/actions/ports/outbound/organization_administration_repository'
import type { OrganizationEventPublisher } from '#modules/organizations/invitations/actions/ports/outbound/organization_event_publisher'
import type { OrganizationUserReaderWriter } from '#modules/organizations/invitations/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/invitations/actions/ports/outbound/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/invitations/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/invitations/actions/ports/outbound/organization_transaction'
import GetInvitationsIndexPageQuery from '#modules/organizations/invitations/actions/query/get_invitations_index_page_query'
import ListInvitationsQuery from '#modules/organizations/invitations/actions/query/list_invitations_query'
import ListJoinRequestsQuery from '#modules/organizations/invitations/actions/query/list_join_requests_query'

export class ComposedOrganizationInvitationCommandFactory extends OrganizationInvitationCommandFactory {
  constructor(
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly users: OrganizationUserReaderWriter,
    private readonly transactions: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly events: OrganizationEventPublisher,
    private readonly cacheInvalidator: OrganizationCacheInvalidator
  ) {
    super()
  }

  makeInvite(context: OrganizationActionContext): InviteUserCommand {
    return new InviteUserCommand(
      context,
      this.notificationStager,
      this.users,
      this.transactions,
      this.organizations,
      this.memberships
    )
  }

  makeProcessJoinRequest(context: OrganizationActionContext): ProcessJoinRequestCommand {
    return new ProcessJoinRequestCommand(
      context,
      this.notificationStager,
      this.transactions,
      this.memberships,
      this.events,
      this.cacheInvalidator
    )
  }

  makeAccept(context: OrganizationActionContext): AcceptOrganizationInvitationCommand {
    return new AcceptOrganizationInvitationCommand(
      context,
      this.notificationStager,
      this.transactions,
      this.organizations,
      this.memberships,
      this.events
    )
  }

  makeReject(context: OrganizationActionContext): RejectOrganizationInvitationCommand {
    return new RejectOrganizationInvitationCommand(
      context,
      this.notificationStager,
      this.transactions,
      this.organizations,
      this.memberships,
      this.cacheInvalidator
    )
  }
}

export class ComposedOrganizationInvitationQueryFactory extends OrganizationInvitationQueryFactory {
  constructor(
    private readonly administration: OrganizationAdministrationRepository,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly organizations: OrganizationReader
  ) {
    super()
  }

  makeListInvitations(context: OrganizationActionContext): ListInvitationsQuery {
    return new ListInvitationsQuery(context, this.administration)
  }

  makeInvitationsIndexPage(context: OrganizationActionContext): GetInvitationsIndexPageQuery {
    return new GetInvitationsIndexPageQuery(
      this.makeListInvitations(context),
      new GetAssignableOrganizationRolesQuery(context, this.organizations)
    )
  }

  makeListJoinRequests(context: OrganizationActionContext): ListJoinRequestsQuery {
    return new ListJoinRequestsQuery(context, this.memberships)
  }
}

export class ComposedOrganizationJoinRequestCommandFactory extends OrganizationJoinRequestCommandFactory {
  constructor(
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly transactions: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {
    super()
  }

  makeRequestJoin(context: OrganizationActionContext): RequestOrganizationJoinCommand {
    return new RequestOrganizationJoinCommand(
      context,
      this.userReaderWriter,
      this.notificationStager,
      this.transactions,
      this.organizations,
      this.memberships
    )
  }
}

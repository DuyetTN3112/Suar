import { organizationMembershipRepository } from '#composition/organization_persistence_composition'
import type {
  UserInvitationReader,
  UserPendingInvitationPage,
} from '#modules/users/actions/ports/outbound/user_invitation_reader'

export class UserInvitationReaderAdapter implements UserInvitationReader {
  async findPendingByUser(
    userId: string,
    pagination: { page?: unknown; perPage?: unknown }
  ): Promise<UserPendingInvitationPage> {
    const page = await organizationMembershipRepository.findPendingInvitationsPageByUser(
      userId,
      pagination
    )

    return {
      data: page.data.map((invitation) => ({
        organizationId: invitation.organization_id,
        organizationName: invitation.organization.name,
        organizationLogo: invitation.organization.logo,
        organizationRole: invitation.org_role,
        invitedBy: {
          id: invitation.inviter.id,
          username: invitation.inviter.username,
          email: invitation.inviter.email,
          avatarUrl: invitation.inviter.avatar_url,
        },
        createdAt: invitation.created_at.toISOString(),
      })),
      meta: page.meta,
    }
  }
}

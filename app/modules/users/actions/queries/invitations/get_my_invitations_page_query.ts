import {
  toCanonicalPagePagination,
  type CanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserInvitationReader } from '#modules/users/actions/ports/outbound/user_invitation_reader'

export interface GetMyInvitationsPageInput {
  userId: string
  pagination: { page?: unknown; perPage?: unknown }
}

export interface MyInvitationPageResult {
  invitations: {
    organization_id: string
    organization_name: string | null
    organization_logo: string | null
    org_role: string
    invited_by: {
      id: string
      username: string
      email: string | null
      avatar_url: string | null
    } | null
    created_at: string | null
  }[]
  pagination: CanonicalPagePagination
}

export default class GetMyInvitationsPageQuery extends BaseQuery<
  GetMyInvitationsPageInput,
  MyInvitationPageResult
> {
  constructor(private readonly invitations: UserInvitationReader) {
    super()
  }

  override executeAndWrap(input: GetMyInvitationsPageInput): ReturnType<
    BaseQuery<GetMyInvitationsPageInput, MyInvitationPageResult>['executeAndWrap']
  >
  override executeAndWrap(
    userId: string,
    pagination: { page?: unknown; perPage?: unknown }
  ): ReturnType<BaseQuery<GetMyInvitationsPageInput, MyInvitationPageResult>['executeAndWrap']>
  override async executeAndWrap(
    inputOrUserId: GetMyInvitationsPageInput | string,
    pagination?: { page?: unknown; perPage?: unknown }
  ) {
    const input =
      typeof inputOrUserId === 'string'
        ? { userId: inputOrUserId, pagination: pagination ?? {} }
        : inputOrUserId
    return super.executeAndWrap(input)
  }

  override async handle(input: GetMyInvitationsPageInput): Promise<MyInvitationPageResult> {
    return this.execute(input.userId, input.pagination)
  }

  async execute(
    userId: string,
    pagination: { page?: unknown; perPage?: unknown }
  ): Promise<MyInvitationPageResult> {
    const page = await this.invitations.findPendingByUser(userId, pagination)

    return {
      invitations: page.data.map((invitation) => ({
        organization_id: invitation.organizationId,
        organization_name: invitation.organizationName,
        organization_logo: invitation.organizationLogo,
        org_role: invitation.organizationRole,
        invited_by: invitation.invitedBy
          ? {
              id: invitation.invitedBy.id,
              username: invitation.invitedBy.username,
              email: invitation.invitedBy.email,
              avatar_url: invitation.invitedBy.avatarUrl,
            }
          : null,
        created_at: invitation.createdAt,
      })),
      pagination: toCanonicalPagePagination(page.meta),
    }
  }
}

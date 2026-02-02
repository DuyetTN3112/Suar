import type { PaginationMeta } from '#modules/pagination/public_contracts/pagination_public_api'

export interface UserPendingInvitation {
  organizationId: string
  organizationName: string | null
  organizationLogo: string | null
  organizationRole: string
  invitedBy: {
    id: string
    username: string
    email: string | null
    avatarUrl: string | null
  } | null
  createdAt: string | null
}

export interface UserPendingInvitationPage {
  data: UserPendingInvitation[]
  meta: PaginationMeta
}

export interface UserInvitationReader {
  findPendingByUser(
    userId: string,
    pagination: { page?: unknown; perPage?: unknown }
  ): Promise<UserPendingInvitationPage>
}

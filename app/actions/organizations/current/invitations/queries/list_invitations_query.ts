import { BaseQuery } from '#actions/organizations/base_query'
import OrganizationInvitationRepository from '#infra/organizations/current/repositories/organization_invitation_repository'
import type { ExecutionContext } from '#types/execution_context'

/**
 * ListInvitationsQuery
 *
 * Query to list organization invitations with filtering and pagination.
 */

export interface ListInvitationsDTO {
  page?: number
  perPage?: number
  search?: string
  status?: string
}

export interface ListInvitationsResult {
  invitations: {
    id: string
    email: string
    org_role: string
    invited_by: {
      id: string
      username: string
    }
    status: 'pending' | 'accepted' | 'declined' | 'expired'
    invited_at: string
    expires_at: string
  }[]
  pagination: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
  filters: {
    search?: string
    status?: string
  }
}

export default class ListInvitationsQuery extends BaseQuery<
  ListInvitationsDTO,
  ListInvitationsResult
> {
  constructor(
    execCtx: ExecutionContext,
    private invitationRepo = new OrganizationInvitationRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ListInvitationsDTO): Promise<ListInvitationsResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const page = dto.page ?? 1
    const perPage = dto.perPage ?? 20

    // Fetch from repository
    const result = await this.invitationRepo.listInvitations(
      organizationId,
      {
        search: dto.search,
        status: dto.status,
      },
      page,
      perPage
    )

    const lastPage = Math.ceil(result.total / perPage)

    return {
      invitations: result.invitations,
      pagination: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage,
      },
      filters: {
        search: dto.search,
        status: dto.status,
      },
    }
  }
}

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { BaseQuery } from '#modules/organizations/actions/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import OrganizationInvitationRepository from '#modules/organizations/infra/current/repositories/organization_invitation_repository'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
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
    execCtx: OrganizationActionContext,
    private invitationRepo = new OrganizationInvitationRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ListInvitationsDTO): Promise<ListInvitationsResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    const pagination = normalizePagination(dto, ORGANIZATION_PAGINATION)

    // Fetch from repository
    const result = await this.invitationRepo.listInvitations(
      organizationId,
      omitUndefined({
        search: dto.search,
        status: dto.status,
      }),
      pagination.page,
      pagination.perPage
    )
    const meta = buildPaginationMeta(result.total, pagination)

    return {
      invitations: result.invitations,
      pagination: {
        total: meta.total,
        perPage: meta.perPage,
        currentPage: meta.currentPage,
        lastPage: meta.lastPage,
      },
      filters: omitUndefined({
        search: dto.search,
        status: dto.status,
      }),
    }
  }
}

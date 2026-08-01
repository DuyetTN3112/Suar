import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/invitations/actions/dtos/common/organization_pagination'
import type { OrganizationAdministrationRepository } from '#modules/organizations/invitations/actions/ports/outbound/organization_administration_repository'
import { BaseQuery } from '#modules/organizations/invitations/actions/query/base_query'
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
    private readonly invitationRepo: OrganizationAdministrationRepository
  ) {
    super(execCtx)
  }

  async handle(dto: ListInvitationsDTO): Promise<ListInvitationsResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
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

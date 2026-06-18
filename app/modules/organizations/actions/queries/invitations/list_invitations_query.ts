import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/actions/dtos/common/invitations/organization_pagination'
import type { OrganizationAdministrationRepository } from '#modules/organizations/actions/ports/outbound/invitations/organization_administration_repository'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'
import {
  buildPaginationMeta,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}

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

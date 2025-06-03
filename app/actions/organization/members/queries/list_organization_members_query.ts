import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import OrganizationMemberRepository from '#infra/organization/repositories/organization_member_repository'

/**
 * ListOrganizationMembersQuery (Organization Admin)
 *
 * Query to list all members of the current organization.
 * Uses repository (Infrastructure layer) for DB queries.
 */

export interface ListOrganizationMembersDTO {
  organizationId: string
  page?: number
  perPage?: number
  search?: string
  orgRole?: string
  status?: string
}

export interface ListOrganizationMembersResult {
  data: Array<{
    user_id: string
    username: string
    email: string | null
    org_role: string
    status: string
    invited_by: string | null
    created_at: string
  }>
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
  }
}

export default class ListOrganizationMembersQuery extends BaseQuery<
  ListOrganizationMembersDTO,
  ListOrganizationMembersResult
> {
  constructor(
    execCtx: ExecutionContext,
    private memberRepo = new OrganizationMemberRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: ListOrganizationMembersDTO): Promise<ListOrganizationMembersResult> {
    const page = dto.page || 1
    const perPage = dto.perPage || 50

    // Fetch from repository (Infrastructure layer)
    const result = await this.memberRepo.listMembers(
      dto.organizationId,
      {
        search: dto.search,
        orgRole: dto.orgRole,
        status: dto.status,
      },
      page,
      perPage
    )

    const lastPage = Math.ceil(result.total / perPage)

    return {
      data: result.members.map((member) => ({
        user_id: member.user_id,
        username: member.username,
        email: member.email,
        org_role: member.org_role,
        status: member.status,
        invited_by: member.invited_by,
        created_at: member.created_at.toISOString(),
      })),
      meta: {
        total: result.total,
        perPage,
        currentPage: page,
        lastPage,
      },
    }
  }
}

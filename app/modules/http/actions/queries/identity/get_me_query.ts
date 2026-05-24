import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { HttpOrganizationReader } from '#modules/http/actions/ports/outbound/http_organization_reader'

export interface GetMeQueryInput {
  user: {
    id: string
    email: string | null
    username: string
    avatarUrl: string | null
    systemRole: string
  }
  currentOrganizationId: string | null
}

export interface GetMeQueryResult {
  id: string
  email: string | null
  username: string
  avatar_url: string | null
  system_role: string
  current_organization_id: string | null
  current_organization_role: string | null
  organizations: {
    id: string
    name: string
    logo: string | null
    org_role: string | null
    status: string | null
  }[]
}

export default class GetMeQuery {
  constructor(private readonly organizations: HttpOrganizationReader) {}

  async executeAndWrap(input: GetMeQueryInput): Promise<Result<GetMeQueryResult, AppException>> {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute(input: GetMeQueryInput): Promise<GetMeQueryResult> {
    const memberships = await this.organizations.listApprovedMembershipSummaries(input.user.id)
    const currentMembership = input.currentOrganizationId
      ? memberships.find((membership) => membership.id === input.currentOrganizationId)
      : undefined

    return {
      id: input.user.id,
      email: input.user.email,
      username: input.user.username,
      avatar_url: input.user.avatarUrl,
      system_role: input.user.systemRole,
      current_organization_id: input.currentOrganizationId,
      current_organization_role: currentMembership?.orgRole ?? null,
      organizations: memberships.map((membership) => ({
        id: membership.id,
        name: membership.name,
        logo: membership.logo,
        org_role: membership.orgRole,
        status: membership.status,
      })),
    }
  }
}

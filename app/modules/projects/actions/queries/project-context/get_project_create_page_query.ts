import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import type {
  ProjectOrganizationReader,
  ProjectOrganizationUserOption,
  ProjectOwnedOrganizationOption,
} from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { PROJECT_STATUS_OPTIONS } from '#modules/projects/public_contracts/project_constants'

export interface GetProjectCreatePageResult {
  organizations: ProjectOwnedOrganizationOption[]
  organizationMembersByOrg: Record<string, ProjectOrganizationUserOption[]>
  statuses: { id: string; name: string; value: string; label: string }[]
}

export default class GetProjectCreatePageQuery extends BaseQuery<
  Record<string, never>,
  GetProjectCreatePageResult
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly organizations: ProjectOrganizationReader
  ) {
    super(execCtx)
  }

  override async handle(_input: Record<string, never>): Promise<GetProjectCreatePageResult> {
    return this.execute()
  }

  override async executeAndWrap(): Promise<Result<GetProjectCreatePageResult, AppException>> {
    try {
      return Result.ok(await this.execute())
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute(): Promise<GetProjectCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const organizations = await this.organizations.listOwnedOrganizations(userId)
    const organizationMemberEntries: Array<[string, ProjectOrganizationUserOption[]]> =
      await Promise.all(
      organizations.map(async (organization) => [
        organization.id,
        await this.organizations.listOrganizationUsers(organization.id, userId),
      ])
    )
    const organizationMembersByOrg: GetProjectCreatePageResult['organizationMembersByOrg'] =
      Object.fromEntries(organizationMemberEntries)

    return {
      organizations,
      organizationMembersByOrg,
      statuses: [...PROJECT_STATUS_OPTIONS],
    }
  }
}

import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import OrganizationSettingsRepository from '#infra/organization/repositories/organization_settings_repository'

/**
 * GetOrganizationSettingsQuery
 *
 * Query to get organization settings/details.
 */

export type GetOrganizationSettingsDTO = Record<string, never>

export interface GetOrganizationSettingsResult {
  organization: {
    id: string
    name: string
    description: string | null
    website: string | null
    email: string | null
  }
}

export default class GetOrganizationSettingsQuery extends BaseQuery<
  GetOrganizationSettingsDTO,
  GetOrganizationSettingsResult
> {
  constructor(
    execCtx: ExecutionContext,
    private settingsRepo = new OrganizationSettingsRepository()
  ) {
    super(execCtx)
  }

  async handle(_dto: GetOrganizationSettingsDTO): Promise<GetOrganizationSettingsResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    // Fetch from repository
    const organization = await this.settingsRepo.getOrganization(organizationId)

    if (!organization) {
      throw new Error('Organization not found')
    }

    return {
      organization,
    }
  }
}

import { BaseCommand } from '#actions/shared/base_command'
import type { ExecutionContext } from '#types/execution_context'
import OrganizationSettingsRepository from '#infra/organization/repositories/organization_settings_repository'

/**
 * UpdateOrganizationSettingsCommand
 *
 * Command to update organization settings.
 */

export interface UpdateOrganizationSettingsDTO {
  name?: string
  description?: string
  website?: string
  email?: string
}

export default class UpdateOrganizationSettingsCommand extends BaseCommand<UpdateOrganizationSettingsDTO> {
  constructor(
    execCtx: ExecutionContext,
    private settingsRepo = new OrganizationSettingsRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: UpdateOrganizationSettingsDTO): Promise<void> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    // Update via repository
    await this.settingsRepo.updateOrganization(organizationId, {
      name: dto.name,
      description: dto.description,
      website: dto.website,
    })
  }
}

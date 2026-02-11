import { skillApplication as skillPublicApi } from '#composition/skills_application_composition'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { ProjectRoleCatalogWriter } from '#modules/projects/actions/ports/outbound/project_role_catalog_writer'

export class SkillsProjectRoleCatalogWriterAdapter extends ProjectRoleCatalogWriter {
  async seedTemplate(
    projectId: string,
    templateCode: string,
    createdBy: string
  ): Promise<void> {
    const template = await skillPublicApi.findProfessionalRoleTemplateByCode(templateCode)
    if (!template?.is_active) {
      return
    }

    try {
      await skillPublicApi.cloneProfessionalRoleTemplateToProject(
        projectId,
        template.id,
        createdBy
      )
    } catch (error: unknown) {
      if (!(error instanceof ConflictException)) {
        throw error
      }
    }
  }

  async findProjectRoleIdByCode(projectId: string, code: string): Promise<string | null> {
    const role = await skillPublicApi.findProjectProfessionalRoleByCode(projectId, code)
    return role?.id ?? null
  }
}

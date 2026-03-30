export abstract class ProjectRoleCatalogWriter {
  abstract seedTemplate(
    projectId: string,
    templateCode: string,
    createdBy: string
  ): Promise<void>

  abstract findProjectRoleIdByCode(projectId: string, code: string): Promise<string | null>
}

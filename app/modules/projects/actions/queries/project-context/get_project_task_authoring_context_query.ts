import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import type { ProjectContextFactReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_fact_reader'
import type { WorkPackageCatalogReader } from '#modules/projects/actions/ports/outbound/work_package_catalog_reader'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { mapProjectTaskAuthoringContext } from '#modules/projects/domain/project-context/task_authoring_context_projection'
import type { ProjectTaskAuthoringContextV1 } from '#modules/projects/public_contracts/project-context/task_authoring_context'

export interface GetProjectTaskAuthoringContextInput {
  projectId: string
  organizationId: string
}

export interface ProjectTaskAuthoringAccessChecker {
  handle(input: {
    projectId: string
    userId: string
    organizationId: string
  }): Promise<void>
}

export default class GetProjectTaskAuthoringContextQuery extends BaseQuery<
  GetProjectTaskAuthoringContextInput,
  ProjectTaskAuthoringContextV1
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly projectAccess: ProjectTaskAuthoringAccessChecker,
    private readonly projectContextFacts: ProjectContextFactReader,
    private readonly workPackageCatalog: WorkPackageCatalogReader
  ) {
    super(execCtx)
  }

  async handle(input: GetProjectTaskAuthoringContextInput): Promise<ProjectTaskAuthoringContextV1> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new UnauthorizedException()
    }
    if (this.getCurrentOrganizationId() && this.getCurrentOrganizationId() !== input.organizationId) {
      throw NotFoundException.project(input.projectId)
    }

    await this.projectAccess.handle({
      projectId: input.projectId,
      userId,
      organizationId: input.organizationId,
    })

    const projectContext = await this.projectContextFacts.readProjectContextFact(input)
    if (!projectContext) {
      throw NotFoundException.project(input.projectId)
    }

    const workPackages = await this.workPackageCatalog.listActiveWorkPackageFacts(input)
    return mapProjectTaskAuthoringContext(projectContext, workPackages)
  }
}

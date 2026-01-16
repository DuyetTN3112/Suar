import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type {
  ProjectSwitchTarget,
  ProjectSwitchTargetReader,
} from '#modules/projects/actions/ports/outbound/project_switch_target_reader'

export interface GetProjectSwitchTargetInput {
  projectId: string
  organizationId: string
}

export function rethrowProjectSwitchValidationError(error: unknown): never {
  if (error instanceof NotFoundException || error instanceof BusinessLogicException) {
    throw new BusinessLogicException('Dự án không thuộc tổ chức hiện tại')
  }

  throw error
}

/**
 * Resolves and validates the target before the HTTP layer mutates session
 * state for the externally driven project-switch intent.
 */
export default class GetProjectSwitchTargetQuery {
  constructor(private readonly targets: ProjectSwitchTargetReader) {}

  async handle(input: GetProjectSwitchTargetInput): Promise<ProjectSwitchTarget> {
    try {
      const project = await this.targets.find(input.projectId)
      if (project.organizationId !== input.organizationId) {
        throw new BusinessLogicException('Project and task must belong to the same organization')
      }
      return project
    } catch (error: unknown) {
      rethrowProjectSwitchValidationError(error)
    }
  }
}

import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { AddProjectMemberDTO } from '#modules/projects/actions/dtos/request/add_project_member_dto'
import type { CreateProjectDTO } from '#modules/projects/actions/dtos/request/create_project_dto'
import { UpdateProjectMemberDTO } from '#modules/projects/actions/dtos/request/update_project_member_dto'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectRoleCatalogWriter } from '#modules/projects/actions/ports/outbound/project_role_catalog_writer'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { ProjectDetailRecord } from '#modules/projects/types/project_records'

export interface InitialProjectStaffingAssignment {
  userId: string
  templateCode: string
}

export interface CreateProjectWithStaffingInput {
  project: CreateProjectDTO
  seedRoleTemplates: string[]
  initialStaffingAssignments: InitialProjectStaffingAssignment[]
}

interface CreateProjectUseCase {
  handle(input: CreateProjectDTO): Promise<ProjectDetailRecord>
}

interface AddProjectMemberUseCase {
  handle(input: AddProjectMemberDTO): Promise<void>
}

interface UpdateProjectMemberUseCase {
  handle(input: UpdateProjectMemberDTO): Promise<void>
}

/**
 * Orchestrates the complete "create project with staffing" user intent.
 *
 * The HTTP controller only maps transport data and renders the outcome; all
 * stateful sequencing stays in this command.
 */
export default class CreateProjectWithStaffingCommand {
  constructor(
    private readonly context: ProjectActionContext,
    private readonly createProject: CreateProjectUseCase,
    private readonly addMember: AddProjectMemberUseCase,
    private readonly updateMember: UpdateProjectMemberUseCase,
    private readonly roleCatalog: Pick<
      ProjectRoleCatalogWriter,
      'seedTemplate' | 'findProjectRoleIdByCode'
    >,
    private readonly memberships: Pick<ProjectMembershipRepository, 'findMember'>
  ) {}

  async handle(input: CreateProjectWithStaffingInput): Promise<ProjectDetailRecord> {
    const project = await this.createProject.handle(input.project)
    const actorUserId = this.context.userId
    if (!actorUserId) {
      return project
    }

    const templateCodesToSeed = [
      ...new Set([
        ...input.seedRoleTemplates,
        ...input.initialStaffingAssignments.map((assignment) => assignment.templateCode),
      ]),
    ]

    for (const templateCode of templateCodesToSeed) {
      await this.roleCatalog.seedTemplate(project.id, templateCode, actorUserId)
    }

    for (const assignment of input.initialStaffingAssignments) {
      const projectRoleId = await this.roleCatalog.findProjectRoleIdByCode(
        project.id,
        assignment.templateCode
      )
      if (!projectRoleId) continue

      const existingMember = await this.memberships.findMember(project.id, assignment.userId)
      if (existingMember) {
        await this.updateMember.handle(
          new UpdateProjectMemberDTO({
            project_id: project.id,
            user_id: assignment.userId,
            project_role: existingMember.projectRole,
            project_professional_role_id: projectRoleId,
          })
        )
        continue
      }

      await this.addMember.handle(
        new AddProjectMemberDTO({
          project_id: project.id,
          user_id: assignment.userId,
          project_role: ProjectRole.MEMBER,
          project_professional_role_id: projectRoleId,
        })
      )
    }

    return project
  }

  async executeAndWrap(input: CreateProjectWithStaffingInput): Promise<Result<ProjectDetailRecord, AppException>> {
    try {
      return Result.ok(await this.handle(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}

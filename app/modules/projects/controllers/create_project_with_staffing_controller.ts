import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateProjectDTO } from './mappers/request/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import AddProjectMemberCommand from '#modules/projects/actions/commands/add_project_member_command'
import CreateProjectCommand from '#modules/projects/actions/commands/create_project_command'
import UpdateProjectMemberCommand from '#modules/projects/actions/commands/update_project_member_command'
import { AddProjectMemberDTO } from '#modules/projects/actions/dtos/request/add_project_member_dto'
import { UpdateProjectMemberDTO } from '#modules/projects/actions/dtos/request/update_project_member_dto'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'

interface InitialStaffingAssignment {
  userId: string
  templateCode: string
}

function parseInitialStaffingAssignments(input: unknown): InitialStaffingAssignment[] {
  if (!Array.isArray(input)) return []

  const assignments: InitialStaffingAssignment[] = []
  const seenUserIds = new Set<string>()

  for (const item of input) {
    if (!item || typeof item !== 'object') continue

    const userId =
      typeof (item as { userId?: unknown }).userId === 'string'
        ? (item as { userId: string }).userId.trim()
        : ''
    const templateCode =
      typeof (item as { templateCode?: unknown }).templateCode === 'string'
        ? (item as { templateCode: string }).templateCode.trim()
        : ''

    if (!userId || !templateCode || seenUserIds.has(userId)) continue

    seenUserIds.add(userId)
    assignments.push({ userId, templateCode })
  }

  return assignments
}

/**
 * POST /projects -> Create project, seed role templates, and assign initial staffing.
 */
export default class CreateProjectWithStaffingController {
  async handle(ctx: HttpContext) {
    const { auth, request, response, session } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = (request.input('organizationId') ?? request.input('organization_id')) as string
    const afterCreateFocus = request.input('afterCreateFocus') as string | undefined
    const seedRoleTemplatesInput = request.input('seedRoleTemplates') as unknown
    const initialStaffingAssignmentsInput = request.input('initialStaffingAssignments') as unknown
    const dto = buildCreateProjectDTO(request, organizationId)
    const command = new CreateProjectCommand(execCtx)
    const project = await command.handle(dto)
    const seedRoleTemplates = Array.isArray(seedRoleTemplatesInput)
      ? seedRoleTemplatesInput.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : []
    const initialStaffingAssignments = parseInitialStaffingAssignments(initialStaffingAssignmentsInput)
    const templateCodesToSeed = [...new Set([
      ...seedRoleTemplates,
      ...initialStaffingAssignments.map((assignment) => assignment.templateCode),
    ])]

    if (templateCodesToSeed.length > 0 && auth.user?.id) {
      for (const templateCode of templateCodesToSeed) {
        const template = await skillPublicApi.findProfessionalRoleTemplateByCode(templateCode)
        if (!template?.is_active) continue

        try {
          await skillPublicApi.cloneProfessionalRoleTemplateToProject(
            project.id,
            template.id,
            auth.user.id
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : ''
          if (!message.includes('already exists')) {
            throw error
          }
        }
      }
    }

    if (initialStaffingAssignments.length > 0 && auth.user?.id) {
      const addProjectMemberCommand = new AddProjectMemberCommand(execCtx)
      const updateProjectMemberCommand = new UpdateProjectMemberCommand(execCtx)

      for (const assignment of initialStaffingAssignments) {
        const projectRole = await skillPublicApi.findProjectProfessionalRoleByCode(
          project.id,
          assignment.templateCode
        )
        if (!projectRole) continue

        const existingMember = await projectPublicApi.getMembershipContext(project.id, assignment.userId)

        if (existingMember) {
          await updateProjectMemberCommand.handle(
            new UpdateProjectMemberDTO({
              project_id: project.id,
              user_id: assignment.userId,
              project_role: existingMember.project_role,
              project_professional_role_id: projectRole.id,
            })
          )
          continue
        }

        await addProjectMemberCommand.handle(
          new AddProjectMemberDTO({
            project_id: project.id,
            user_id: assignment.userId,
            project_role: ProjectRole.MEMBER,
            project_professional_role_id: projectRole.id,
          })
        )
      }
    }

    session.flash('success', 'Dự án đã được tạo thành công')
    const focusQuery =
      afterCreateFocus === 'members' || afterCreateFocus === 'roles' || afterCreateFocus === 'tasks'
        ? `?focus=${afterCreateFocus}`
        : ''
    response.redirect(`/projects/${project.id}${focusQuery}`)
  }
}

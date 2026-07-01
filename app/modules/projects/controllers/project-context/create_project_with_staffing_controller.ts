import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildCreateProjectDTO } from '../mappers/request/project-context/project_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'

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
@inject()
export default class CreateProjectWithStaffingController {
  constructor(private readonly lifecycleCommands: ProjectLifecycleCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = (request.input('organizationId') ??
      request.input('organization_id')) as string
    const afterCreateFocus = request.input('afterCreateFocus') as string | undefined
    const seedRoleTemplatesInput = request.input('seedRoleTemplates') as unknown
    const initialStaffingAssignmentsInput = request.input('initialStaffingAssignments') as unknown
    const dto = buildCreateProjectDTO(request, organizationId)
    const seedRoleTemplates = Array.isArray(seedRoleTemplatesInput)
      ? seedRoleTemplatesInput.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0
        )
      : []
    const initialStaffingAssignments = parseInitialStaffingAssignments(
      initialStaffingAssignmentsInput
    )
    const project = await this.lifecycleCommands
      .makeCreateWithStaffing(execCtx)
      .executeAndWrap({ project: dto, seedRoleTemplates, initialStaffingAssignments })
      .then((outcome) => outcome.getValue())

    session.flash('success', 'Dự án đã được tạo thành công')
    const focusQuery =
      afterCreateFocus === 'members' || afterCreateFocus === 'roles' || afterCreateFocus === 'tasks'
        ? `?focus=${afterCreateFocus}`
        : ''
    response.redirect(`/projects/${project.id}${focusQuery}`)
  }
}

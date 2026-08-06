import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { readAliasedInput } from '#modules/http/boundary/aliased_input'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import {
  throwHttpBoundaryError,
  throwHttpValidationError,
} from '#modules/http/boundary/http_boundary_errors'
import AddTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/add_task_requirement_command'
import { buildRequiredTaskRouteRequest } from '#modules/tasks/controllers/mappers/request/task-requirements/task_requirement_route_request_mapper'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


const addRequirementSchema = vine.create({
  skillId: vine.string().uuid(),
  projectSkillId: vine.string().uuid(),
  sourceProjectProfessionalRoleId: vine.string().uuid().optional().nullable(),
  minimumLevelId: vine.string().uuid(),
  rubricVersionId: vine.string().uuid().optional().nullable(),
  isMandatory: vine.boolean().optional(),
  importance: vine.enum(['low', 'medium', 'high', 'critical']).optional(),
  weight: vine.number().min(0).optional(),
  requirementNotes: vine.string().maxLength(1000).optional().nullable(),
})

type AddRequirementPayload = Awaited<ReturnType<typeof addRequirementSchema.validate>>

@inject()
export default class AddTaskRequirementController {
  constructor(private readonly addTaskRequirement: AddTaskRequirementCommand) {}

  async handle({ params, request, response }: HttpContext) {
    const { taskId } = buildRequiredTaskRouteRequest(params)

    let payload: AddRequirementPayload
    try {
      payload = await addRequirementSchema.validate({
        skillId: readAliasedInput(request, 'skillId', 'skill_id'),
        projectSkillId: readAliasedInput(request, 'projectSkillId', 'project_skill_id'),
        sourceProjectProfessionalRoleId: readAliasedInput(
          request,
          'sourceProjectProfessionalRoleId',
          'source_project_professional_role_id'
        ),
        minimumLevelId: readAliasedInput(request, 'minimumLevelId', 'minimum_level_id'),
        rubricVersionId: readAliasedInput(request, 'rubricVersionId', 'rubric_version_id'),
        isMandatory: readAliasedInput(request, 'isMandatory', 'is_mandatory'),
        importance: readAliasedInput(request, 'importance', 'importance'),
        weight: readAliasedInput(request, 'weight', 'weight'),
        requirementNotes: readAliasedInput(request, 'requirementNotes', 'requirement_notes'),
      })
    } catch (err) {
      throwHttpValidationError(err)
    }

    try {
      const requirement = await this.addTaskRequirement
        .executeAndWrap(
          omitUndefined({
            taskId,
            skillId: payload.skillId,
            projectSkillId: payload.projectSkillId,
            sourceProjectProfessionalRoleId: payload.sourceProjectProfessionalRoleId,
            minimumLevelId: payload.minimumLevelId,
            rubricVersionId: payload.rubricVersionId,
            isMandatory: payload.isMandatory,
            importance: payload.importance,
            weight: payload.weight,
            requirementNotes: payload.requirementNotes,
            requirementSource: 'manual' as const,
          })
        )
        .then((result) => result.getValue())

      response.created({ data: camelizeResponseValue(requirement) })
      return
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}

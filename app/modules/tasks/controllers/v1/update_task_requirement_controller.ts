import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { readAliasedInput } from '#modules/http/boundary/aliased_input'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import {
  throwHttpBoundaryError,
  throwHttpValidationError,
} from '#modules/http/boundary/http_boundary_errors'
import UpdateTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/update_task_requirement_command'
import { buildRequiredTaskRequirementRouteRequest } from '#modules/tasks/controllers/mappers/request/task-requirements/task_requirement_route_request_mapper'

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


const updateRequirementSchema = vine.create({
  minimumLevelId: vine.string().uuid().optional().nullable(),
  rubricVersionId: vine.string().uuid().optional().nullable(),
  isMandatory: vine.boolean().optional(),
  importance: vine.enum(['low', 'medium', 'high', 'critical']).optional(),
  weight: vine.number().min(0).optional(),
  requirementNotes: vine.string().maxLength(1000).optional().nullable(),
})

type UpdateRequirementPayload = Awaited<ReturnType<typeof updateRequirementSchema.validate>>

@inject()
export default class UpdateTaskRequirementController {
  constructor(private readonly updateTaskRequirement: UpdateTaskRequirementCommand) {}

  async handle({ params, request }: HttpContext) {
    const { requirementId } = buildRequiredTaskRequirementRouteRequest(params)

    let payload: UpdateRequirementPayload
    try {
      payload = await updateRequirementSchema.validate({
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
      const updated = await this.updateTaskRequirement
        .executeAndWrap(
          omitUndefined({
            requirementId,
            minimumLevelId: payload.minimumLevelId,
            rubricVersionId: payload.rubricVersionId,
            isMandatory: payload.isMandatory,
            importance: payload.importance,
            weight: payload.weight,
            requirementNotes: payload.requirementNotes,
          })
        )
        .then((result) => result.getValue())

      return { data: camelizeResponseValue(updated) }
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}

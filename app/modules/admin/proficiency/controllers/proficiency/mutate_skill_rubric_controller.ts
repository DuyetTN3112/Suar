import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminProficiencyActionFactory } from '#modules/admin/proficiency/actions/ports/inbound/proficiency/admin_proficiency_action_factory'
import {
  buildCreateSkillRubricDraftRequest,
  buildPublishSkillRubricRequest,
  buildUpsertSkillRubricLevelRequest,
} from '#modules/admin/proficiency/controllers/mappers/request/proficiency/mutate_skill_rubric_request_mapper'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import { throwHttpBoundaryError } from '#modules/http/boundary/http_boundary_errors'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

@inject()
export default class MutateSkillRubricController {
  constructor(private readonly actions: AdminProficiencyActionFactory) {}

  async createDraft(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const requestDto = await buildCreateSkillRubricDraftRequest(params, request.all())

    try {
      const draft = await this.actions
        .makeCreateSkillRubricDraftCommand(actionContextFromHttp(ctx))
        .handle({
          skillId: requestDto.skillId,
          ...(auth.user?.id ? { actorId: auth.user.id } : {}),
          ...(requestDto.changeSummary ? { changeSummary: requestDto.changeSummary } : {}),
        })

      return response.status(201).json({ data: camelizeResponseValue(draft) })
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }

  async upsertLevel(ctx: HttpContext) {
    const { params, request, response } = ctx
    const requestDto = await buildUpsertSkillRubricLevelRequest(params, request.all())

    try {
      const level = await this.actions
        .makeUpsertSkillRubricLevelCommand(actionContextFromHttp(ctx))
        .handle({
          versionId: requestDto.versionId,
          levelId: requestDto.levelId,
          payload: requestDto.payload,
        })

      return response.status(200).json({ data: camelizeResponseValue(level) })
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }

  async publish(ctx: HttpContext) {
    const { params, response } = ctx
    const requestDto = buildPublishSkillRubricRequest(params)
    try {
      const version = await this.actions
        .makePublishSkillRubricVersionCommand(actionContextFromHttp(ctx))
        .handle({ versionId: requestDto.versionId })

      return response.status(200).json({ data: camelizeResponseValue(version) })
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}


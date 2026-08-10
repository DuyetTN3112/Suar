import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  buildAddTaskSubmissionEvidenceRequest,
  buildDeleteTaskSubmissionEvidenceRequest,
  buildListTaskSubmissionEvidenceRequest,
} from '../mappers/request/task-submissions/task_submission_evidence_request_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'

@inject()
export default class TaskSubmissionEvidenceController {
  constructor(private readonly applications: TaskCompletionApplicationFactory) {}

  async index(ctx: HttpContext) {
    const request = buildListTaskSubmissionEvidenceRequest(ctx.params)
    const evidences = await this.applications
      .makeListEvidences(actionContextFromHttp(ctx))
      .executeAndWrap(request)
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.OK).json(wrapApiV1Data(camelizeResponseValue(evidences)))
  }

  async store(ctx: HttpContext) {
    const body = ctx.request.only(['evidenceType', 'evidence_type', 'url', 'title', 'description'])
    const evidence = await this.applications
      .makeAddEvidence(actionContextFromHttp(ctx))
      .executeAndWrap(buildAddTaskSubmissionEvidenceRequest(ctx.params, body))
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED).json(wrapApiV1Data(camelizeResponseValue(evidence)))
  }

  async destroy(ctx: HttpContext) {
    await this.applications
      .makeDeleteEvidence(actionContextFromHttp(ctx))
      .executeAndWrap(buildDeleteTaskSubmissionEvidenceRequest(ctx.params))
      .then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.NO_CONTENT)
  }
}

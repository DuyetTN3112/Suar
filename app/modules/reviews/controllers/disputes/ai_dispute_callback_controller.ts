import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeActionItemAliases(record: JsonRecord): JsonRecord {
  const normalized = { ...record }
  if (normalized['action_items'] === undefined && normalized['actionItems'] !== undefined) {
    normalized['action_items'] = normalized['actionItems']
  }
  if (normalized['actionItems'] === undefined && normalized['action_items'] !== undefined) {
    normalized['actionItems'] = normalized['action_items']
  }
  return normalized
}

function normalizeResponsePayload(value: unknown): JsonRecord | undefined {
  if (!isRecord(value)) return undefined
  const normalized = normalizeActionItemAliases(value)
  for (const key of ['verdict', 'result', 'ai_target']) {
    if (isRecord(normalized[key])) {
      normalized[key] = normalizeActionItemAliases(normalized[key])
    }
  }
  return normalized
}

@inject()
export default class AiDisputeCallbackController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle({ request }: HttpContext) {
    // Callback received — payload logged at command level with sanitized fields only
    const timestamp = Number(
      request.header('X-Timestamp') ??
        request.header('X-AI-Timestamp') ??
        request.input('timestamp') ??
        0
    )
    const signature = String(
      request.header('X-Signature') ??
        request.header('X-AI-Signature') ??
        request.input('signature') ??
        ''
    )

    const command = this.actions.makeProcessAiDisputeCallbackCommand()
    const recommendation = request.input('recommendation') as string | undefined
    const confidenceScore =
      request.input('confidenceScore') !== undefined
        ? Number(request.input('confidenceScore'))
        : request.input('confidence_score') !== undefined
          ? Number(request.input('confidence_score'))
          : undefined
    const summary = request.input('summary') as string | undefined
    const responsePayloadInput: unknown =
      request.input('responsePayload') ?? request.input('response_payload')
    const responsePayload = normalizeResponsePayload(responsePayloadInput)
    const errorMessageInput: unknown =
      request.input('errorMessage') ?? request.input('error_message')
    const errorMessage = errorMessageInput as string | undefined
    const evaluationId =
      (request.input('evaluationId') as string | undefined) ??
      (request.input('evaluation_id') as string | undefined) ??
      (request.input('disputeId') as string | undefined)
    const reviewDisputeId =
      (request.input('reviewDisputeId') as string | undefined) ??
      (request.input('review_dispute_id') as string | undefined)
    const caseFileId =
      (request.input('caseFileId') as string | undefined) ??
      (request.input('case_file_id') as string | undefined)
    const sourceId =
      (request.input('sourceId') as string | undefined) ??
      (request.input('source_id') as string | undefined) ??
      (request.input('sprintReviewDisputeId') as string | undefined) ??
      (request.input('sprint_review_dispute_id') as string | undefined) ??
      (request.input('sprintReverseReviewWorkflowId') as string | undefined) ??
      (request.input('sprint_reverse_review_workflow_id') as string | undefined) ??
      (request.input('taskReviewWorkflowId') as string | undefined) ??
      (request.input('task_review_workflow_id') as string | undefined)
    const result = await command
      .executeAndWrap({
        evaluation_id: evaluationId as string,
        ...(reviewDisputeId !== undefined ? { review_dispute_id: reviewDisputeId } : {}),
        ...(caseFileId !== undefined ? { case_file_id: caseFileId } : {}),
        ...(sourceId !== undefined ? { source_id: sourceId } : {}),
        status: request.input('status') as 'completed' | 'failed',
        timestamp,
        signature,
        ...(recommendation !== undefined ? { recommendation } : {}),
        ...(confidenceScore !== undefined ? { confidence_score: confidenceScore } : {}),
        ...(summary !== undefined ? { summary } : {}),
        ...(responsePayload !== undefined ? { response_payload: responsePayload } : {}),
        ...(errorMessage !== undefined ? { error_message: errorMessage } : {}),
      })
      .then((outcome) => outcome.getValue())

    return {
      data: {
        id: result.id,
        disputeId: result.dispute_id,
        status: result.status,
      },
    }
  }
}

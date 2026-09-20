import { router } from '@inertiajs/svelte'
import axios from 'axios'

import type { ReviewActionErrors } from './task_review_helpers.js'
import type { DetailUserMessage } from './task_review_types.js'

export interface MutationDispatchOptions {
  onError: (errorMsg: string) => void
  extractActionError: (errors: ReviewActionErrors) => string
  onSuccess?: () => void
}

export function buildMutationOptions(options: MutationDispatchOptions) {
  return {
    preserveScroll: true,
    preserveState: true,
    onError: (errors: ReviewActionErrors) => {
      options.onError(options.extractActionError(errors))
    },
    ...(options.onSuccess ? { onSuccess: options.onSuccess } : {}),
  }
}

export interface ReviewSubmitParams {
  taskId: string
  projectId?: string | null
  taskDetailUrl?: string
  body: string
}

export function submitReviewAction(
  params: ReviewSubmitParams,
  options: MutationDispatchOptions
): void {
  router.post(
    `/task-reviews/tasks/${params.taskId}/reviews`,
    {
      body: params.body.trim(),
      project_id: params.projectId ?? '',
      redirect_to: params.taskDetailUrl,
    },
    buildMutationOptions(options)
  )
}

export interface WorkflowActionContext {
  workflowId: string
  taskId: string
  projectId?: string
  taskDetailUrl?: string
}

export function decideReviewAction(
  ctx: WorkflowActionContext,
  reviewMessageId: string,
  decision: 'accepted' | 'rejected',
  options: MutationDispatchOptions
): void {
  if (!ctx.workflowId) return
  router.post(
    `/task-reviews/${ctx.workflowId}/accept`,
    {
      review_message_id: reviewMessageId,
      decision,
      project_id: ctx.projectId ?? '',
      task_id: ctx.taskId,
      redirect_to: ctx.taskDetailUrl,
    },
    buildMutationOptions(options)
  )
}

export function respondReviewAction(
  ctx: WorkflowActionContext,
  reviewMessageId: string,
  body: string,
  options: MutationDispatchOptions
): void {
  if (!ctx.workflowId || body.trim().length === 0) return
  router.post(
    `/task-reviews/${ctx.workflowId}/respond`,
    {
      body: body.trim(),
      review_message_id: reviewMessageId,
      project_id: ctx.projectId ?? '',
      task_id: ctx.taskId,
      redirect_to: ctx.taskDetailUrl,
    },
    buildMutationOptions(options)
  )
}

export function openDisputeAction(
  ctx: WorkflowActionContext,
  reviewMessageId: string,
  responseMessageId: string | undefined,
  options: MutationDispatchOptions
): void {
  if (!ctx.workflowId) return
  router.post(
    `/task-reviews/${ctx.workflowId}/open-dispute`,
    {
      review_message_id: reviewMessageId,
      response_message_id: responseMessageId ?? '',
      project_id: ctx.projectId ?? '',
      task_id: ctx.taskId,
      redirect_to: ctx.taskDetailUrl,
    },
    buildMutationOptions(options)
  )
}

export function updateResponseAction(
  ctx: WorkflowActionContext,
  message: DetailUserMessage,
  body: string,
  options: MutationDispatchOptions
): void {
  if (!ctx.workflowId || body.trim().length === 0) return
  router.post(
    `/task-reviews/${ctx.workflowId}/respond`,
    {
      body: body.trim(),
      review_message_id: message.parent_review_message_id ?? '',
      response_message_id: message.id,
      project_id: ctx.projectId ?? '',
      task_id: ctx.taskId,
      redirect_to: ctx.taskDetailUrl,
    },
    buildMutationOptions(options)
  )
}

export function withdrawMessageAction(
  ctx: WorkflowActionContext,
  message: DetailUserMessage,
  options: MutationDispatchOptions
): void {
  if (!ctx.workflowId) return
  router.post(
    `/task-reviews/${ctx.workflowId}/respond`,
    {
      withdraw_message_id: message.id,
      project_id: ctx.projectId ?? '',
      task_id: ctx.taskId,
      redirect_to: ctx.taskDetailUrl,
    },
    buildMutationOptions(options)
  )
}

export interface DisputeReportPayload {
  disputeType: string
  claim: string
  evidence: string
  requestedOutcome: string
}

export function reportDisputeAction(
  ctx: WorkflowActionContext,
  reviewMessageId: string,
  payload: DisputeReportPayload,
  options: MutationDispatchOptions
): void {
  if (!ctx.workflowId || payload.claim.trim().length < 10 || payload.evidence.trim().length < 10) return
  router.post(
    `/task-reviews/${ctx.workflowId}/report`,
    {
      dispute_type: payload.disputeType,
      claim: payload.claim.trim(),
      evidence: payload.evidence.trim(),
      requested_outcome: payload.requestedOutcome,
      review_message_id: reviewMessageId,
      project_id: ctx.projectId ?? '',
      task_id: ctx.taskId,
      redirect_to: ctx.taskDetailUrl,
    },
    buildMutationOptions(options)
  )
}

export async function finalizeWorkflowAction(
  workflowId: string,
  options: {
    extractActionError: (errors: ReviewActionErrors) => string
    defaultErrorMessage: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await axios.post(`/api/v1/me/organizations/current/reviews/tasks/${workflowId}/finalize`, {})
    router.reload({ only: ['board', 'detail', 'flash'] })
    return { success: true }
  } catch (error: unknown) {
    const payload = axios.isAxiosError<ReviewActionErrors>(error) ? error.response?.data : null
    const errorMsg = options.extractActionError(
      payload && typeof payload === 'object'
        ? (payload)
        : { message: options.defaultErrorMessage }
    )
    return { success: false, error: errorMsg }
  }
}

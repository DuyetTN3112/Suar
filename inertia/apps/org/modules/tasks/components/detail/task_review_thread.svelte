<script lang="ts">
  import { AlertTriangle, CheckCircle2, MessageSquareText } from 'lucide-svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import {
    reviewMessageAuthorLabel,
    reviewMessageBodyLabel,
    reviewMessageTypeLabel,
  } from './task_review_helpers.js'
  import type { DetailUserMessage } from './task_review_types.js'

  interface Props {
    reviewMessages: DetailUserMessage[]
    allReviewMessages: DetailUserMessage[]
    currentUserId: string | null
    workflowStatus: string
    isReviewee: boolean
    canEditSubmittedReview: boolean
    formatDate: (value: unknown) => string
    onBeginEditReview: () => void
    onWithdrawMessage: (message: DetailUserMessage) => void
    onDecideReview: (reviewMessageId: string, decision: 'accepted' | 'rejected') => void
    onRespondReview: (reviewMessageId: string, body: string) => void
    onUpdateResponse: (message: DetailUserMessage, body: string) => void
    onReportDispute: (
      reviewMessageId: string,
      payload: {
        disputeType: string
        claim: string
        evidence: string
        requestedOutcome: string
      }
    ) => void
  }

  let {
    reviewMessages,
    allReviewMessages,
    currentUserId,
    workflowStatus,
    isReviewee,
    canEditSubmittedReview,
    formatDate,
    onBeginEditReview,
    onWithdrawMessage,
    onDecideReview,
    onRespondReview,
    onUpdateResponse,
    onReportDispute,
  }: Props = $props()

  const { t } = useTranslation()

  let activeResponseReviewId = $state<string | null>(null)
  let editingResponseMessageId = $state<string | null>(null)
  let activeReportReviewId = $state<string | null>(null)
  let responseBody = $state('')
  let disputeType = $state('review_fairness')
  let disputeClaim = $state('')
  let disputeEvidence = $state('')
  let requestedOutcome = $state('reviewer_re_review')

  const hasResponse = (reviewMessageId: string) =>
    allReviewMessages.some(
      (message) =>
        message.message_type === 'reviewee_response' &&
        message.parent_review_message_id === reviewMessageId
    )

  const canRespondTo = (message: DetailUserMessage) =>
    Boolean(
      (isReviewee && workflowStatus === 'awaiting_response' && !hasResponse(message.id)) ||
        (workflowStatus === 'disputed' &&
          message.reviewee_decision === 'rejected' &&
          (isReviewee || (message.author_id === currentUserId && !message.reviewer_agreed_at)))
    )

  const isDisputeDiscussion = (message: DetailUserMessage) =>
    Boolean(workflowStatus === 'disputed' && message.reviewee_decision === 'rejected')

  const canReviewerConfirm = (message: DetailUserMessage) =>
    Boolean(
      message.requires_reviewer_confirmation &&
        !message.reviewer_agreed_at &&
        message.author_id === currentUserId
    )

  const canDecide = (message: DetailUserMessage) =>
    Boolean(
      isReviewee &&
        ['awaiting_response', 'disputed'].includes(workflowStatus) &&
        hasResponse(message.id) &&
        message.reviewee_decision !== 'accepted'
    )

  const canReportFor = (message: DetailUserMessage) =>
    Boolean(
      ['awaiting_response', 'disputed'].includes(workflowStatus) &&
        hasResponse(message.id) &&
        message.reviewee_decision !== 'accepted' &&
        (isReviewee || message.author_id === currentUserId)
    )

  function canEditResponse(message: DetailUserMessage): boolean {
    return Boolean(
      message.author_id === currentUserId &&
        ['reviewee_response', 'dispute_reply'].includes(message.message_type ?? '') &&
        ['awaiting_response', 'disputed'].includes(workflowStatus)
    )
  }

  function beginEditResponse(message: DetailUserMessage) {
    if (!canEditResponse(message)) return
    editingResponseMessageId = message.id
    responseBody = message.body
  }

  function cancelEditResponse() {
    editingResponseMessageId = null
    responseBody = ''
  }

  function handleUpdateResponse(message: DetailUserMessage) {
    if (responseBody.trim().length === 0) return
    onUpdateResponse(message, responseBody.trim())
    cancelEditResponse()
  }

  function handleRespondReview(reviewMessageId: string) {
    if (responseBody.trim().length === 0) return
    onRespondReview(reviewMessageId, responseBody.trim())
    responseBody = ''
    activeResponseReviewId = null
  }

  function handleReportDispute(reviewMessageId: string) {
    if (disputeClaim.trim().length < 10 || disputeEvidence.trim().length < 10) return
    onReportDispute(reviewMessageId, {
      disputeType,
      claim: disputeClaim.trim(),
      evidence: disputeEvidence.trim(),
      requestedOutcome,
    })
    activeReportReviewId = null
  }
</script>

<section class="border-t border-border pt-4">
  <h4 class="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
    <MessageSquareText class="h-4 w-4" />
    {t('task.review_workflow.thread', {}, 'Review thread')}
  </h4>
  <div class="overflow-hidden rounded-lg border border-border bg-background">
    {#each reviewMessages as message (message.id)}
      <article class="border-b border-border px-4 py-4 last:border-b-0 sm:px-5">
        <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span class="font-semibold text-foreground">
            {message.message_type === 'system'
              ? reviewMessageAuthorLabel(message, t)
              : `${reviewMessageAuthorLabel(message, t)} · ${reviewMessageTypeLabel(message.message_type, t)}`}
          </span>
          <span class="shrink-0">
            {#if (message.revision_count ?? 0) > 1}
              {t('task.review_workflow.edited_at', {}, 'Edited')} {formatDate(message.updated_at)}
            {:else}
              {formatDate(message.created_at)}
            {/if}
          </span>
        </header>
        <p class="mt-2 max-w-[75ch] whitespace-pre-wrap text-sm leading-6 text-foreground">
          {reviewMessageBodyLabel(message, t)}
        </p>

        {#if message.author_id === currentUserId && canEditSubmittedReview}
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
              onclick={onBeginEditReview}
            >
              {t('task.review_workflow.edit_review', {}, 'Edit review')}
            </button>
            <button
              type="button"
              class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
              onclick={() => onWithdrawMessage(message)}
            >
              {t('task.review_workflow.delete_message', {}, 'Delete')}
            </button>
          </div>
        {/if}

        {#if message.reviewee_decision && !(message.requires_reviewer_confirmation && message.reviewee_decision === 'accepted')}
          <span
            class="mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold {message.reviewee_decision === 'accepted'
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-destructive/30 bg-destructive/10 text-destructive'}"
          >
            {message.reviewee_decision === 'accepted'
              ? t('task.review_workflow.review_accepted', {}, 'Accepted by reviewee')
              : t('task.review_workflow.review_rejected', {}, 'Disputed by reviewee')}
          </span>
        {/if}

        {#if message.reviewer_agreed_at}
          <span class="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {t('task.review_workflow.review_settlement_confirmed', {}, 'Both parties agreed')}
          </span>
        {:else if message.requires_reviewer_confirmation && message.reviewee_decision === 'accepted'}
          <span class="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {t('task.review_workflow.reviewee_settlement_confirmed', {}, 'Reviewee agreed — waiting for reviewer confirmation')}
          </span>
        {/if}

        {#each allReviewMessages.filter((candidate) => candidate.parent_review_message_id === message.id) as reply (reply.id)}
          <div class="mt-4 border-t border-border pt-3 text-sm">
            <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span class="font-semibold text-foreground">
                {reply.message_type === 'system'
                  ? reviewMessageAuthorLabel(reply, t)
                  : `${reviewMessageAuthorLabel(reply, t)} · ${reviewMessageTypeLabel(reply.message_type, t)}`}
              </span>
              <span>{formatDate(reply.created_at)}</span>
            </div>
            <p class="mt-2 max-w-[75ch] whitespace-pre-wrap leading-6 text-foreground">
              {reviewMessageBodyLabel(reply, t)}
            </p>

            {#if (reply.revision_count ?? 0) > 1}
              <details class="mt-2 rounded-md border border-border bg-muted/10 px-3 py-2">
                <summary class="cursor-pointer text-xs font-bold text-foreground">
                  {t('task.review_workflow.view_edit_history', {}, 'View edit history')}
                </summary>
                {#each reply.revisions ?? [] as revision (revision.id)}
                  <p class="mt-2 text-xs text-muted-foreground">
                    {t('task.review_workflow.revision_number', { number: revision.revision_number }, `Version ${revision.revision_number}`)} · {revision.body}
                  </p>
                {/each}
              </details>
            {/if}

            {#if canEditResponse(reply)}
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                  onclick={() => beginEditResponse(reply)}
                >
                  {t('task.review_workflow.edit_response', {}, 'Edit response')}
                </button>
                <button
                  type="button"
                  class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  onclick={() => onWithdrawMessage(reply)}
                >
                  {t('task.review_workflow.delete_message', {}, 'Delete')}
                </button>
              </div>
            {/if}

            {#if editingResponseMessageId === reply.id}
              <div class="mt-3 space-y-2 border-t border-border pt-3">
                <label class="text-xs font-bold" for={`task-review-response-edit-${reply.id}`}>
                  {t('task.review_workflow.edit_response', {}, 'Edit response')}
                </label>
                <textarea
                  id={`task-review-response-edit-${reply.id}`}
                  bind:value={responseBody}
                  class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                ></textarea>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="min-h-8 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                    onclick={() => handleUpdateResponse(reply)}
                  >
                    {t('task.review_workflow.update_response', {}, 'Update response')}
                  </button>
                  <button
                    type="button"
                    class="min-h-8 rounded-md border border-border px-3 py-1 text-xs font-bold"
                    onclick={cancelEditResponse}
                  >
                    {t('common.cancel', {}, 'Cancel')}
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {/each}

        {#if canRespondTo(message)}
          {#if activeResponseReviewId === message.id}
            <div class="mt-4 space-y-2 border-t border-border pt-3">
              <label class="text-xs font-bold" for={`task-review-response-${message.id}`}>
                {isDisputeDiscussion(message)
                  ? t('task.review_workflow.dispute_discussion_label', {}, 'Discussion in this dispute')
                  : t('task.review_workflow.response_label', {}, 'Response to this review')}
              </label>
              <textarea
                id={`task-review-response-${message.id}`}
                bind:value={responseBody}
                class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              ></textarea>
              <button
                type="button"
                class="rounded-md border border-border bg-background px-3 py-2 text-xs font-bold"
                onclick={() => handleRespondReview(message.id)}
              >
                {isDisputeDiscussion(message)
                  ? t('task.review_workflow.send_dispute_discussion', {}, 'Send discussion reply')
                  : t('task.review_workflow.send_response', {}, 'Send response')}
              </button>
            </div>
          {:else}
            <button
              type="button"
              class="mt-4 min-h-9 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted/40"
              onclick={() => {
                activeResponseReviewId = message.id
                activeReportReviewId = null
                responseBody = ''
              }}
            >
              {isDisputeDiscussion(message)
                ? t('task.review_workflow.continue_dispute_discussion', {}, 'Continue dispute discussion')
                : t('task.review_workflow.respond_to_review', {}, 'Respond to this review')}
            </button>
          {/if}
        {/if}

        {#if canDecide(message) || canReviewerConfirm(message) || (canReportFor(message) && activeReportReviewId !== message.id)}
          <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {#if canDecide(message)}
              <button
                type="button"
                class="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                onclick={() => onDecideReview(message.id, 'accepted')}
              >
                <CheckCircle2 class="h-3.5 w-3.5" />
                {message.reviewee_decision === 'rejected'
                  ? t('task.review_workflow.accept_after_discussion', {}, 'Accept after discussion')
                  : t('task.review_workflow.accept_this_review', {}, 'Accept this review')}
              </button>
              {#if message.reviewee_decision !== 'rejected'}
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive"
                  onclick={() => onDecideReview(message.id, 'rejected')}
                >
                  <AlertTriangle class="h-3.5 w-3.5" />
                  {t('task.review_workflow.dispute_this_review', {}, 'Dispute this review')}
                </button>
              {/if}
            {/if}
            {#if canReviewerConfirm(message)}
              <button
                type="button"
                class="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                onclick={() => onDecideReview(message.id, 'accepted')}
              >
                <CheckCircle2 class="h-3.5 w-3.5" />
                {t('task.review_workflow.confirm_dispute_resolution', {}, 'Confirm resolution')}
              </button>
            {/if}
            {#if canReportFor(message) && activeReportReviewId !== message.id}
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive"
                onclick={() => {
                  activeReportReviewId = message.id
                  activeResponseReviewId = null
                  disputeType = 'review_fairness'
                  disputeClaim = ''
                  disputeEvidence = ''
                  requestedOutcome = 'reviewer_re_review'
                }}
              >
                {t('task.review_workflow.report_this_review', {}, 'Report this review')}
              </button>
            {/if}
          </div>
        {/if}

        {#if canReportFor(message)}
          {#if activeReportReviewId === message.id}
            <div class="mt-4 space-y-2 border-t border-destructive/30 pt-3">
              <label class="flex items-center gap-2 text-xs font-bold" for={`task-review-report-${message.id}`}>
                <AlertTriangle class="h-3.5 w-3.5" />
                {t('task.review_workflow.dispute_report_label', {}, 'Send dispute report')}
              </label>
              <p class="text-xs text-muted-foreground">
                Đây là hồ sơ tranh chấp chính thức, không phải comment. Claim, căn cứ và nguyện vọng đều bắt buộc.
              </p>
              <select
                aria-label="Dispute type"
                bind:value={disputeType}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="deadline">Deadline quá gấp</option>
                <option value="scope">Scope quá nặng</option>
                <option value="missing_context">Thiếu context/quyền truy cập</option>
                <option value="scope_change">Yêu cầu bị đổi sau khi giao</option>
                <option value="review_fairness">Review không công bằng</option>
                <option value="review_score">Điểm review không đúng</option>
                <option value="other">Khác</option>
              </select>
              <textarea
                id={`task-review-report-${message.id}`}
                aria-label="Dispute claim"
                bind:value={disputeClaim}
                placeholder="Tôi phản đối điều gì?"
                class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              ></textarea>
              <textarea
                aria-label="Dispute evidence"
                bind:value={disputeEvidence}
                placeholder="Nêu căn cứ: task package, review, mốc thời gian hoặc policy liên quan."
                class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              ></textarea>
              <select
                aria-label="Requested outcome"
                bind:value={requestedOutcome}
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="task_giver_re_review">Yêu cầu người giao task xem lại</option>
                <option value="reviewer_re_review">Yêu cầu reviewer xem lại</option>
                <option value="independent_re_review">Yêu cầu reviewer độc lập</option>
                <option value="adjust_scope_or_deadline">Điều chỉnh scope/deadline</option>
                <option value="adjust_score">Điều chỉnh điểm</option>
                <option value="keep_current_review">Giữ review hiện tại</option>
                <option value="admin_review">Yêu cầu admin xem xét</option>
              </select>
              <button
                type="button"
                class="rounded-md bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground"
                onclick={() => handleReportDispute(message.id)}
              >
                {t('task.review_workflow.send_report', {}, 'Send report')}
              </button>
            </div>
          {/if}
        {/if}
      </article>
    {:else}
      <div class="rounded-md border border-dashed border-border bg-background/70 px-3 py-3 text-sm text-muted-foreground">
        {t('task.review_workflow.no_discussion', {}, 'No review discussion yet.')}
      </div>
    {/each}
  </div>
</section>

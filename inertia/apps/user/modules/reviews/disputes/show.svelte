<script lang="ts">
  import { router, Link } from '@inertiajs/svelte'
  import axios, { AxiosError } from 'axios'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Tabs from '@/apps/user/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/user/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/user/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/user/shared/ui/tabs_trigger.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import DisputeDetailOverviewTab from './components/dispute_detail_overview_tab.svelte'
  import DisputeDetailDiscussionTab from './components/dispute_detail_discussion_tab.svelte'
  import DisputeDetailEvidenceTab from './components/dispute_detail_evidence_tab.svelte'
  import DisputeDetailResponseTab from './components/dispute_detail_response_tab.svelte'

  interface Dispute {
    id: string
    review_session_id: string
    task_id: string
    task_title: string | null
    task_description: string | null
    organization_id: string | null
    project_id: string | null
    reviewee_id: string
    reviewee_username: string | null
    reviewee_email: string | null
    status: string
    dispute_reason: string
    requested_outcome: string
    created_at: string
    disputed_dimensions: Record<string, unknown>
    disputed_skill_reviews: Record<string, unknown>[]
    final_decision: string | null
    final_rationale: string | null
  }

  interface Comment {
    id: string
    author_id: string
    body: string
    created_at: string
    author_context: string | null
  }

  interface Evidence {
    id: string
    evidenceType: string
    url: string
    title: string | null
    description: string | null
    uploaded_by: string
    created_at: string
  }

  interface Props {
    dispute: Dispute
    comments: Comment[]
    evidences: Evidence[]
    taskComments: import('../types.svelte').ReviewRelatedTaskComment[]
    authorContext: string | null
    canRespond: boolean
    canReportToAdmin: boolean
  }

  const {
    dispute,
    comments,
    evidences,
    taskComments,
    authorContext: _authorContext,
    canRespond,
    canReportToAdmin,
  }: Props = $props()
  const { t } = useTranslation()
  type DisputeTab = 'overview' | 'discussion' | 'evidence' | 'response'

  let activeTab = $state<DisputeTab>('overview')
  let commentBody = $state('')
  let postingComment = $state(false)

  // Evidence states
  let showEvidenceForm = $state(false)
  let evidenceType = $state('pull_request')
  let evidenceUrl = $state('')
  let evidenceTitle = $state('')
  let evidenceDesc = $state('')
  let uploadingEvidence = $state(false)

  // Org response states
  let showResponseForm = $state(false)
  let orgPosition = $state<'agree' | 'disagree'>('disagree')
  let orgSummary = $state('')
  let submittingResponse = $state(false)
  let reportingDispute = $state(false)
  let reportReason = $state('')

  let errorMsg = $state('')
  let successMsg = $state('')

  function isErrorMessageRecord(value: unknown): value is { message: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof value.message === 'string'
    )
  }

  function hasErrorList(value: unknown): value is { errors: unknown[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'errors' in value &&
      Array.isArray(value.errors)
    )
  }

  function extractApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AxiosError) {
      const responseData: unknown = error.response?.data
      if (hasErrorList(responseData)) {
        const firstError = responseData.errors[0]
        if (isErrorMessageRecord(firstError)) {
          return firstError.message
        }
      }
    }

    return fallback
  }

  async function postComment() {
    if (!commentBody.trim() || postingComment) return
    postingComment = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/reviews/disputes/${dispute.id}/comments`, {
        body: commentBody.trim(),
        visibility: 'all_parties',
      })
      commentBody = ''
      router.reload({ only: ['comments'] })
      successMsg = t('task.disputes.detail.comment_success', {}, 'Comment posted.')
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, t('task.disputes.detail.comment_error', {}, 'Unable to post comment.'))
    } finally {
      postingComment = false
    }
  }

  async function addEvidence() {
    if (!evidenceUrl.trim() || !evidenceTitle.trim() || uploadingEvidence) return
    uploadingEvidence = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/reviews/disputes/${dispute.id}/evidences`, {
        evidenceType,
        url: evidenceUrl.trim(),
        title: evidenceTitle.trim(),
        description: evidenceDesc.trim() || undefined,
      })
      evidenceUrl = ''
      evidenceTitle = ''
      evidenceDesc = ''
      showEvidenceForm = false
      router.reload({ only: ['evidences'] })
      successMsg = t('task.disputes.detail.evidence_success', {}, 'Evidence uploaded.')
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, t('task.disputes.detail.evidence_error', {}, 'Unable to upload evidence.'))
    } finally {
      uploadingEvidence = false
    }
  }

  async function submitOrgResponse() {
    if (!orgSummary.trim() || submittingResponse) return
    submittingResponse = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/v1/me/organizations/current/reviews/disputes/${dispute.id}/respond`, {
        position: orgPosition,
        body: orgSummary.trim(),
      })
      showResponseForm = false
      router.reload()
      successMsg = t('task.disputes.detail.response_success', {}, 'Organization response submitted.')
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, t('task.disputes.detail.response_error', {}, 'Unable to submit response.'))
    } finally {
      submittingResponse = false
    }
  }

  async function reportDisputeToAdmin() {
    if (!reportReason.trim() || reportingDispute) return
    reportingDispute = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/reviews/disputes/${dispute.id}/report`, {
        escalationReason: reportReason.trim(),
      })
      reportReason = ''
      router.reload()
      successMsg = t('task.disputes.detail.report_success', {}, 'Dispute reported to system admin.')
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, t('task.disputes.detail.report_error', {}, 'Unable to report dispute.'))
    } finally {
      reportingDispute = false
    }
  }

  const pageTitle = $derived(t('task.disputes.detail.page_title', {}, 'Review dispute detail'))
  const statusMap = $derived.by((): Record<string, { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } | undefined> => ({
    pending: { label: t('task.disputes.detail.status.pending', {}, 'Pending'), variant: 'secondary' },
    collecting_evidence: { label: t('task.disputes.detail.status.collecting_evidence', {}, 'Collecting evidence'), variant: 'outline' },
    admin_reviewing: { label: t('task.disputes.detail.status.admin_reviewing', {}, 'Admin reviewing'), variant: 'default' },
    ai_reviewing: { label: t('task.disputes.detail.status.ai_reviewing', {}, 'AI reviewing'), variant: 'outline' },
    resolved: { label: t('task.disputes.detail.status.resolved', {}, 'Resolved'), variant: 'default' },
    rejected: { label: t('task.disputes.detail.status.rejected', {}, 'Rejected'), variant: 'destructive' },
    cancelled: { label: t('task.disputes.detail.status.cancelled', {}, 'Cancelled'), variant: 'outline' },
  }))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
<div class="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
  <div class="rounded-[28px] border border-border bg-card p-6 shadow-xs">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('task.disputes.detail.eyebrow', {}, 'Dispute room')}
        </p>
        <h1 class="mt-2 text-4xl font-black tracking-tight">{t('task.disputes.detail.title', {}, 'Review dispute')}</h1>
      </div>
      <Link href="/reviews/task-board">
        <Button variant="outline">{t('task.disputes.detail.back_to_task_board', {}, 'Back to task review board')}</Button>
      </Link>
    </div>

    <div class="mt-5 grid gap-3 md:grid-cols-4">
      <div class="rounded-2xl border border-border bg-background/80 p-4">
        <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t('task.disputes.detail.status_label', {}, 'Status')}</div>
        <div class="mt-2 min-w-0">
          <Badge variant={statusMap[dispute.status]?.variant ?? 'outline'} class="whitespace-normal break-words rounded-full px-3 py-1 leading-4">
            {t(`task.disputes.detail.status.${dispute.status}`, {}, statusMap[dispute.status]?.label ?? dispute.status)}
          </Badge>
        </div>
      </div>
      <div class="rounded-2xl border border-border bg-background/80 p-4">
        <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t('task.disputes.detail.comments', {}, 'Comments')}</div>
        <div class="mt-2 text-3xl font-black">{comments.length}</div>
      </div>
      <div class="rounded-2xl border border-border bg-background/80 p-4">
        <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t('task.disputes.detail.evidence', {}, 'Evidence')}</div>
        <div class="mt-2 text-3xl font-black">{evidences.length}</div>
      </div>
      <div class="rounded-2xl border border-border bg-background/80 p-4">
        <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t('task.disputes.detail.requested_outcome', {}, 'Requested outcome')}</div>
        <div class="mt-2 text-sm font-semibold text-foreground">{dispute.requested_outcome}</div>
      </div>
    </div>
  </div>

  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm text-muted-foreground">{t('task.disputes.detail.task_label', {}, 'Task')}: {dispute.task_title ?? t('task.disputes.detail.task_unknown', {}, 'Unknown task')}</p>
    </div>
  </div>

  {#if successMsg}
    <div class="p-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-sm font-medium font-sans">
      {successMsg}
    </div>
  {/if}

  {#if errorMsg}
    <div class="p-3 bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium font-sans">
      {errorMsg}
    </div>
  {/if}

  <!-- Admin Decision Highlight Card -->
  {#if dispute.status === 'resolved'}
    <Card class="border-emerald-500/30 bg-emerald-500/5">
      <CardHeader>
        <CardTitle class="text-emerald-600 flex items-center gap-2">
          <span>{t('task.disputes.detail.admin_decision_title', {}, 'System admin decision')}</span>
          <Badge variant="default">{t('task.disputes.detail.resolved', {}, 'Resolved')}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent class="text-sm space-y-2 font-sans">
        <p><span class="font-bold text-foreground">{t('task.disputes.detail.final_decision', {}, 'Outcome')}:</span> {dispute.final_decision}</p>
        <p><span class="font-bold text-foreground">{t('task.disputes.detail.final_rationale', {}, 'Detailed admin rationale')}:</span></p>
        <div class="p-3 bg-paper border border-line whitespace-pre-wrap">{dispute.final_rationale}</div>
      </CardContent>
    </Card>
  {/if}

  <Tabs value={activeTab} onValueChange={(value) => { activeTab = value as DisputeTab }}>
    <TabsList class="flex h-auto flex-wrap justify-start gap-2 rounded-2xl border border-border bg-background p-2">
      <TabsTrigger value="overview">{t('task.disputes.detail.tabs.overview', {}, 'Overview')}</TabsTrigger>
      <TabsTrigger value="discussion">{t('task.disputes.detail.tabs.discussion', {}, 'Discussion')}</TabsTrigger>
      <TabsTrigger value="evidence">{t('task.disputes.detail.tabs.evidence', {}, 'Evidence')}</TabsTrigger>
      {#if canRespond && dispute.status !== 'resolved' && dispute.status !== 'rejected'}
        <TabsTrigger value="response">{t('task.disputes.detail.tabs.response', {}, 'Response')}</TabsTrigger>
      {/if}
    </TabsList>

    <TabsContent value="overview" class="mt-4">
      <DisputeDetailOverviewTab
        {dispute}
        {statusMap}
        {canRespond}
        {canReportToAdmin}
        bind:reportReason
        reportingDispute={reportingDispute}
        taskCommentCount={taskComments.length}
        exchangeCount={comments.length}
        evidenceCount={evidences.length}
        onReportToAdmin={reportDisputeToAdmin}
      />
    </TabsContent>

    <TabsContent value="discussion" class="mt-4">
      <DisputeDetailDiscussionTab
        {comments}
        disputeStatus={dispute.status}
        bind:commentBody
        postingComment={postingComment}
        taskCommentCount={taskComments.length}
        onPostComment={postComment}
      />
    </TabsContent>

    <TabsContent value="evidence" class="mt-4">
      <DisputeDetailEvidenceTab
        taskId={dispute.task_id}
        disputeStatus={dispute.status}
        {evidences}
        bind:showEvidenceForm
        bind:evidenceType
        bind:evidenceUrl
        bind:evidenceTitle
        bind:evidenceDesc
        uploadingEvidence={uploadingEvidence}
        onAddEvidence={addEvidence}
      />
    </TabsContent>

    {#if canRespond && dispute.status !== 'resolved' && dispute.status !== 'rejected'}
      <TabsContent value="response" class="mt-4">
        <DisputeDetailResponseTab
          bind:showResponseForm
          bind:orgPosition
          bind:orgSummary
          submittingResponse={submittingResponse}
          onSubmitResponse={submitOrgResponse}
        />
      </TabsContent>
    {/if}
  </Tabs>
</div>
</AppLayout>

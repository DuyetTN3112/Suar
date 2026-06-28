<script lang="ts">
  /**
   * Show Review Page — GET /reviews/:id
   * Displays review session details with tabs for rating form, results, and confirmation.
   */
  import { page, Link } from '@inertiajs/svelte'

  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Tabs from '@/apps/user/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/user/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/user/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/user/shared/ui/tabs_trigger.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import ConfirmationPanel from './components/confirmation_panel.svelte'
  import ReviewEvidencePanel from './components/review_evidence_panel.svelte'
  import ReviewResultsSection from './components/review_results_section.svelte'
  import ReviewShowHeader from './components/review_show_header.svelte'
  import SelfAssessmentPanel from './components/self_assessment_panel.svelte'
  import SkillRatingForm from './components/skill_rating_form.svelte'
  import type {
    ShowReviewProps,
    ReviewerType,
    SerializedReviewAssignment,
    SerializedSkillReview,
    ReviewConfirmationEntry,
  } from './types.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    session: ShowReviewProps['session']
    skills: ShowReviewProps['skills']
    proficiencyLevels: ShowReviewProps['proficiencyLevels']
    taskComments: ShowReviewProps['taskComments']
    disputeId: string | null
  }

  const { session, skills, proficiencyLevels, taskComments, disputeId }: Props = $props()
  type RawReviewSession = ShowReviewProps['session'] & Record<string, unknown>

  function readAliased<T>(record: RawReviewSession, snakeKey: string, camelKey: string): T | undefined {
    return (record[snakeKey] ?? record[camelKey]) as T | undefined
  }

  function normalizeReviewSession(rawSession: ShowReviewProps['session']): ShowReviewProps['session'] {
    const raw = rawSession as RawReviewSession
    const confirmations = (raw.confirmations as Array<Record<string, unknown>> | null) ?? null
    const reviewerAssignments =
      readAliased<Array<Record<string, unknown>>>(raw, 'reviewer_assignments', 'reviewerAssignments') ??
      null
    const skillReviews =
      readAliased<Array<Record<string, unknown>>>(raw, 'skill_reviews', 'skillReviews') ?? null

    return {
      ...rawSession,
      task_assignment_id: readAliased<string>(raw, 'task_assignment_id', 'taskAssignmentId') ?? rawSession.task_assignment_id,
      reviewee_id: readAliased<string>(raw, 'reviewee_id', 'revieweeId') ?? rawSession.reviewee_id,
      manager_review_completed:
        readAliased<boolean>(raw, 'manager_review_completed', 'managerReviewCompleted') ??
        rawSession.manager_review_completed,
      creator_reviewer_id:
        readAliased<string | null>(raw, 'creator_reviewer_id', 'creatorReviewerId') ??
        rawSession.creator_reviewer_id,
      creator_review_completed:
        readAliased<boolean | undefined>(raw, 'creator_review_completed', 'creatorReviewCompleted') ??
        rawSession.creator_review_completed,
      manager_reviews_count:
        readAliased<number | undefined>(raw, 'manager_reviews_count', 'managerReviewsCount') ??
        rawSession.manager_reviews_count,
      peer_reviews_count:
        readAliased<number>(raw, 'peer_reviews_count', 'peerReviewsCount') ??
        rawSession.peer_reviews_count,
      required_peer_reviews:
        readAliased<number>(raw, 'required_peer_reviews', 'requiredPeerReviews') ??
        rawSession.required_peer_reviews,
      required_total_reviews:
        readAliased<number | undefined>(raw, 'required_total_reviews', 'requiredTotalReviews') ??
        rawSession.required_total_reviews,
      minimum_manager_reviews:
        readAliased<number | undefined>(raw, 'minimum_manager_reviews', 'minimumManagerReviews') ??
        rawSession.minimum_manager_reviews,
      minimum_peer_reviews:
        readAliased<number | undefined>(raw, 'minimum_peer_reviews', 'minimumPeerReviews') ??
        rawSession.minimum_peer_reviews,
      overall_quality_score:
        readAliased<number | null>(raw, 'overall_quality_score', 'overallQualityScore') ??
        rawSession.overall_quality_score,
      delivery_timeliness:
        readAliased<string | null>(raw, 'delivery_timeliness', 'deliveryTimeliness') ??
        rawSession.delivery_timeliness,
      requirement_adherence:
        readAliased<number | null>(raw, 'requirement_adherence', 'requirementAdherence') ??
        rawSession.requirement_adherence,
      communication_quality:
        readAliased<number | null>(raw, 'communication_quality', 'communicationQuality') ??
        rawSession.communication_quality,
      code_quality_score:
        readAliased<number | null>(raw, 'code_quality_score', 'codeQualityScore') ??
        rawSession.code_quality_score,
      proactiveness_score:
        readAliased<number | null>(raw, 'proactiveness_score', 'proactivenessScore') ??
        rawSession.proactiveness_score,
      would_work_with_again:
        readAliased<boolean | null>(raw, 'would_work_with_again', 'wouldWorkWithAgain') ??
        rawSession.would_work_with_again,
      strengths_observed:
        readAliased<string | null>(raw, 'strengths_observed', 'strengthsObserved') ??
        rawSession.strengths_observed,
      areas_for_improvement:
        readAliased<string | null>(raw, 'areas_for_improvement', 'areasForImprovement') ??
        rawSession.areas_for_improvement,
      created_at: readAliased<string>(raw, 'created_at', 'createdAt') ?? rawSession.created_at,
      completed_at:
        readAliased<string | null>(raw, 'completed_at', 'completedAt') ?? rawSession.completed_at,
      updated_at: readAliased<string>(raw, 'updated_at', 'updatedAt') ?? rawSession.updated_at,
      task_assignment:
        readAliased<ShowReviewProps['session']['task_assignment']>(raw, 'task_assignment', 'taskAssignment') ??
        rawSession.task_assignment,
      skill_reviews:
        skillReviews?.map((review) => ({
          ...review,
          id: review.id as string,
          review_session_id: (review.review_session_id ?? review.reviewSessionId) as string,
          reviewer_id: (review.reviewer_id ?? review.reviewerId) as string,
          reviewer_type: (review.reviewer_type ?? review.reviewerType) as ReviewerType,
          skill_id: (review.skill_id ?? review.skillId) as string,
          assigned_public_proficiency_code: (
            review.assigned_public_proficiency_code ?? review.assignedPublicProficiencyCode
          ) as string,
          created_at: (review.created_at ?? review.createdAt) as string,
          updated_at: (review.updated_at ?? review.updatedAt) as string,
        }) as SerializedSkillReview) ?? rawSession.skill_reviews,
      reviewer_assignments:
        reviewerAssignments?.map((assignment) => ({
          ...assignment,
          id: assignment.id as string,
          review_session_id: (assignment.review_session_id ?? assignment.reviewSessionId) as string,
          reviewer_id: (assignment.reviewer_id ?? assignment.reviewerId) as string,
          reviewer_type: (assignment.reviewer_type ?? assignment.reviewerType) as ReviewerType,
          assignment_role: (assignment.assignment_role ?? assignment.assignmentRole) as SerializedReviewAssignment['assignment_role'],
          is_required: (assignment.is_required ?? assignment.isRequired) as boolean,
          status: assignment.status as SerializedReviewAssignment['status'],
          due_at: (assignment.due_at ?? assignment.dueAt) as string | null,
          submitted_at: (assignment.submitted_at ?? assignment.submittedAt) as string | null,
        }) as SerializedReviewAssignment) ?? rawSession.reviewer_assignments,
      confirmations: confirmations
        ? confirmations.map((entry) => ({
            ...entry,
            user_id: (entry.user_id ?? entry.userId) as string,
            action: entry.action as ReviewConfirmationEntry['action'],
            dispute_reason: (entry.dispute_reason ?? entry.disputeReason) as string | null | undefined,
            confirmed_at: (entry.confirmed_at ?? entry.confirmedAt ?? entry.created_at ?? entry.createdAt) as string,
          }) as ReviewConfirmationEntry)
        : null,
    }
  }

  const reviewSession = $derived(normalizeReviewSession(session))
  
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateTimeFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  )
  const dateFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  )

  const pageTitle = $derived(
    t('task.reviews.show.page_title', {}, 'Review detail')
  )

  const taskTitle = $derived(
    reviewSession.task_assignment?.task?.title ?? t('task.reviews.show.unknown_task', {}, 'Unknown task')
  )
  const task = $derived(reviewSession.task_assignment?.task)
  const taskRecord = $derived((task ?? {}) as Record<string, unknown>)
  const assignmentRecord = $derived((reviewSession.task_assignment ?? {}) as Record<string, unknown>)
  const taskId = $derived(reviewSession.task_assignment?.task?.id ?? null)

  const reviewee = $derived(reviewSession.reviewee)
  const currentUserId = $derived((page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id)
  const isReviewee = $derived(currentUserId === reviewSession.reviewee_id)
  let selectedReviewerType = $state<ReviewerType>('peer')

  $effect(() => {
    selectedReviewerType = reviewSession.manager_review_completed ? 'peer' : 'manager'
  })

  function formatDateTimeValue(value: string | null | undefined): string | null {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return dateTimeFormatter.format(parsed)
  }

  function formatDateValue(value: string | null | undefined): string | null {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return dateFormatter.format(parsed)
  }

  const createdDate = $derived(
    formatDateTimeValue(reviewSession.created_at) ?? ''
  )

  const completedDate = $derived(
    formatDateTimeValue(reviewSession.completed_at)
  )

  // Determine if the current user can submit (session is pending/in_progress)
  const canSubmit = $derived(
    reviewSession.status === 'pending' || reviewSession.status === 'in_progress'
  )

  // Determine if the session is completed and needs confirmation
  const canConfirm = $derived(reviewSession.status === 'completed')

  // Active skills for this session (filter to active only)
  const activeSkills = $derived(skills.filter((s) => s.is_active))

  // Flash messages from session
  const flash = $derived((page as { props: { flash?: { success?: string; error?: string } } }).props.flash)
  const hasManagerSummary = $derived(
    reviewSession.overall_quality_score != null ||
      reviewSession.delivery_timeliness != null ||
      reviewSession.requirement_adherence != null ||
      reviewSession.communication_quality != null ||
      reviewSession.code_quality_score != null ||
      reviewSession.proactiveness_score != null ||
      reviewSession.strengths_observed != null ||
      reviewSession.areas_for_improvement != null
  )

  function textField(record: Record<string, unknown>, key: string): string | null {
    const value = record[key]
    return typeof value === 'string' && value.trim().length > 0 ? value : null
  }

  function numberField(record: Record<string, unknown>, key: string): number | null {
    const value = record[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }

  function dateField(record: Record<string, unknown>, key: string): string | null {
    const value = record[key]
    if (typeof value !== 'string' || value.trim().length === 0) return null
    return formatDateValue(value)
  }

  const taskDescription = $derived(textField(taskRecord, 'description'))
  const taskStatus = $derived(textField(taskRecord, 'status'))
  const taskPriority = $derived(textField(taskRecord, 'priority'))
  const taskDifficulty = $derived(textField(taskRecord, 'difficulty'))
  const taskDueDate = $derived(dateField(taskRecord, 'due_date') ?? dateField(taskRecord, 'dueDate'))
  const completionNotes = $derived(textField(assignmentRecord, 'completion_notes') ?? textField(assignmentRecord, 'completionNotes'))
  const actualHours = $derived(numberField(assignmentRecord, 'actual_hours') ?? numberField(assignmentRecord, 'actualHours'))
  const estimatedHours = $derived(numberField(assignmentRecord, 'estimated_hours') ?? numberField(assignmentRecord, 'estimatedHours'))
</script>

<svelte:head>
  <title>{pageTitle} — {taskTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
    <ReviewShowHeader
      {flash}
      {taskTitle}
      {reviewee}
      {createdDate}
      {completedDate}
      session={reviewSession}
    />

    <Card data-demo-section="review-task-detail">
      <CardHeader>
        <CardTitle class="text-base">{t('task.reviews.show.task_title', {}, 'Task under review')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div>
          <h2 class="text-xl font-bold text-foreground">{taskTitle}</h2>
          {#if taskDescription}
            <p class="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{taskDescription}</p>
          {:else}
            <p class="mt-2 text-sm text-muted-foreground">{t('task.reviews.show.no_task_description', {}, 'This task has no detailed description in the review package.')}</p>
          {/if}
        </div>

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-border bg-muted/20 p-3">
            <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Status</div>
            <div class="mt-1 text-sm font-semibold text-foreground">{taskStatus ?? reviewSession.status}</div>
          </div>
          <div class="rounded-xl border border-border bg-muted/20 p-3">
            <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Priority</div>
            <div class="mt-1 text-sm font-semibold text-foreground">{taskPriority ?? t('task.reviews.show.unset', {}, 'Not set')}</div>
          </div>
          <div class="rounded-xl border border-border bg-muted/20 p-3">
            <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('task.reviews.show.difficulty', {}, 'Difficulty')}</div>
            <div class="mt-1 text-sm font-semibold text-foreground">{taskDifficulty ?? t('task.reviews.show.unset', {}, 'Not set')}</div>
          </div>
          <div class="rounded-xl border border-border bg-muted/20 p-3">
            <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Due date</div>
            <div class="mt-1 text-sm font-semibold text-foreground">{taskDueDate ?? t('task.reviews.show.unset', {}, 'Not set')}</div>
          </div>
        </div>

        {#if completionNotes || actualHours || estimatedHours}
          <div class="rounded-xl border border-border bg-background p-4">
            <div class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('task.reviews.show.handoff_package', {}, 'Handoff package')}</div>
            {#if completionNotes}
              <p class="mt-2 whitespace-pre-line text-sm leading-6 text-foreground">{completionNotes}</p>
            {/if}
            <div class="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {#if estimatedHours}
                <span class="rounded-full border border-border px-3 py-1">Estimate: {estimatedHours}h</span>
              {/if}
              {#if actualHours}
                <span class="rounded-full border border-border px-3 py-1">Actual: {actualHours}h</span>
              {/if}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>

    {#if reviewSession.status === 'disputed' && disputeId}
      <div class="p-4 bg-secondary/40 border border-border text-foreground flex items-center justify-between text-sm">
        <div>
          <span class="font-bold">{t('task.reviews.show.dispute_title', {}, 'This review is disputed.')}</span> {t('task.reviews.show.dispute_description', {}, 'Profile updates are paused while the dispute is reviewed.')}
        </div>
        <Link href="/reviews/disputes/{disputeId}">
          <span class="underline font-semibold hover:text-primary">{t('task.reviews.show.dispute_link', {}, 'Go to dispute page ->')}</span>
        </Link>
      </div>
    {/if}

    <!-- Tabs: Rate / Results / Confirm -->
    <Tabs value={canSubmit ? 'rate' : 'results'}>
      <TabsList class="w-full justify-start">
        {#if canSubmit}
          <TabsTrigger value="rate">{t('task.reviews.show.rate_tab', {}, 'Skill rating')}</TabsTrigger>
        {/if}
        <TabsTrigger value="results">{t('task.reviews.show.results_tab', {}, 'Results')}</TabsTrigger>
        <TabsTrigger value="evidence">Evidence</TabsTrigger>
        {#if isReviewee}
          <TabsTrigger value="self">{t('task.reviews.show.self_tab', {}, 'Self assessment')}</TabsTrigger>
        {/if}
        {#if canConfirm}
          <TabsTrigger value="confirm">{t('task.reviews.show.confirm_tab', {}, 'Confirm')}</TabsTrigger>
        {/if}
      </TabsList>

      <!-- Tab: Rating Form -->
      {#if canSubmit}
        <TabsContent value="rate">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">{t('task.reviews.show.rate_title', {}, 'Skill rating')}</CardTitle>
              <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{t('task.reviews.show.reviewer_type_hint', {}, 'Choose reviewer type before submitting.')}</span>
                <button
                  type="button"
                  class="rounded-full border px-3 py-1 font-medium {selectedReviewerType === 'manager' ? 'border-primary bg-primary/10 text-primary' : ''}"
                  onclick={() => {
                    selectedReviewerType = 'manager'
                  }}
                >
                  {t('task.reviews.show.manager_reviewer', {}, 'Manager review')}
                </button>
                <button
                  type="button"
                  class="rounded-full border px-3 py-1 font-medium {selectedReviewerType === 'peer' ? 'border-primary bg-primary/10 text-primary' : ''}"
                  onclick={() => {
                    selectedReviewerType = 'peer'
                  }}
                >
                  {t('task.reviews.show.peer_reviewer', {}, 'Peer review')}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <SkillRatingForm
                sessionId={reviewSession.id}
                skills={activeSkills}
                {proficiencyLevels}
                reviewerType={selectedReviewerType}
                {taskId}
              />
            </CardContent>
          </Card>
        </TabsContent>
      {/if}

      <!-- Tab: Results -->
      <TabsContent value="results">
        <ReviewResultsSection
          session={reviewSession}
          {proficiencyLevels}
          {hasManagerSummary}
        />
      </TabsContent>

      <TabsContent value="evidence">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewEvidencePanel
              sessionId={reviewSession.id}
              {taskId}
              initialTaskComments={taskComments}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {#if isReviewee}
        <TabsContent value="self">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">{t('task.reviews.show.self_tab', {}, 'Self assessment')}</CardTitle>
            </CardHeader>
            <CardContent>
              <SelfAssessmentPanel sessionId={reviewSession.id} canEdit={isReviewee} />
            </CardContent>
          </Card>
        </TabsContent>
      {/if}

      <!-- Tab: Confirmation -->
      {#if canConfirm}
        <TabsContent value="confirm">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">{t('task.reviews.show.confirm_title', {}, 'Confirm result')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfirmationPanel sessionId={reviewSession.id} session={reviewSession} />
            </CardContent>
          </Card>
        </TabsContent>
      {/if}
    </Tabs>
  </div>
</AppLayout>

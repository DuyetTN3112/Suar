<script lang="ts">
  /**
   * Show Review Page — GET /reviews/:id
   * Displays review session details with tabs for rating form, results, and confirmation.
   */
  import AppLayout from '@/layouts/app_layout.svelte'
  import { page } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import ReviewStatusBadge from './components/review_status_badge.svelte'
  import SkillRatingForm from './components/skill_rating_form.svelte'
  import ReviewSummary from './components/review_summary.svelte'
  import ConfirmationPanel from './components/confirmation_panel.svelte'
  import ReverseReviewForm from './components/reverse_review_form.svelte'
  import ReviewEvidencePanel from './components/review_evidence_panel.svelte'
  import SelfAssessmentPanel from './components/self_assessment_panel.svelte'
  import { ClipboardCheck, User, Calendar, CircleCheck } from 'lucide-svelte'
  import type { ShowReviewProps, ReviewerType } from './types.svelte'

  interface Props {
    session: ShowReviewProps['session']
    skills: ShowReviewProps['skills']
    proficiencyLevels: ShowReviewProps['proficiencyLevels']
  }

  const { session, skills, proficiencyLevels }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(
    t('review.show', {}, 'Chi tiết đánh giá')
  )

  const taskTitle = $derived(
    session.task_assignment?.task?.title ?? 'Nhiệm vụ không xác định'
  )

  const reviewee = $derived(session.reviewee)
  const currentUserId = $derived(($page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id)
  const isReviewee = $derived(currentUserId === session.reviewee_id)
  let selectedReviewerType = $state<ReviewerType>('peer')

  $effect(() => {
    selectedReviewerType = session.manager_review_completed ? 'peer' : 'manager'
  })

  const createdDate = $derived(
    new Date(session.created_at).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  )

  const completedDate = $derived(
    session.completed_at
      ? new Date(session.completed_at).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
  )

  // Determine if the current user can submit (session is pending/in_progress)
  const canSubmit = $derived(
    session.status === 'pending' || session.status === 'in_progress'
  )

  // Determine if the session is completed and needs confirmation
  const canConfirm = $derived(session.status === 'completed')

  // Determine if reviewee can submit reverse reviews (completed or disputed)
  const canReverse = $derived(
    session.status === 'completed' || session.status === 'disputed'
  )

  // Build reviewer targets for reverse review form
  const reviewerTargets = $derived(
    (session.skill_reviews ?? [])
      .reduce<Array<{ id: string; username: string; type: 'peer' | 'manager' }>>(
        (acc, sr) => {
          const reviewer = sr.reviewer
          if (reviewer && !acc.some((target) => target.id === reviewer.id && target.type === sr.reviewer_type)) {
            acc.push({
              id: reviewer.id,
              username: reviewer.username,
              type: sr.reviewer_type as 'peer' | 'manager',
            })
          }
          return acc
        },
        []
      )
  )

  // Active skills for this session (filter to active only)
  const activeSkills = $derived(skills.filter((s) => s.is_active))

  // Flash messages from session
  const flash = $derived(($page as { props: { flash?: { success?: string; error?: string } } }).props.flash)
  const hasManagerSummary = $derived(
    session.overall_quality_score != null ||
      session.delivery_timeliness != null ||
      session.requirement_adherence != null ||
      session.communication_quality != null ||
      session.code_quality_score != null ||
      session.proactiveness_score != null ||
      session.strengths_observed != null ||
      session.areas_for_improvement != null
  )
</script>

<svelte:head>
  <title>{pageTitle} — {taskTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
    <!-- Flash messages -->
    {#if flash?.success}
      <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        {flash.error}
      </div>
    {/if}

    <!-- Session Info Header -->
    <Card>
      <CardHeader>
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <CardTitle class="text-lg">{taskTitle}</CardTitle>
            <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {#if reviewee}
                <div class="flex items-center gap-1.5">
                  <User class="h-3.5 w-3.5" />
                  <span>Người được đánh giá: <strong class="text-foreground">{reviewee.username}</strong></span>
                </div>
              {/if}
              <div class="flex items-center gap-1.5">
                <Calendar class="h-3.5 w-3.5" />
                <span>{createdDate}</span>
              </div>
            </div>
          </div>
          <ReviewStatusBadge status={session.status} />
        </div>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-4 text-sm">
          <div class="flex items-center gap-1.5">
            <ClipboardCheck class="h-4 w-4 text-muted-foreground" />
            <span>Manager: {session.manager_review_completed ? '✓ Đã đánh giá' : '✗ Chưa đánh giá'}</span>
          </div>
          <Separator orientation="vertical" class="h-4" />
          <div class="flex items-center gap-1.5">
            <CircleCheck class="h-4 w-4 text-muted-foreground" />
            <span>Peer: {session.peer_reviews_count}/{session.required_peer_reviews} hoàn thành</span>
          </div>
          {#if completedDate}
            <Separator orientation="vertical" class="h-4" />
            <span class="text-muted-foreground">Hoàn thành: {completedDate}</span>
          {/if}
        </div>
      </CardContent>
    </Card>

    <!-- Tabs: Rate / Results / Confirm -->
    <Tabs value={canSubmit ? 'rate' : 'results'}>
      <TabsList class="w-full justify-start">
        {#if canSubmit}
          <TabsTrigger value="rate">Đánh giá kỹ năng</TabsTrigger>
        {/if}
        <TabsTrigger value="results">Kết quả</TabsTrigger>
        <TabsTrigger value="evidence">Evidence</TabsTrigger>
        {#if isReviewee}
          <TabsTrigger value="self">Tự đánh giá</TabsTrigger>
        {/if}
        {#if canConfirm}
          <TabsTrigger value="confirm">Xác nhận</TabsTrigger>
        {/if}
        {#if canReverse}
          <TabsTrigger value="reverse">Đánh giá ngược</TabsTrigger>
        {/if}
      </TabsList>

      <!-- Tab: Rating Form -->
      {#if canSubmit}
        <TabsContent value="rate">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Đánh giá kỹ năng</CardTitle>
              <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Chọn loại reviewer trước khi gửi.</span>
                <button
                  type="button"
                  class="rounded-full border px-3 py-1 font-medium {selectedReviewerType === 'manager' ? 'border-primary bg-primary/10 text-primary' : ''}"
                  onclick={() => {
                    selectedReviewerType = 'manager'
                  }}
                >
                  Manager review
                </button>
                <button
                  type="button"
                  class="rounded-full border px-3 py-1 font-medium {selectedReviewerType === 'peer' ? 'border-primary bg-primary/10 text-primary' : ''}"
                  onclick={() => {
                    selectedReviewerType = 'peer'
                  }}
                >
                  Peer review
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <SkillRatingForm
                sessionId={session.id}
                skills={activeSkills}
                {proficiencyLevels}
                reviewerType={selectedReviewerType}
              />
            </CardContent>
          </Card>
        </TabsContent>
      {/if}

      <!-- Tab: Results -->
      <TabsContent value="results">
        {#if hasManagerSummary}
          <Card class="mb-4">
            <CardHeader>
              <CardTitle class="text-base">Tổng quan từ quản lý</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid gap-3 md:grid-cols-3">
                <div class="rounded-lg border p-3">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">Overall quality</p>
                  <p class="mt-1 text-2xl font-semibold">{session.overall_quality_score ?? '—'}</p>
                </div>
                <div class="rounded-lg border p-3">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">Requirement adherence</p>
                  <p class="mt-1 text-2xl font-semibold">{session.requirement_adherence ?? '—'}</p>
                </div>
                <div class="rounded-lg border p-3">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">Communication</p>
                  <p class="mt-1 text-2xl font-semibold">{session.communication_quality ?? '—'}</p>
                </div>
                <div class="rounded-lg border p-3">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">Code quality</p>
                  <p class="mt-1 text-2xl font-semibold">{session.code_quality_score ?? '—'}</p>
                </div>
                <div class="rounded-lg border p-3">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">Proactiveness</p>
                  <p class="mt-1 text-2xl font-semibold">{session.proactiveness_score ?? '—'}</p>
                </div>
                <div class="rounded-lg border p-3">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">Delivery timeliness</p>
                  <p class="mt-1 text-sm font-semibold">{session.delivery_timeliness ?? '—'}</p>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="rounded-lg border p-4">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">Strengths observed</p>
                  <p class="mt-2 text-sm">{session.strengths_observed || '—'}</p>
                </div>
                <div class="rounded-lg border p-4">
                  <p class="text-xs uppercase tracking-wide text-muted-foreground">Areas for improvement</p>
                  <p class="mt-2 text-sm">{session.areas_for_improvement || '—'}</p>
                </div>
              </div>

              <p class="text-xs text-muted-foreground">
                Would work with again: {session.would_work_with_again == null ? '—' : session.would_work_with_again ? 'Yes' : 'No'}
              </p>
            </CardContent>
          </Card>
        {/if}

        <Card>
          <CardHeader>
            <CardTitle class="text-base">Kết quả đánh giá</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewSummary
              skillReviews={session.skill_reviews ?? []}
              {proficiencyLevels}
            />
          </CardContent>
        </Card>

        <!-- Confirmations if any -->
        {#if session.confirmations && session.confirmations.length > 0}
          <Card class="mt-4">
            <CardHeader>
              <CardTitle class="text-base">Lịch sử xác nhận</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-3">
                {#each session.confirmations as entry}
                  <div class="flex items-start gap-3 text-sm rounded-lg border p-3">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-medium">{entry.user_id}</span>
                        <span class={entry.action === 'confirmed' ? 'text-green-600' : 'text-red-600'}>
                          {entry.action === 'confirmed' ? '✓ Xác nhận' : '✗ Tranh chấp'}
                        </span>
                      </div>
                      {#if entry.dispute_reason}
                        <p class="text-muted-foreground mt-1">{entry.dispute_reason}</p>
                      {/if}
                      <p class="text-xs text-muted-foreground mt-1">
                        {new Date(entry.confirmed_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                {/each}
              </div>
            </CardContent>
          </Card>
        {/if}
      </TabsContent>

      <TabsContent value="evidence">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Evidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewEvidencePanel sessionId={session.id} />
          </CardContent>
        </Card>
      </TabsContent>

      {#if isReviewee}
        <TabsContent value="self">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Tự đánh giá</CardTitle>
            </CardHeader>
            <CardContent>
              <SelfAssessmentPanel sessionId={session.id} canEdit={isReviewee} />
            </CardContent>
          </Card>
        </TabsContent>
      {/if}

      <!-- Tab: Confirmation -->
      {#if canConfirm}
        <TabsContent value="confirm">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">Xác nhận kết quả</CardTitle>
            </CardHeader>
            <CardContent>
              <ConfirmationPanel sessionId={session.id} />
            </CardContent>
          </Card>
        </TabsContent>
      {/if}

      <!-- Tab: Reverse Review -->
      {#if canReverse}
        <TabsContent value="reverse">
          <ReverseReviewForm sessionId={session.id} reviewers={reviewerTargets} />
        </TabsContent>
      {/if}
    </Tabs>
  </div>
</AppLayout>

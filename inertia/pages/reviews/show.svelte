<script lang="ts">
  /**
   * Show Review Page — GET /reviews/:id
   * Displays review session details with tabs for rating form, results, and confirmation.
   */
  import { page } from '@inertiajs/svelte'

  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import ConfirmationPanel from './components/confirmation_panel.svelte'
  import ReverseReviewForm from './components/reverse_review_form.svelte'
  import ReviewEvidencePanel from './components/review_evidence_panel.svelte'
  import ReviewResultsSection from './components/review_results_section.svelte'
  import ReviewShowHeader from './components/review_show_header.svelte'
  import SelfAssessmentPanel from './components/self_assessment_panel.svelte'
  import SkillRatingForm from './components/skill_rating_form.svelte'
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
  const currentUserId = $derived((page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id)
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
      .reduce<{ id: string; username: string; type: 'peer' | 'manager' }[]>(
        (acc, sr) => {
          const reviewer = sr.reviewer
          if (reviewer && !acc.some((target) => target.id === reviewer.id && target.type === sr.reviewer_type)) {
            acc.push({
              id: reviewer.id,
              username: reviewer.username,
              type: sr.reviewer_type,
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
  const flash = $derived((page as { props: { flash?: { success?: string; error?: string } } }).props.flash)
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
    <ReviewShowHeader {flash} {taskTitle} {reviewee} {createdDate} {completedDate} {session} />

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
        <ReviewResultsSection
          {session}
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

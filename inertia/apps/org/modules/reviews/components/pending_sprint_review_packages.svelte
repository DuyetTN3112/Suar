<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import axios from 'axios'
  import { onMount } from 'svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface PendingPackage {
    id: string
    sprintId: string
    status: string
    sprintName: string
    projectName: string
    organizationId: string
    submittedAt?: string | null
  }

  interface ManagerTarget {
    userId: string
    targetRole: string
  }

  interface PackageDetail {
    id: string
    sprintId: string
    status: string
    projectTarget: { id: string; name: string }
    organizationTarget: { id: string; name: string }
    eligibleManagerTargets: ManagerTarget[]
    managerReviews: SubmittedManagerReview[]
    environmentReviews: SubmittedEnvironmentReview[]
    dispute: SprintReviewDispute | null
  }

  type EnvironmentTargetType = 'project' | 'organization'

  interface ManagerDraft {
    targetUserId: string
    rating: number
    comment: string
  }

  interface EnvironmentDraft {
    targetType: EnvironmentTargetType
    targetId: string
    rating: number
    comment: string
  }

  interface SubmittedManagerReview {
    id: string
    targetUserId: string
    targetRole: string
    rating: number
    comment: string | null
  }

  interface SubmittedEnvironmentReview {
    id: string
    targetType: EnvironmentTargetType
    targetId: string
    rating: number
    comment: string | null
  }

  interface SprintReviewDisputeComment {
    id: string
    authorId: string
    authorContext: string
    body: string
    createdAt: string
  }

  interface SprintReviewDispute {
    id: string
    status: string
    disputeReason: string
    requestedOutcome: string
    canReportToAdmin: boolean
    comments: SprintReviewDisputeComment[]
  }

  let packages = $state<PendingPackage[]>([])
  let selectedPackageId = $state<string | null>(null)
  let detail = $state<PackageDetail | null>(null)
  let managerDrafts = $state<ManagerDraft[]>([])
  let environmentDrafts = $state<EnvironmentDraft[]>([])
  let isLoading = $state(false)
  let isSubmitting = $state(false)
  let errorMessage = $state<string | null>(null)
  let successMessage = $state<string | null>(null)
  let disputeReason = $state('')
  let disputeCommentBody = $state('')
  let reportReason = $state('')
  let disputeBusy = $state(false)
  let pagination = $state<OffsetPagePagination | null>(null)
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const statusFallbacks: Record<string, string> = {
    pending: 'Pending',
    submitted: 'Submitted',
    expired: 'Expired',
  }
  const roleFallbacks: Record<string, string> = {
    owner: 'Project owner',
    manager: 'Manager',
    lead: 'Lead',
    assigner: 'Assigner',
  }
  const targetTypeFallbacks: Record<string, string> = {
    project: 'Project',
    organization: 'Organization',
  }
  const requestedOutcomeFallbacks: Record<string, string> = {
    add_context: 'Add context',
    adjust_review: 'Adjust review',
    report_admin: 'Report to admin',
  }
  const pendingCount = $derived(packages.filter((item) => item.status === 'pending').length)

  async function loadPackages(page = pagination?.page ?? 1) {
    isLoading = true
    errorMessage = null
    try {
      const response = await axios.get<{ data: PendingPackage[]; pagination?: OffsetPagePagination }>(
        '/api/v1/me/sprint-review-packages',
        { params: { page, perPage: pagination?.perPage ?? 10 } }
      )
      packages = response.data.data ?? []
      pagination = response.data.pagination ?? null
      const [firstPackage] = packages
      if (firstPackage && !selectedPackageId) {
        await selectPackage(firstPackage.id)
      }
    } catch (_error) {
      errorMessage = t('task.sprint_review_packages.load_error', {}, 'Unable to load pending sprint reviews.')
    } finally {
      isLoading = false
    }
  }

  async function selectPackage(packageId: string) {
    selectedPackageId = packageId
    successMessage = null
    errorMessage = null
    const response = await axios.get<{ data: PackageDetail }>(
      `/api/v1/sprint-review-packages/${packageId}`
    )
    detail = response.data.data
    if (detail.status === 'submitted') {
      managerDrafts = []
      environmentDrafts = []
      return
    }
    managerDrafts = detail.eligibleManagerTargets.map((target) => ({
      targetUserId: target.userId,
      rating: 5,
      comment: '',
    }))
    environmentDrafts = [
      {
        targetType: 'project',
        targetId: detail.projectTarget.id,
        rating: 4,
        comment: '',
      },
      {
        targetType: 'organization',
        targetId: detail.organizationTarget.id,
        rating: 4,
        comment: '',
      },
    ]
  }

  function setManagerRating(index: number, value: string) {
    const draft = managerDrafts[index]
    if (draft) {
      draft.rating = normalizedRating(value)
    }
  }

  function setEnvironmentRating(index: number, value: string) {
    const draft = environmentDrafts[index]
    if (draft) {
      draft.rating = normalizedRating(value)
    }
  }

  function normalizedRating(value: string): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 1
    return Math.min(5, Math.max(1, Math.round(parsed)))
  }

  async function submitPackage() {
    if (!detail) return

    isSubmitting = true
    errorMessage = null
    successMessage = null
    try {
      await axios.post(`/api/v1/sprint-review-packages/${detail.id}/submit`, {
        managerReviews: managerDrafts.map((draft) => ({
          targetUserId: draft.targetUserId,
          rating: draft.rating,
          comment: draft.comment || null,
        })),
        environmentReviews: environmentDrafts.map((draft) => ({
          targetType: draft.targetType,
          targetId: draft.targetId,
          rating: draft.rating,
          comment: draft.comment || null,
        })),
      })
      successMessage = t('task.sprint_review_packages.submit_success', {}, 'Sprint review submitted.')
      selectedPackageId = null
      detail = null
      await loadPackages()
    } catch (_error) {
      errorMessage = t('task.sprint_review_packages.submit_error', {}, 'Unable to submit sprint review. Check scores and content, then try again.')
    } finally {
      isSubmitting = false
    }
  }

  async function openDispute() {
    if (!detail || !disputeReason.trim() || disputeBusy) return

    disputeBusy = true
    errorMessage = null
    successMessage = null
    try {
      await axios.post(`/api/v1/sprint-review-packages/${detail.id}/disputes`, {
        disputeReason: disputeReason.trim(),
        requestedOutcome: 'add_context',
      })
      disputeReason = ''
      await selectPackage(detail.id)
      successMessage = t('task.sprint_review_packages.dispute_open_success', {}, 'Sprint review dispute opened.')
    } catch (_error) {
      errorMessage = t('task.sprint_review_packages.dispute_open_error', {}, 'Unable to open sprint review dispute.')
    } finally {
      disputeBusy = false
    }
  }

  async function postDisputeComment() {
    if (!detail?.dispute || !disputeCommentBody.trim() || disputeBusy) return

    disputeBusy = true
    errorMessage = null
    successMessage = null
    try {
      await axios.post(`/api/v1/sprint-review-disputes/${detail.dispute.id}/comments`, {
        body: disputeCommentBody.trim(),
      })
      disputeCommentBody = ''
      await selectPackage(detail.id)
      successMessage = t('task.sprint_review_packages.dispute_comment_success', {}, 'Dispute reply sent.')
    } catch (_error) {
      errorMessage = t('task.sprint_review_packages.dispute_comment_error', {}, 'Unable to send dispute reply.')
    } finally {
      disputeBusy = false
    }
  }

  async function reportDisputeToAdmin() {
    if (!detail?.dispute || !reportReason.trim() || disputeBusy) return

    disputeBusy = true
    errorMessage = null
    successMessage = null
    try {
      await axios.post(`/api/v1/sprint-review-disputes/${detail.dispute.id}/report`, {
        escalationReason: reportReason.trim(),
      })
      reportReason = ''
      await selectPackage(detail.id)
      successMessage = t('task.sprint_review_packages.report_success', {}, 'Sprint review dispute reported to admin.')
    } catch (_error) {
      errorMessage = t('task.sprint_review_packages.report_error', {}, 'Unable to report sprint review dispute.')
    } finally {
      disputeBusy = false
    }
  }

  function targetRoleLabel(role: string): string {
    return t(`task.sprint_review_packages.role.${role}`, {}, roleFallbacks[role] ?? role)
  }

  function statusLabel(status: string): string {
    return t(`task.sprint_review_packages.status.${status}`, {}, statusFallbacks[status] ?? status)
  }

  function targetTypeLabel(targetType: string): string {
    return t(
      `task.sprint_review_packages.target_type.${targetType}`,
      {},
      targetTypeFallbacks[targetType] ?? targetType
    )
  }

  function requestedOutcomeLabel(outcome: string): string {
    return t(
      `task.sprint_review_packages.requested_outcome.${outcome}`,
      {},
      requestedOutcomeFallbacks[outcome] ?? outcome
    )
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  }

  function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  onMount(() => {
    void loadPackages()
  })
</script>

<Card class="rounded-xl border border-border bg-card shadow-suar-sm overflow-hidden">
  <CardHeader class="border-b border-border bg-secondary/30">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <CardTitle class="text-xl font-bold text-foreground">
          {t('task.sprint_review_packages.title', {}, 'Sprint reviews to submit')}
        </CardTitle>
        <p class="mt-1 text-sm text-muted-foreground">
          {t('task.sprint_review_packages.subtitle', {}, 'Review managers, projects, and organization environment when a sprint ends.')}
        </p>
      </div>
      <Badge variant="secondary" class="w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
        {t('task.sprint_review_packages.pending_count', { count: pendingCount }, `${pendingCount} pending`)}
      </Badge>
    </div>
  </CardHeader>
  <CardContent class="p-6">
    {#if errorMessage}
      <div class="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
        {errorMessage}
      </div>
    {/if}
    {#if successMessage}
      <div class="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600">
        {successMessage}
      </div>
    {/if}

    {#if isLoading}
      <div class="rounded-2xl border border-dashed border-border bg-background/70 py-8 text-center text-sm text-muted-foreground">
        {t('task.sprint_review_packages.loading', {}, 'Loading sprint reviews...')}
      </div>
    {:else if packages.length === 0}
      <div class="rounded-2xl border border-dashed border-border bg-background/70 py-8 text-center text-sm text-muted-foreground">
        {t('task.sprint_review_packages.empty', {}, 'No sprint review packages yet.')}
      </div>
    {:else}
      <div class="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div class="space-y-2">
          {#each packages as item (item.id)}
            <button
              type="button"
              class={`w-full rounded-xl border p-3 text-left transition ${selectedPackageId === item.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'}`}
              onclick={() => selectPackage(item.id)}
            >
              <div class="text-sm font-bold text-foreground">{item.sprintName}</div>
              <div class="mt-1 text-xs text-muted-foreground">{item.projectName}</div>
              {#if item.submittedAt}
                <div class="mt-1 text-[10px] font-semibold text-muted-foreground">
                  {t('task.sprint_review_packages.submitted_at', { date: formatDate(item.submittedAt) }, `Submitted at ${formatDate(item.submittedAt)}`)}
                </div>
              {/if}
              <div class="mt-2">
                <Badge variant="outline" class="rounded-full px-2 py-0.5 text-[10px] uppercase">
                  {statusLabel(item.status)}
                </Badge>
              </div>
            </button>
          {/each}
        </div>

        {#if detail}
          <div class="space-y-5 rounded-2xl border border-border bg-background p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="text-sm font-black text-foreground">{detail.projectTarget.name}</div>
                <div class="text-xs text-muted-foreground">
                  {t('task.sprint_review_packages.organization_prefix', { name: detail.organizationTarget.name }, `Org: ${detail.organizationTarget.name}`)}
                </div>
              </div>
              {#if detail.status === 'submitted'}
                <Badge variant="secondary" class="rounded-full px-3 py-1 text-[10px] font-bold uppercase">
                  {t('task.sprint_review_packages.status.submitted', {}, 'Submitted')}
                </Badge>
              {:else}
                <Button size="sm" disabled={isSubmitting} onclick={submitPackage}>
                  {isSubmitting
                    ? t('task.sprint_review_packages.submitting_button', {}, 'Submitting...')
                    : t('task.sprint_review_packages.submit_button', {}, 'Submit sprint review')}
                </Button>
              {/if}
            </div>

            {#if detail.status === 'submitted'}
              <section class="space-y-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t('task.sprint_review_packages.submitted_reviews_title', {}, 'Submitted reviews')}
                </h3>
                {#if detail.managerReviews.length === 0 && detail.environmentReviews.length === 0}
                  <div class="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    {t('task.sprint_review_packages.no_reviews', {}, 'This package has no review lines yet.')}
                  </div>
                {:else}
                  <div class="grid gap-3">
                    {#each detail.managerReviews as review (review.id)}
                      <article class="rounded-xl border border-border bg-card p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div class="text-xs font-bold text-foreground">
                            {targetRoleLabel(review.targetRole)} · {review.targetUserId.slice(0, 8)}
                          </div>
                          <Badge variant="outline" class="rounded-full px-2 py-0.5 text-[10px]">
                            {review.rating}/5
                          </Badge>
                        </div>
                        <p class="mt-2 text-sm text-muted-foreground">
                          {review.comment ?? t('task.sprint_review_packages.no_comment', {}, 'No comment.')}
                        </p>
                      </article>
                    {/each}
                    {#each detail.environmentReviews as review (review.id)}
                      <article class="rounded-xl border border-border bg-card p-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div class="text-xs font-bold uppercase text-foreground">{targetTypeLabel(review.targetType)}</div>
                          <Badge variant="outline" class="rounded-full px-2 py-0.5 text-[10px]">
                            {review.rating}/5
                          </Badge>
                        </div>
                        <p class="mt-2 text-sm text-muted-foreground">
                          {review.comment ?? t('task.sprint_review_packages.no_comment', {}, 'No comment.')}
                        </p>
                      </article>
                    {/each}
                  </div>
                {/if}
              </section>
              <section class="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 class="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-100">
                      {t('task.sprint_review_packages.dispute_title', {}, 'Sprint review dispute')}
                    </h3>
                    <p class="mt-1 text-sm text-amber-600/80 dark:text-amber-100/80">
                      {t('task.sprint_review_packages.dispute_description', {}, 'Use this area when environment or manager review needs formal pushback before admin escalation.')}
                    </p>
                  </div>
                  {#if detail.dispute}
                    <Badge variant="outline" class="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase">
                      {statusLabel(detail.dispute.status)}
                    </Badge>
                  {/if}
                </div>

                {#if detail.dispute}
                  <div class="rounded-xl border border-amber-500/20 bg-card p-3 text-sm dark:border-amber-900/60">
                    <div class="font-semibold text-foreground">{detail.dispute.disputeReason}</div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {t('task.sprint_review_packages.requested_outcome_label', { outcome: requestedOutcomeLabel(detail.dispute.requestedOutcome) }, `Requested outcome: ${requestedOutcomeLabel(detail.dispute.requestedOutcome)}`)}
                    </div>
                    <div class="mt-3">
                      <Link href={`/reviews/sprint-disputes/${detail.dispute.id}`}>
                        <Button size="sm" variant="outline">
                          {t('task.sprint_review_packages.open_dispute_room', {}, 'Open dispute room')}
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {#if detail.dispute.comments.length === 0}
                    <div class="rounded-xl border border-dashed border-amber-500/20 bg-background/70 p-3 text-sm text-muted-foreground dark:border-amber-900/60">
                      {t('task.sprint_review_packages.no_dispute_comments', {}, 'No dispute replies yet.')}
                    </div>
                  {:else}
                    <div class="space-y-2">
                      {#each detail.dispute.comments as comment (comment.id)}
                        <article class="rounded-xl border border-amber-500/20 bg-card p-3 text-sm dark:border-amber-900/60">
                          <div class="flex flex-wrap items-center justify-between gap-2">
                            <span class="text-xs font-bold uppercase text-foreground">{comment.authorContext}</span>
                            <span class="text-[10px] text-muted-foreground">
                              {formatDateTime(comment.createdAt)}
                            </span>
                          </div>
                          <p class="mt-2 whitespace-pre-wrap text-foreground">{comment.body}</p>
                        </article>
                      {/each}
                    </div>
                  {/if}

                  {#if detail.dispute.status !== 'resolved' && detail.dispute.status !== 'rejected'}
                    <div class="grid gap-2">
                      <Label class="text-[10px]">
                        {t('task.sprint_review_packages.dispute_comment', {}, 'Dispute reply')}
                      </Label>
                      <Textarea
                        bind:value={disputeCommentBody}
                        placeholder={t('task.sprint_review_packages.dispute_comment_placeholder', {}, 'Write an official reply...')}
                      />
                      <Button size="sm" variant="outline" class="w-fit" disabled={disputeBusy || !disputeCommentBody.trim()} onclick={postDisputeComment}>
                        {t('task.sprint_review_packages.send_reply', {}, 'Send reply')}
                      </Button>
                    </div>
                  {/if}

                  {#if detail.dispute.canReportToAdmin}
                    <div class="grid gap-2 rounded-xl border border-amber-500/30 bg-background p-3 dark:border-amber-800">
                      <Label class="text-[10px]">
                        {t('task.sprint_review_packages.report_reason', {}, 'Admin report reason')}
                      </Label>
                      <Textarea bind:value={reportReason} placeholder={t('task.sprint_review_packages.report_reason_placeholder', {}, 'Why can both sides not resolve this directly?')} />
                      <Button size="sm" class="w-fit" disabled={disputeBusy || !reportReason.trim()} onclick={reportDisputeToAdmin}>
                        {t('task.sprint_review_packages.report_to_admin', {}, 'Report to admin')}
                      </Button>
                    </div>
                  {/if}
                {:else}
                  <div class="grid gap-2">
                    <Label class="text-[10px]">
                      {t('task.sprint_review_packages.open_dispute_reason', {}, 'Dispute reason')}
                    </Label>
                    <Textarea bind:value={disputeReason} placeholder={t('task.sprint_review_packages.open_dispute_reason_placeholder', {}, 'Which part of this sprint review needs pushback?')} />
                    <Button size="sm" variant="outline" class="w-fit" disabled={disputeBusy || !disputeReason.trim()} onclick={openDispute}>
                      {t('task.sprint_review_packages.open_dispute', {}, 'Open dispute')}
                    </Button>
                  </div>
                {/if}
              </section>
            {:else if managerDrafts.length > 0}
              <section class="space-y-3">
                <h3 class="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {t('task.sprint_review_packages.manager_review_title', {}, 'Manager / assigner review')}
                </h3>
                {#each managerDrafts as draft, index}
                  <div class="grid gap-3 rounded-xl border border-border bg-card p-3 md:grid-cols-[160px_90px_1fr]">
                    <div>
                      <div class="text-xs font-bold text-foreground">{targetRoleLabel(detail.eligibleManagerTargets[index]?.targetRole ?? 'manager')}</div>
                      <div class="text-[10px] text-muted-foreground">{draft.targetUserId.slice(0, 8)}</div>
                    </div>
                    <div class="space-y-1">
                      <Label class="text-[10px]">{t('task.sprint_review_packages.score', {}, 'Score')}</Label>
                      <Input type="number" min="1" max="5" value={draft.rating} oninput={(event: Event) => setManagerRating(index, (event.currentTarget as HTMLInputElement).value)} />
                    </div>
                    <div class="space-y-1">
                      <Label class="text-[10px]">{t('task.sprint_review_packages.comment', {}, 'Comment')}</Label>
                      <Textarea bind:value={draft.comment} placeholder={t('task.sprint_review_packages.manager_comment_placeholder', {}, 'Strengths, clarity, support...')} />
                    </div>
                  </div>
                {/each}
              </section>
            {/if}

            {#if detail.status !== 'submitted'}
            <section class="space-y-3">
              <h3 class="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {t('task.sprint_review_packages.environment_review_title', {}, 'Environment review')}
              </h3>
              {#each environmentDrafts as draft, index}
                <div class="grid gap-3 rounded-xl border border-border bg-card p-3 md:grid-cols-[160px_90px_1fr]">
                  <div class="text-xs font-bold uppercase text-foreground">{targetTypeLabel(draft.targetType)}</div>
                  <div class="space-y-1">
                    <Label class="text-[10px]">{t('task.sprint_review_packages.score', {}, 'Score')}</Label>
                    <Input type="number" min="1" max="5" value={draft.rating} oninput={(event: Event) => setEnvironmentRating(index, (event.currentTarget as HTMLInputElement).value)} />
                  </div>
                  <div class="space-y-1">
                    <Label class="text-[10px]">{t('task.sprint_review_packages.comment', {}, 'Comment')}</Label>
                    <Textarea bind:value={draft.comment} placeholder={t('task.sprint_review_packages.environment_comment_placeholder', {}, 'Process, support, working environment...')} />
                  </div>
                </div>
              {/each}
            </section>
            {/if}
          </div>
        {/if}
      </div>
      {#if pagination}
        <UnifiedOffsetPagination
          {pagination}
          onPageChange={(pageNumber: number) => {
            selectedPackageId = null
            detail = null
            void loadPackages(pageNumber)
          }}
        />
      {/if}
    {/if}
  </CardContent>
</Card>

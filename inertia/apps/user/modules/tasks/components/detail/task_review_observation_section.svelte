<script lang="ts">
  import ReviewObservationAuthoringPanel from '@/apps/shared/components/review_observation_authoring_panel.svelte'
  import { projectReviewPackageToObservationContext } from '@/apps/shared/reviews/task_completion_review_package'
  import type { TaskCompletionReviewPackageProjection } from '@/apps/shared/reviews/task_completion_review_package'

  interface Props {
    isReviewer: boolean
    workflowId: string
    currentUserId?: string | null
    taskId: string
    projectId?: string | null
    taskDetailUrl?: string
    translate?: (key: string, params?: Record<string, unknown>, fallback?: string) => string
    reviewAuthoringContext?: Record<string, unknown> | null
    loadReviewPackage?: (reportId: string, taskId: string, assignmentId: string) => Promise<TaskCompletionReviewPackageProjection | null>
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
  }

  const {
    isReviewer,
    workflowId,
    currentUserId,
    taskId,
    projectId,
    taskDetailUrl,
    translate,
    reviewAuthoringContext,
    loadReviewPackage,
    t,
  }: Props = $props()

  let reviewPackage = $state<TaskCompletionReviewPackageProjection | null>(null)
  let reviewPackageLoading = $state(false)
  let reviewPackageError = $state('')
  let reviewPackageLoadKey = $state('')

  const reviewPackageAvailable = $derived(
    reviewAuthoringContext?.['reviewPackageAvailable'] === true
  )
  const reviewPackageReportId = $derived(
    typeof reviewAuthoringContext?.['completionReportId'] === 'string'
      ? reviewAuthoringContext['completionReportId']
      : ''
  )
  const reviewPackageAssignmentId = $derived(
    typeof reviewAuthoringContext?.['taskAssignmentId'] === 'string'
      ? reviewAuthoringContext['taskAssignmentId']
      : ''
  )
  const reviewPackageKey = $derived(
    `${reviewPackageReportId}:${taskId}:${reviewPackageAssignmentId}`
  )

  const observationContext = $derived.by(() => {
    if (!reviewAuthoringContext || !reviewPackageAvailable || !reviewPackage) {
      return reviewPackageAvailable ? null : reviewAuthoringContext
    }
    return projectReviewPackageToObservationContext(reviewAuthoringContext, reviewPackage)
  })

  $effect(() => {
    if (
      !currentUserId ||
      !reviewPackageAvailable ||
      !reviewPackageReportId ||
      !reviewPackageAssignmentId ||
      !taskId ||
      !loadReviewPackage ||
      reviewPackageLoadKey === reviewPackageKey
    ) {
      return
    }

    reviewPackageLoadKey = reviewPackageKey
    reviewPackage = null
    reviewPackageError = ''
    reviewPackageLoading = true

    void loadReviewPackage(reviewPackageReportId, taskId, reviewPackageAssignmentId)
      .then((value) => {
        if (reviewPackageLoadKey !== reviewPackageKey) return
        if (!value) throw new Error('Review package was unavailable')
        reviewPackage = value
      })
      .catch(() => {
        if (reviewPackageLoadKey === reviewPackageKey) {
          reviewPackageError = t(
            'task.review_observation.package_load_failed',
            {},
            'The native review package could not be loaded. Observation authoring is disabled.'
          )
        }
      })
      .finally(() => {
        if (reviewPackageLoadKey === reviewPackageKey) reviewPackageLoading = false
      })
  })
</script>

{#if isReviewer && workflowId}
  {#if reviewPackageAvailable && !reviewPackageReportId}
    <p role="alert" class="border-t border-border pt-4 text-sm font-semibold text-destructive">
      {t('task.review_observation.package_load_failed', {}, 'The native review package could not be loaded. Observation authoring is disabled.')}
    </p>
  {:else if reviewPackageAvailable && reviewPackageLoading}
    <p class="border-t border-border pt-4 text-sm text-muted-foreground">
      {t('task.review_observation.package_loading', {}, 'Loading the native review package...')}
    </p>
  {:else if reviewPackageAvailable && reviewPackageError}
    <p role="alert" class="border-t border-border pt-4 text-sm font-semibold text-destructive">
      {reviewPackageError}
    </p>
  {:else}
    <ReviewObservationAuthoringPanel
      {workflowId}
      currentUserId={currentUserId ?? null}
      {taskId}
      projectId={projectId ?? null}
      taskDetailUrl={taskDetailUrl ?? ''}
      {translate}
      context={observationContext as never}
    />
  {/if}
{/if}

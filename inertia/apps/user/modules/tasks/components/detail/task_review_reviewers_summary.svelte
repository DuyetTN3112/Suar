<script lang="ts">
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'
  import type { Reviewer } from './task_review_types.js'

  interface Props {
    reviewers: Reviewer[]
    missingReviewCount: number
    reviewerRoleLabel: (role: string) => string
    reviewerStatusLabel: (status: Reviewer['status']) => string
  }

  const {
    reviewers,
    missingReviewCount,
    reviewerRoleLabel,
    reviewerStatusLabel,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<section class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border pb-3">
  <h4 class="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
    {t('task.review_workflow.reviewers', {}, 'Reviewers')}
  </h4>
  <div class="flex flex-wrap gap-2">
    {#each reviewers as reviewer (reviewer.reviewer_id)}
      <div class="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-muted/20 px-2.5 py-1 text-xs">
        <span class="max-w-40 truncate font-semibold">{reviewer.reviewer_name ?? reviewer.reviewer_id}</span>
        <span class="text-muted-foreground">· {reviewerRoleLabel(reviewer.reviewer_role)} · {reviewerStatusLabel(reviewer.status)}</span>
      </div>
    {:else}
      <div class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
        {t('task.review_workflow.first_review_hint', {}, 'The first review creates the workflow and reviewer quorum.')}
      </div>
    {/each}
  </div>
  {#if missingReviewCount > 0}
    <p class="w-full text-sm text-muted-foreground">
      {t('task.review_workflow.community_review_needed', { count: missingReviewCount }, `Need ${missingReviewCount} more project review${missingReviewCount === 1 ? '' : 's'}.`)}
    </p>
  {/if}
</section>

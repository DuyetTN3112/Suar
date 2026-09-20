<script lang="ts">
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  interface Props {
    canFinalizeWorkflow: boolean
    finalizingWorkflow: boolean
    onFinalize: () => void
  }

  const {
    canFinalizeWorkflow,
    finalizingWorkflow,
    onFinalize,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<section class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
  <h4 class="text-sm font-bold text-foreground">
    {t('task.review_workflow.finalization.title', {}, 'Final review completion')}
  </h4>
  <p class="mt-1 text-sm leading-6 text-muted-foreground">
    {t('task.review_workflow.finalization.pending_help', {}, 'This review is resolved, but it is not Done yet. A final completion is the only review-board state that can queue governed profile projection.')}
  </p>
  {#if canFinalizeWorkflow}
    <button type="button" class="mt-3 inline-flex min-h-9 items-center rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60" onclick={onFinalize} disabled={finalizingWorkflow}>
      {finalizingWorkflow
        ? t('task.review_workflow.finalization.finalizing', {}, 'Finalizing review...')
        : t('task.review_workflow.finalization.finalize', {}, 'Mark review Done')}
    </button>
  {:else}
    <p class="mt-3 text-xs font-medium text-muted-foreground">
      {t('task.review_workflow.finalization.governor_required', {}, 'An organization owner or administrator must mark the review Done.')}
    </p>
  {/if}
</section>

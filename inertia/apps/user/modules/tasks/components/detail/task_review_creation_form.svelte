<script lang="ts">
  import { Send } from 'lucide-svelte'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  interface Props {
    reviewBody: string
    editingReview: boolean
    onSubmitReview: () => void
    onCancelEditReview: () => void
  }

  let {
    reviewBody = $bindable(),
    editingReview,
    onSubmitReview,
    onCancelEditReview,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<section class="space-y-2 border-t border-border pt-4">
  <label class="text-sm font-bold" for="task-review-body">
    {t('task.review_workflow.review_label', {}, 'Enter review')}
  </label>
  <textarea id="task-review-body" bind:value={reviewBody} class="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
  <div class="flex flex-wrap gap-2">
    <button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground" onclick={onSubmitReview}>
      <Send class="h-4 w-4" />
      {editingReview
        ? t('task.review_workflow.update_review', {}, 'Update review')
        : t('task.review_workflow.send_review', {}, 'Send review')}
    </button>
    {#if editingReview}
      <button type="button" class="min-h-10 rounded-md border border-border bg-background px-4 py-2 text-sm font-bold" onclick={onCancelEditReview}>
        {t('common.cancel', {}, 'Cancel')}
      </button>
    {/if}
  </div>
</section>

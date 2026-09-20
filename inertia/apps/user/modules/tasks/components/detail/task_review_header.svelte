<script lang="ts">
  import { Sparkles } from 'lucide-svelte'

  interface Props {
    taskId: string
    taskTitle: string
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
    onViewContext: () => void
  }

  const { taskId, taskTitle, t, onViewContext }: Props = $props()
</script>

<header class="shrink-0 border-b p-5">
  <div class="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
    <span class="rounded bg-muted px-2 py-1 font-mono">{taskId.slice(0, 8)}</span>
    <Sparkles class="h-3.5 w-3.5" />
    <span>{t('task.detail_panel.issue_label', {}, 'Issue')}</span>
  </div>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <h2 class="min-w-0 text-2xl font-bold leading-tight">{taskTitle}</h2>
    <button
      type="button"
      class="shrink-0 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
      onclick={onViewContext}
    >
      {t('task.review_workflow.task_context', {}, 'Task context')}
    </button>
  </div>
  <p class="mt-4 text-xs text-muted-foreground">
    {t('task.edit.locked_after_review', {}, 'Task locked after review')}
  </p>
</header>

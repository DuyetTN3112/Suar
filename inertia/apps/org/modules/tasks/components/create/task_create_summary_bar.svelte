<script lang="ts">
  interface Props {
    taskVisibilitySummary: string
    assigneeName?: string | null
    loadingAssigneeGroups?: boolean
    hasProjectId?: boolean
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
  }

  const {
    taskVisibilitySummary,
    assigneeName,
    loadingAssigneeGroups = false,
    hasProjectId = false,
    t,
  }: Props = $props()
</script>

<div class="mb-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
  <div class="rounded-2xl border border-border bg-secondary/20 p-4">
    <div class="grid gap-3 md:grid-cols-4">
      <div class="rounded-2xl border border-border bg-background/80 p-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('task.create.organization', {}, 'Organization')}
        </p>
        <p class="mt-2 text-sm font-semibold text-foreground">
          {t('task.create.current_organization_value', {}, 'Current')}
        </p>
      </div>
      <div class="rounded-2xl border border-border bg-background/80 p-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('task.create.task_access', {}, 'Task access')}
        </p>
        <p class="mt-2 text-sm font-semibold text-foreground">
          {taskVisibilitySummary}
        </p>
      </div>
      <div class="rounded-2xl border border-border bg-background/80 p-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('task.create.assignee', {}, 'Assignee')}
        </p>
        <p class="mt-2 truncate text-sm font-semibold text-foreground">
          {assigneeName ?? t('task.create.no_assignee', {}, 'No assignee')}
        </p>
      </div>
    </div>
    {#if hasProjectId && loadingAssigneeGroups}
      <div class="mt-3 h-2 w-32 animate-pulse rounded-full bg-muted"></div>
    {/if}
  </div>
</div>

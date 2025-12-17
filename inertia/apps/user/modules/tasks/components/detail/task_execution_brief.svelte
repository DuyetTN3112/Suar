<script lang="ts">
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  type Deliverable = string | Record<string, unknown>
  type Outcome = Record<string, unknown>

  interface TaskExecutionBriefTask {
    impact_scope?: string | null
    expected_deliverables?: Deliverable[]
    measurable_outcomes?: Outcome[]
    external_applications_count?: number | null
    project?: {
      id?: string
      name?: string
    } | null
    parentTask?: {
      id?: string
      title?: string
      status?: string
    } | null
  }

  interface Props {
    task: TaskExecutionBriefTask
  }

  const { task }: Props = $props()
  const { t } = useTranslation()

  const summaryItems = $derived([
    task.impact_scope
      ? {
          label: t('task.execution_brief.impact_scope', {}, 'Impact scope'),
          value: task.impact_scope,
        }
      : null,
    task.project?.name
      ? {
          label: 'Project',
          value: task.project.name,
        }
      : null,
    task.parentTask?.title
      ? {
          label: t('task.parent_task', {}, 'Parent task'),
          value: task.parentTask.title,
        }
      : null,
    typeof task.external_applications_count === 'number'
      ? {
          label: t('task.execution_brief.external_applications', {}, 'External applications'),
          value: String(task.external_applications_count),
        }
      : null,
  ].filter((item) => item !== null))

  const deliverables = $derived(
    Array.isArray(task.expected_deliverables) ? task.expected_deliverables : []
  )
  const outcomes = $derived(
    Array.isArray(task.measurable_outcomes) ? task.measurable_outcomes : []
  )

  function formatLabel(value: string): string {
    const normalized = value.replaceAll('_', ' ').trim()
    if (normalized.length === 0) {
      return 'Metric'
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  function formatDeliverable(item: Deliverable): string {
    if (typeof item === 'string') {
      return item
    }

    return Object.entries(item)
      .map(([key, value]) => `${formatLabel(key)}: ${String(value)}`)
      .join(' • ')
  }

  function formatOutcome(item: Outcome): string {
    const metric = typeof item.metric === 'string' ? formatLabel(item.metric) : 'Outcome'
    const target = item.target

    if (typeof target === 'string' || typeof target === 'number') {
      return `${metric}: ${String(target)}`
    }

    return Object.entries(item)
      .map(([key, value]) => `${formatLabel(key)}: ${String(value)}`)
      .join(' • ')
  }
</script>

{#if summaryItems.length > 0 || deliverables.length > 0 || outcomes.length > 0}
  <div class="space-y-5 border-t pt-4">
    <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wider">
      {t('task.execution_brief.title', {}, 'Execution brief')}
    </h4>

    {#if summaryItems.length > 0}
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {#each summaryItems as item}
          <div class="rounded-xl border bg-muted/10 p-3">
            <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </span>
            <p class="mt-2 font-semibold break-words">{item.value}</p>
          </div>
        {/each}
      </div>
    {/if}

    <div class="grid gap-4 xl:grid-cols-2">
      {#if deliverables.length > 0}
        <div class="rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h5 class="text-sm font-bold">
              {t('task.execution_brief.deliverables', {}, 'Deliverables')}
            </h5>
            <Badge variant="secondary" class="bg-primary/10 text-primary">
              {deliverables.length}
            </Badge>
          </div>
          <ul class="space-y-2 text-sm text-muted-foreground">
            {#each deliverables as item}
              <li class="rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <span class="text-foreground">{formatDeliverable(item)}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if outcomes.length > 0}
        <div class="rounded-xl border border-border/70 bg-muted/40 p-4">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h5 class="text-sm font-bold text-foreground">
              {t('task.execution_brief.measurable_outcomes', {}, 'Measurable outcomes')}
            </h5>
            <Badge variant="outline" class="border-border text-foreground bg-card/80">
              {outcomes.length}
            </Badge>
          </div>
          <ul class="space-y-2 text-sm text-foreground/80">
            {#each outcomes as item}
              <li class="rounded-lg border border-border/70 bg-card/80 px-3 py-2">
                {formatOutcome(item)}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </div>
{/if}

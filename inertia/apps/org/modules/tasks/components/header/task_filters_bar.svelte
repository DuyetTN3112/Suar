<script lang="ts">
  import { SlidersHorizontal, X } from 'lucide-svelte'
  import { router, page } from '@inertiajs/svelte'

  import DataTableFilters from '@/apps/org/shared/ui/data_table_filters.svelte'
  import type { FilterConfig } from '@/apps/org/shared/ui/data_table_filters_types'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type { TaskStore } from '@/apps/org/modules/tasks/stores/tasks.svelte'
  import type { TaskLabel, TaskPriority } from '@/apps/org/modules/tasks/types/index.svelte'

  interface Props {
    store: TaskStore
    metadata: {
      statuses: { value: string; label: string; }[]
      labels: { value: string; label: string; }[]
      priorities: { value: string; label: string; }[]
      users: { id: string; username: string; email: string; avatar_url?: string | null }[]
    }
    showDisplayProperties: boolean
    onToggleDisplayProperties: () => void
  }

  const {
    store,
    metadata,
    showDisplayProperties,
    onToggleDisplayProperties,
  }: Props = $props()

  const { t } = useTranslation()
  const currentQuery = $derived(new URLSearchParams(page.url.split('?')[1] ?? ''))

  const filterConfig = $derived.by<FilterConfig[]>(() => [
    {
      key: 'status',
      label: t('task.status', {}, 'Status'),
      type: 'multi_select',
      options: metadata.statuses.map(s => ({ label: s.label, value: s.value }))
    },
    {
      key: 'priority',
      label: t('task.priority', {}, 'Priority'),
      type: 'multi_select',
      options: metadata.priorities.map(p => ({ label: p.label, value: p.value }))
    },
    {
      key: 'label',
      label: t('task.label', {}, 'Label'),
      type: 'multi_select',
      options: metadata.labels.map(l => ({ label: l.label, value: l.value }))
    },
    {
      key: 'assigned_to',
      label: t('task.assigned_to', {}, 'Assigned to'),
      type: 'multi_select',
      options: metadata.users.map(u => ({ label: u.username, value: u.id, hasAvatar: true, avatarUrl: u.avatar_url }))
    },
    { key: 'created_at', type: 'date_range', label: t('task.created_at', {}, 'Created at') },
    { key: 'due_date', type: 'date_range', label: t('task.due_date', {}, 'Due date') },
  ])

  // Translate URL query to values
  const filterValues = $derived.by(() => {
    const filterQueryValues: Record<string, string> = {}
    filterConfig.forEach(cfg => {
      if (cfg.type === 'date_range') {
        const start = currentQuery.get(`${cfg.key}_start`)
        const end = currentQuery.get(`${cfg.key}_end`)
        if (start) filterQueryValues[`${cfg.key}_start`] = start
        if (end) filterQueryValues[`${cfg.key}_end`] = end
      } else {
        const val = currentQuery.get(cfg.key)
        if (val) filterQueryValues[cfg.key] = val
      }
    })
    
    // Also sync store to URL if needed, but for now we just read from URL
    // since DataTableFilters will trigger onFilterChange
    
    return filterQueryValues
  })

  const currentPath = $derived(page.url.split('?')[0] ?? page.url)

  function handleFilterChange(key: string, value: string) {
    const newQuery = new URLSearchParams(currentQuery.toString())
    if (value) {
      newQuery.set(key, value)
    } else {
      newQuery.delete(key)
    }
    
    // Sync to store for kanban client-side filtering
    if (key === 'status') store.setFilters({ statuses: value ? value.split(',') : [] })
    if (key === 'priority') store.setFilters({ priorities: value ? (value.split(',') as TaskPriority[]) : [] })
    if (key === 'label') store.setFilters({ labels: value ? (value.split(',') as TaskLabel[]) : [] })
    if (key === 'assigned_to') store.setFilters({ assignees: value ? value.split(',') : [] })

    router.get(currentPath, Object.fromEntries(newQuery.entries()), {
      preserveState: true,
      preserveScroll: true
    })
  }

  function handleClearFilters() {
    store.clearFilters()
    router.get(currentPath, {}, {
      preserveState: true,
      preserveScroll: true
    })
  }
</script>

<div class="flex w-full flex-wrap items-center gap-3 bg-transparent">
  <div class="flex-1 min-w-[300px]">
    <DataTableFilters
      filters={filterConfig}
      values={filterValues}
      onFilterChange={handleFilterChange}
    >
      {#if Object.keys(filterValues).length > 0}
        <Button type="button" variant="ghost" size="sm" onclick={handleClearFilters} class="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-destructive/10 rounded-full" aria-label={t('task.clear_filters', {}, 'Clear filters')}>
          <X class="h-3.5 w-3.5 mr-1" />
          {t('task.clear_filters', {}, 'Clear filters')}
        </Button>
      {/if}
    </DataTableFilters>
  </div>

  <div class="ml-auto flex items-center shrink-0">
    <Button
      size="sm"
      variant={showDisplayProperties ? 'secondary' : 'outline'}
      onclick={onToggleDisplayProperties}
      aria-label={t('task.show_columns', {}, 'Show columns')}
      class="h-8 rounded-lg border-border bg-background px-3 text-xs font-bold text-foreground shadow-suar-hairline hover:border-primary hover:bg-primary/10 hover:text-primary"
    >
      <SlidersHorizontal class="h-3.5 w-3.5 mr-1.5" />
      {t('task.show_columns', {}, 'Show columns')}
    </Button>
  </div>
</div>

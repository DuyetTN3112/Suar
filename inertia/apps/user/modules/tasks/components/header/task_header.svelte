<script lang="ts">
  import { X } from 'lucide-svelte'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import type { TaskStore } from '@/apps/user/modules/tasks/stores/tasks.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import DisplayProperties from '@/apps/user/modules/tasks/components/header/display_properties.svelte'
  import TaskFiltersBar from '@/apps/user/modules/tasks/components/header/task_filters_bar.svelte'

  interface Props {
    store: TaskStore
    metadata: {
      statuses: {
        value: string
        label: string
        color?: string
        slug?: string
        category?: string
      }[]
      labels: { value: string; label: string; color?: string }[]
      priorities: { value: string; label: string; color?: string }[]
      users: { id: string; username: string; email: string }[]
    }
  }

  const { store, metadata }: Props = $props()
  const { t } = useTranslation()

  let showDisplayProperties = $state(false)
</script>

<div class="mb-1 mt-1 flex flex-col gap-2">
  <div class="rounded-xl border border-border bg-background px-3 py-2">
    <TaskFiltersBar
      {store}
      {metadata}
      {showDisplayProperties}
      onToggleDisplayProperties={() => { showDisplayProperties = !showDisplayProperties }}
    />
  </div>

  {#if store.hasActiveFilters}
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        {#each store.filters.statuses as status}
          {@const label = metadata.statuses.find(s => s.value === status)?.label ?? status}
          <Badge variant="outline" class="inline-flex items-center gap-1.5 rounded-full border-border bg-background px-2 py-1 text-[11px] font-bold text-foreground">
            {label}
            <button
              type="button"
              class="flex items-center text-muted-foreground transition-colors hover:text-orange"
              aria-label={t('task.clear_status_filter', {}, 'Clear status filter')}
              onclick={() => { store.setFilters({ statuses: store.filters.statuses.filter(s => s !== status) }); }}
            >
              <X class="h-3 w-3" />
            </button>
          </Badge>
        {/each}
        {#each store.filters.priorities as priority}
          {@const label = metadata.priorities.find(p => p.value === priority)?.label ?? priority}
          <Badge variant="outline" class="inline-flex items-center gap-1.5 rounded-full border-border bg-background px-2 py-1 text-[11px] font-bold text-foreground">
            {label}
            <button
              type="button"
              class="flex items-center text-muted-foreground transition-colors hover:text-orange"
              aria-label={t('task.clear_priority_filter', {}, 'Clear priority filter')}
              onclick={() => { store.setFilters({ priorities: store.filters.priorities.filter(p => p !== priority) }); }}
            >
              <X class="h-3 w-3" />
            </button>
          </Badge>
        {/each}
        {#each store.filters.labels as labelValue}
          {@const label = metadata.labels.find(l => l.value === labelValue)?.label ?? labelValue}
          <Badge variant="outline" class="inline-flex items-center gap-1.5 rounded-full border-border bg-background px-2 py-1 text-[11px] font-bold text-foreground">
            {label}
            <button
              type="button"
              class="flex items-center text-muted-foreground transition-colors hover:text-orange"
              aria-label={t('task.clear_label_filter', {}, 'Clear label filter')}
              onclick={() => { store.setFilters({ labels: store.filters.labels.filter(l => l !== labelValue) }); }}
            >
              <X class="h-3 w-3" />
            </button>
          </Badge>
        {/each}
        {#each store.filters.assignees as assigneeId}
          {@const user = metadata.users.find(u => u.id === assigneeId)}
          {#if user}
            <Badge variant="outline" class="inline-flex items-center gap-1.5 rounded-full border-border bg-background px-2 py-1 text-[11px] font-bold text-foreground">
              {user.username}
              <button
                type="button"
                class="flex items-center text-muted-foreground transition-colors hover:text-orange"
                aria-label={t('task.clear_assignee_filter', {}, 'Clear assignee filter')}
                onclick={() => { store.setFilters({ assignees: store.filters.assignees.filter(id => id !== assigneeId) }); }}
              >
                <X class="h-3 w-3" />
              </button>
            </Badge>
          {/if}
        {/each}
        
        <button
          type="button"
          class="rounded px-2 py-1 text-[11px] font-extrabold text-primary transition-colors hover:bg-primary/10"
          onclick={() => { store.clearFilters(); }}
        >
          {t('common.clear_all', {}, 'Clear all filters')}
        </button>
      </div>
    </div>
  {/if}

  {#if showDisplayProperties}
    <div class="rounded-xl border border-border bg-background p-3 shadow-sm">
      <DisplayProperties {store} />
    </div>
  {/if}
</div>

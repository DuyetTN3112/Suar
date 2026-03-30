<script lang="ts">
  import Input from '@/components/ui/input.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import type { TaskPriority, TaskLabel } from '../../types.svelte'
  import { Search } from 'lucide-svelte'

  interface Props {
    store: TaskStore
    metadata: {
      statuses: Array<{ value: string; label: string }>
      labels: Array<{ value: string; label: string }>
      priorities: Array<{ value: string; label: string }>
      users: Array<{ id: string; username: string; email: string }>
    }
  }

  const { store, metadata }: Props = $props()
  const { t } = useTranslation()

  let searchTimeout: ReturnType<typeof setTimeout> | null = null

  function handleSearchInput(e: Event) {
    const target = e.target as HTMLInputElement
    const value = target.value

    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      store.setFilters({ search: value })
    }, 300)
  }

  function toggleStatusFilter(value: string) {
    const current = store.filters.statuses
    store.setFilters({
      statuses: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    })
  }

  function togglePriorityFilter(value: TaskPriority) {
    const current = store.filters.priorities
    store.setFilters({
      priorities: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    })
  }

  function toggleLabelFilter(value: TaskLabel) {
    const current = store.filters.labels
    store.setFilters({
      labels: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    })
  }
</script>

<div class="rounded-lg border bg-card p-4 space-y-4">
  <!-- Search -->
  <div class="relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="text"
      placeholder={t('common.search', {}, 'Tìm kiếm...')}
      class="pl-9"
      value={store.filters.search}
      oninput={handleSearchInput}
    />
  </div>

  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <!-- Status filter -->
    <div>
      <p class="text-xs font-medium text-muted-foreground mb-2">
        {t('task.status', {}, 'Trạng thái')}
      </p>
      <div class="flex flex-wrap gap-1">
        {#each metadata.statuses as status}
          <button
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border {store.filters.statuses.includes(status.value)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted border-transparent'}"
            onclick={() => {
              toggleStatusFilter(status.value)
            }}
          >
            {status.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Priority filter -->
    <div>
      <p class="text-xs font-medium text-muted-foreground mb-2">
        {t('task.priority', {}, 'Ưu tiên')}
      </p>
      <div class="flex flex-wrap gap-1">
        {#each metadata.priorities as priority}
          <button
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border {store.filters.priorities.includes(priority.value as TaskPriority)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted border-transparent'}"
            onclick={() => {
              togglePriorityFilter(priority.value as TaskPriority)
            }}
          >
            {priority.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Label filter -->
    <div>
      <p class="text-xs font-medium text-muted-foreground mb-2">
        {t('task.label', {}, 'Nhãn')}
      </p>
      <div class="flex flex-wrap gap-1">
        {#each metadata.labels as label}
          <button
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border {store.filters.labels.includes(label.value as TaskLabel)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted border-transparent'}"
            onclick={() => {
              toggleLabelFilter(label.value as TaskLabel)
            }}
          >
            {label.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Assignee filter -->
    <div>
      <p class="text-xs font-medium text-muted-foreground mb-2">
        {t('task.assignee', {}, 'Người thực hiện')}
      </p>
      <div class="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
        {#each metadata.users as user}
          <button
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border {store.filters.assignees.includes(user.id)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted border-transparent'}"
            onclick={() => {
              const current = store.filters.assignees
              if (current.includes(user.id)) {
                store.setFilters({ assignees: current.filter(a => a !== user.id) })
              } else {
                store.setFilters({ assignees: [...current, user.id] })
              }
            }}
          >
            {user.username}
          </button>
        {/each}
      </div>
    </div>
  </div>
</div>

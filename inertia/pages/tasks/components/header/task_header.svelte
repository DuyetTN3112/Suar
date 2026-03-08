<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import TaskFiltersBar from './task_filters_bar.svelte'
  import DisplayProperties from './display_properties.svelte'
  import {
    LayoutGrid,
    List,
    GanttChart,
    Plus,
    SlidersHorizontal,
    X,
  } from 'lucide-svelte'

  interface Props {
    store: TaskStore
    metadata: {
      statuses: Array<{ value: string; label: string; color?: string }>
      labels: Array<{ value: string; label: string; color?: string }>
      priorities: Array<{ value: string; label: string; color?: string }>
      users: Array<{ id: string; username: string; email: string }>
    }
    onCreateClick: () => void
  }

  const { store, metadata, onCreateClick }: Props = $props()
  const { t } = useTranslation()

  let showFilters = $state(false)
  let showDisplayProperties = $state(false)

  const layouts = [
    { key: 'list' as const, icon: List, label: 'List' },
    { key: 'kanban' as const, icon: LayoutGrid, label: 'Kanban' },
    { key: 'gantt' as const, icon: GanttChart, label: 'Gantt' },
  ]
</script>

<div class="space-y-3">
  <!-- Top Bar -->
  <div class="flex items-center justify-between gap-4">
    <!-- Title -->
    <h1 class="text-xl font-semibold shrink-0">
      {t('task.task_list', {}, 'Quản lý nhiệm vụ')}
    </h1>

    <div class="flex items-center gap-2">
      <!-- Layout Switcher -->
      <div class="flex items-center rounded-md border bg-muted/50 p-0.5">
        {#each layouts as layout}
          <button
            class="inline-flex items-center justify-center rounded-sm px-2.5 py-1.5 text-sm font-medium transition-colors {store.activeLayout === layout.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => { store.setLayout(layout.key); }}
            title={layout.label}
          >
            <layout.icon class="h-4 w-4" />
            <span class="ml-1.5 hidden sm:inline">{layout.label}</span>
          </button>
        {/each}
      </div>

      <!-- Filter Toggle -->
      <Button
        size="sm"
        variant={showFilters ? 'secondary' : 'outline'}
        onclick={() => { showFilters = !showFilters }}
      >
        <SlidersHorizontal class="h-4 w-4 mr-1" />
        {t('common.filter', {}, 'Lọc')}
        {#if store.hasActiveFilters}
          <Badge variant="secondary" class="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
            {store.filteredCount}
          </Badge>
        {/if}
      </Button>

      <!-- Display Properties Toggle -->
      <Button
        size="sm"
        variant={showDisplayProperties ? 'secondary' : 'outline'}
        onclick={() => { showDisplayProperties = !showDisplayProperties }}
      >
        <SlidersHorizontal class="h-4 w-4" />
      </Button>

      <!-- Create Task -->
      <Button size="sm" onclick={onCreateClick}>
        <Plus class="h-4 w-4 mr-1" />
        {t('task.add_task', {}, 'Tạo mới')}
      </Button>
    </div>
  </div>

  <!-- Active Filter Badges -->
  {#if store.hasActiveFilters}
    <div class="flex items-center gap-2 flex-wrap">
      {#each store.filters.statuses as status}
        <Badge variant="outline" class="gap-1">
          {status}
          <button
            class="ml-1 hover:text-destructive"
            onclick={() => { store.setFilters({ statuses: store.filters.statuses.filter(s => s !== status) }); }}
          >
            <X class="h-3 w-3" />
          </button>
        </Badge>
      {/each}
      {#each store.filters.priorities as priority}
        <Badge variant="outline" class="gap-1">
          {priority}
          <button
            class="ml-1 hover:text-destructive"
            onclick={() => { store.setFilters({ priorities: store.filters.priorities.filter(p => p !== priority) }); }}
          >
            <X class="h-3 w-3" />
          </button>
        </Badge>
      {/each}
      {#each store.filters.labels as label}
        <Badge variant="outline" class="gap-1">
          {label}
          <button
            class="ml-1 hover:text-destructive"
            onclick={() => { store.setFilters({ labels: store.filters.labels.filter(l => l !== label) }); }}
          >
            <X class="h-3 w-3" />
          </button>
        </Badge>
      {/each}
      <button class="text-xs text-muted-foreground hover:text-foreground" onclick={() => { store.clearFilters(); }}>
        {t('common.clear_all', {}, 'Xóa tất cả')}
      </button>
    </div>
  {/if}

  <!-- Expandable Filter Bar -->
  {#if showFilters}
    <TaskFiltersBar {store} {metadata} />
  {/if}

  <!-- Display Properties Popover -->
  {#if showDisplayProperties}
    <DisplayProperties {store} />
  {/if}
</div>

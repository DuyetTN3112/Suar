<script lang="ts">
  import {
    SlidersHorizontal,
    X,
  } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import DisplayProperties from './display_properties.svelte'
  import TaskFiltersBar from './task_filters_bar.svelte'

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

<div class="task-board-header-consolidated">
  <!-- Inline filters permanently visible -->
  <div class="task-filters-section">
    <TaskFiltersBar {store} {metadata} />
  </div>

  <!-- Active badges and configuration toolbar -->
  <div class="task-toolbar-section">
    <div class="task-active-badges">
      {#if store.hasActiveFilters}
        <span class="active-label">Đang lọc:</span>
        {#each store.filters.statuses as status}
          {@const label = metadata.statuses.find(s => s.value === status)?.label ?? status}
          <Badge variant="outline" class="badge-item">
            {label}
            <button
              type="button"
              class="badge-close-btn"
              aria-label="Xoa bo loc trang thai"
              onclick={() => { store.setFilters({ statuses: store.filters.statuses.filter(s => s !== status) }); }}
            >
              <X class="h-3 w-3" />
            </button>
          </Badge>
        {/each}
        {#each store.filters.priorities as priority}
          {@const label = metadata.priorities.find(p => p.value === priority)?.label ?? priority}
          <Badge variant="outline" class="badge-item">
            {label}
            <button
              type="button"
              class="badge-close-btn"
              aria-label="Xoa bo loc uu tien"
              onclick={() => { store.setFilters({ priorities: store.filters.priorities.filter(p => p !== priority) }); }}
            >
              <X class="h-3 w-3" />
            </button>
          </Badge>
        {/each}
        {#each store.filters.labels as labelValue}
          {@const label = metadata.labels.find(l => l.value === labelValue)?.label ?? labelValue}
          <Badge variant="outline" class="badge-item">
            {label}
            <button
              type="button"
              class="badge-close-btn"
              aria-label="Xoa bo loc nhan"
              onclick={() => { store.setFilters({ labels: store.filters.labels.filter(l => l !== labelValue) }); }}
            >
              <X class="h-3 w-3" />
            </button>
          </Badge>
        {/each}
        {#each store.filters.assignees as assigneeId}
          {@const user = metadata.users.find(u => u.id === assigneeId)}
          {#if user}
            <Badge variant="outline" class="badge-item">
              {user.username}
              <button
                type="button"
                class="badge-close-btn"
                aria-label="Xoa bo loc nguoi thuc hien"
                onclick={() => { store.setFilters({ assignees: store.filters.assignees.filter(id => id !== assigneeId) }); }}
              >
                <X class="h-3 w-3" />
              </button>
            </Badge>
          {/if}
        {/each}
        
        <button
          type="button"
          class="clear-all-btn"
          onclick={() => { store.clearFilters(); }}
        >
          {t('common.clear_all', {}, 'Xóa tất cả bộ lọc')}
        </button>
      {/if}
    </div>

    <div class="task-config-tools">
      <Button
        size="sm"
        variant={showDisplayProperties ? 'secondary' : 'outline'}
        onclick={() => { showDisplayProperties = !showDisplayProperties }}
        aria-label="Tuy chinh hien thi task"
        class="customize-display-btn"
      >
        <SlidersHorizontal class="h-3.5 w-3.5 mr-1.5" />
        Hiển thị cột
      </Button>
    </div>
  </div>

  {#if showDisplayProperties}
    <div class="task-display-props-panel">
      <DisplayProperties {store} />
    </div>
  {/if}
</div>

<style>
  .task-board-header-consolidated {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
    margin-bottom: 4px;
  }

  .task-filters-section {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 8px 12px;
  }

  .task-toolbar-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .task-active-badges {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .active-label {
    font-size: 11px;
    font-weight: 750;
    color: var(--suar-ink-56);
    margin-right: 2px;
  }

  :global(.badge-item) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--border) !important;
    border-radius: 99px !important;
    background: var(--suar-white) !important;
    color: var(--suar-black) !important;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    height: auto;
  }

  .badge-close-btn {
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    color: var(--suar-ink-56);
    transition: color 0.15s var(--ease-suar);
  }

  .badge-close-btn:hover {
    color: var(--suar-orange);
  }

  .clear-all-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 11px;
    font-weight: 800;
    color: var(--suar-orange);
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.15s var(--ease-suar);
  }

  .clear-all-btn:hover {
    background: var(--suar-orange-06);
  }

  .task-config-tools {
    display: flex;
    align-items: center;
    margin-left: auto;
  }

  .task-config-tools :global(.customize-display-btn) {
    min-height: auto;
    height: 32px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--suar-white);
    color: var(--suar-black);
    box-shadow: var(--shadow-suar-hairline);
    transition: all 0.15s var(--ease-suar);
  }

  .task-config-tools :global(.customize-display-btn:hover) {
    border-color: var(--suar-orange);
    background: var(--suar-orange-06);
    color: var(--suar-orange);
    transform: translateY(-0.5px);
  }

  .task-display-props-panel {
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--suar-white);
    padding: 12px;
    box-shadow: 0 4px 12px rgba(17,17,17,0.04);
  }
</style>

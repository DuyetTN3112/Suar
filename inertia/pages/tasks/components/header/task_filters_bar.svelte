<script lang="ts">
  import { Search } from 'lucide-svelte'

  import Input from '@/components/ui/input.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import type { TaskPriority, TaskLabel } from '../../types.svelte'

  interface Props {
    store: TaskStore
    metadata: {
      statuses: {
        value: string
        label: string
        slug?: string
        category?: string
      }[]
      labels: { value: string; label: string }[]
      priorities: { value: string; label: string }[]
      users: { id: string; username: string; email: string }[]
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

  function toggleUserFilter(userId: string) {
    const current = store.filters.assignees
    if (current.includes(userId)) {
      store.setFilters({ assignees: current.filter((id) => id !== userId) })
    } else {
      store.setFilters({ assignees: [...current, userId] })
    }
  }

  function getUserInitials(username: string): string {
    if (!username) return '?'
    const parts = username.split(/[\s._-]+/)
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
    }
    return username.slice(0, 2).toUpperCase()
  }

  function getAvatarBgColor(username: string): string {
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      hash += username.charCodeAt(i)
    }
    const colors = [
      '#FF7A1A', // suar-orange
      '#10B981', // emerald
      '#3B82F6', // blue
      '#8B5CF6', // violet
      '#EC4899', // pink
      '#F59E0B', // amber
      '#06B6D4', // cyan
      '#6366F1', // indigo
    ]
    return colors[hash % colors.length]
  }

  function getPriorityColor(value: string): string {
    switch (value) {
      case 'urgent': return '#EF4444' // red
      case 'high': return '#F59E0B' // orange
      case 'medium': return '#3B82F6' // blue
      case 'low': return '#9CA3AF' // gray
      default: return '#6B7280'
    }
  }
</script>

<div class="task-filters-card">
  <!-- Search -->
  <div class="filter-search-container">
    <Search class="search-icon" />
    <Input
      type="text"
      placeholder={t('common.search', {}, 'Tìm kiếm nhiệm vụ...')}
      class="search-input-field"
      value={store.filters.search}
      oninput={handleSearchInput}
    />
  </div>

  <div class="filters-flex-row">
    <!-- Assignee (Avatars) -->
    <div class="filter-section-horizontal">
      <span class="filter-label">Thành viên:</span>
      <div class="avatars-row">
        {#each metadata.users as user}
          {@const isSelected = store.filters.assignees.includes(user.id)}
          <button
            type="button"
            class="avatar-btn"
            class:is-active={isSelected}
            style="background-color: {getAvatarBgColor(user.username)}"
            onclick={() => { toggleUserFilter(user.id); }}
          >
            <span class="avatar-text">{getUserInitials(user.username)}</span>
            {#if isSelected}
              <span class="avatar-check-badge">✓</span>
            {/if}
            <!-- Custom Tooltip -->
            <span class="avatar-tooltip">
              <span class="tooltip-name">{user.username}</span>
              <span class="tooltip-email">{user.email}</span>
            </span>
          </button>
        {/each}
        {#if metadata.users.length === 0}
          <span class="no-users-text">Không có thành viên</span>
        {/if}
      </div>
    </div>

    <!-- Status filter -->
    <details class="filter-dropdown">
      <summary class="filter-dropdown-trigger">
        <span>{t('task.status', {}, 'Trạng thái')}</span>
        {#if store.filters.statuses.length > 0}
          <span class="active-badge">{store.filters.statuses.length}</span>
        {/if}
        <span class="arrow">⌄</span>
      </summary>
      <div class="filter-dropdown-content">
        {#each metadata.statuses as status}
          {@const isSelected = store.filters.statuses.includes(status.value)}
          <button
            type="button"
            class="dropdown-item"
            class:is-active={isSelected}
            onclick={() => { toggleStatusFilter(status.value); }}
          >
            <span class="check-box">{#if isSelected}✓{/if}</span>
            <span class="item-label">{status.label}</span>
          </button>
        {/each}
      </div>
    </details>

    <!-- Priority filter -->
    <details class="filter-dropdown">
      <summary class="filter-dropdown-trigger">
        <span>{t('task.priority', {}, 'Mức độ ưu tiên')}</span>
        {#if store.filters.priorities.length > 0}
          <span class="active-badge">{store.filters.priorities.length}</span>
        {/if}
        <span class="arrow">⌄</span>
      </summary>
      <div class="filter-dropdown-content">
        {#each metadata.priorities as priority}
          {@const isSelected = store.filters.priorities.includes(priority.value as TaskPriority)}
          <button
            type="button"
            class="dropdown-item"
            class:is-active={isSelected}
            onclick={() => { togglePriorityFilter(priority.value as TaskPriority); }}
          >
            <span class="check-box">{#if isSelected}✓{/if}</span>
            <span class="status-dot" style="background-color: {getPriorityColor(priority.value)}"></span>
            <span class="item-label">{priority.label}</span>
          </button>
        {/each}
      </div>
    </details>

    <!-- Label filter -->
    <details class="filter-dropdown">
      <summary class="filter-dropdown-trigger">
        <span>{t('task.label', {}, 'Nhãn công việc')}</span>
        {#if store.filters.labels.length > 0}
          <span class="active-badge">{store.filters.labels.length}</span>
        {/if}
        <span class="arrow">⌄</span>
      </summary>
      <div class="filter-dropdown-content">
        {#each metadata.labels as label}
          {@const isSelected = store.filters.labels.includes(label.value as TaskLabel)}
          <button
            type="button"
            class="dropdown-item"
            class:is-active={isSelected}
            onclick={() => { toggleLabelFilter(label.value as TaskLabel); }}
          >
            <span class="check-box">{#if isSelected}✓{/if}</span>
            <span class="item-label">{label.label}</span>
          </button>
        {/each}
      </div>
    </details>
  </div>
</div>

<style>
  .task-filters-card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    background: transparent;
    width: 100%;
  }

  .filter-search-container {
    position: relative;
    width: 220px;
    flex-shrink: 0;
  }

  :global(.search-icon) {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    height: 14px;
    width: 14px;
    color: var(--suar-ink-56);
    pointer-events: none;
  }

  .filter-search-container :global(.search-input-field) {
    padding-left: 30px;
    height: 32px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--suar-white);
    box-shadow: var(--shadow-suar-hairline);
    font-size: 12px;
    transition: all 0.2s var(--ease-suar);
  }

  .filter-search-container :global(.search-input-field:focus) {
    border-color: var(--suar-orange);
    outline: none;
    box-shadow: 0 0 0 3px rgba(255, 122, 26, 0.12);
  }

  .filters-flex-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .filter-section-horizontal {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--suar-ink-56);
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .avatars-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .avatar-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid rgba(22, 19, 15, 0.08);
    cursor: pointer;
    transition: all 0.2s var(--ease-suar);
    box-shadow: var(--shadow-suar-hairline);
  }

  .avatar-btn:hover {
    transform: scale(1.08) translateY(-1px);
    z-index: 10;
  }

  .avatar-btn.is-active {
    box-shadow: 0 0 0 2px var(--suar-white), 0 0 0 3px var(--suar-orange);
    transform: scale(1.08);
    z-index: 5;
  }

  .avatar-text {
    font-size: 9px;
    font-weight: 700;
    color: var(--suar-white);
    letter-spacing: -0.02em;
    user-select: none;
  }

  .avatar-check-badge {
    position: absolute;
    bottom: -3px;
    right: -3px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--suar-orange);
    color: var(--suar-white);
    font-size: 7px;
    font-weight: 900;
    border: 1px solid var(--suar-white);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  /* HTML Tooltip */
  .avatar-tooltip {
    position: absolute;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    display: flex;
    flex-direction: column;
    background: var(--suar-black);
    color: var(--suar-white);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: all 0.2s var(--ease-suar);
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    z-index: 50;
  }

  .avatar-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: var(--suar-black);
  }

  .avatar-btn:hover .avatar-tooltip {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  .tooltip-name {
    font-weight: 750;
  }

  .tooltip-email {
    font-size: 9.5px;
    color: var(--suar-ink-36);
  }

  .no-users-text {
    font-size: 11px;
    color: var(--suar-ink-56);
    font-style: italic;
  }

  /* Dropdown styling */
  .filter-dropdown {
    position: relative;
    display: inline-block;
  }

  .filter-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    height: 32px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 8px;
    background: var(--suar-white);
    border: 1px solid var(--border);
    color: var(--suar-black);
    cursor: pointer;
    transition: all 0.15s var(--ease-suar);
    box-shadow: var(--shadow-suar-hairline);
    list-style: none;
    user-select: none;
  }

  .filter-dropdown-trigger::-webkit-details-marker {
    display: none;
  }

  .filter-dropdown-trigger:hover {
    border-color: var(--suar-orange);
    color: var(--suar-orange);
    background: var(--suar-orange-06);
  }

  .active-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--suar-orange);
    color: var(--suar-white);
    font-size: 10px;
    font-weight: 800;
    border-radius: 99px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
  }

  .arrow {
    font-size: 9px;
    color: var(--suar-ink-36);
  }

  .filter-dropdown-content {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: var(--suar-white);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 6px;
    min-width: 176px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 500;
    text-align: left;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--suar-black);
    cursor: pointer;
    transition: background 0.15s var(--ease-suar);
  }

  .dropdown-item:hover {
    background: var(--suar-ink-02);
  }

  .dropdown-item.is-active {
    background: var(--suar-orange-06);
    color: var(--suar-orange);
    font-weight: 600;
  }

  .check-box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border: 1.5px solid var(--border);
    border-radius: 3px;
    font-size: 9px;
    color: var(--suar-orange);
    background: var(--suar-white);
    flex-shrink: 0;
  }

  .dropdown-item.is-active .check-box {
    border-color: var(--suar-orange);
    background: var(--suar-orange);
    color: var(--suar-white);
  }

  /* Indicator lights */
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
</style>

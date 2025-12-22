<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'
import { TASKS_UI } from '@/apps/user/modules/tasks/constants/tasks'

  import { createTaskModalsStore } from '@/apps/user/modules/tasks/hooks/use_task_modals.svelte'
  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
  import { getCurrentUserInfo } from '@/apps/user/modules/tasks/utils/task_permissions.svelte'
  import { createTaskSelectionStore, createTaskExpansionStore, showTasksWithChildren } from '@/apps/user/modules/tasks/utils/task_state.svelte'

  import TaskList from '@/apps/user/modules/tasks/components/task_list/task_list.svelte'
  import TaskListPagination from '@/apps/user/modules/tasks/components/task_list/task_list_pagination.svelte'



  interface Props {
    baseRoute?: string
    tasks: {
      data: TaskDetail[]
      meta: {
        total: number
        per_page: number
        current_page: number
        last_page: number
      }
    }
    filters: {
      status?: string
      priority?: string
      label?: string
      search?: string
      assigned_to?: string
      parent_task_id?: string
      metadata?: {
        statuses: { value: string; label: string; color: string }[]
        priorities: { value: string; label: string; color: string }[]
        labels: { value: string; label: string; color: string }[]
        users: { id: string; username: string; email: string }[]
      }
    }
    activeTab: string
    completedStatusId?: string
    pendingStatusId?: string
    onToggleStatus: (task: TaskDetail, newStatus: string) => void
    formatDate: (dateString: string) => string
    onViewTaskDetail?: (task: TaskDetail) => void
  }

  const {
    baseRoute = FRONTEND_ROUTES.TASKS,
    tasks,
    filters,
    completedStatusId,
    formatDate,
    onViewTaskDetail
  }: Props = $props()

  const serverRowsPerPage = $derived(tasks.meta.per_page || TASKS_UI.DEFAULT_ROWS_PER_PAGE)
  let rowsPerPage = $state<number>(TASKS_UI.DEFAULT_ROWS_PER_PAGE)

  // Local task UI stores.
  const selectionStore = createTaskSelectionStore()
  const expansionStore = createTaskExpansionStore()
  const modalsStore = createTaskModalsStore()

  // Current user info.
  const currentUserInfo = getCurrentUserInfo()

  $effect(() => {
    rowsPerPage = serverRowsPerPage
  })

  // Handle rows-per-page changes.
  const handleRowsPerPageChange = (e: Event) => {
    const target = e.target as HTMLSelectElement
    const newRowsPerPage = parseInt(target.value)
    rowsPerPage = newRowsPerPage

    router.get(baseRoute, {
      ...filters,
      per_page: newRowsPerPage,
      page: 1
    }, {
      preserveState: true
    })
  }

  // Guard clause - Ensure tasks.data is always an array
  const safeTasksData = $derived(tasks.data)

  // Rows to display: parent-only or parent plus children.
  const tasksToShow = $derived(showTasksWithChildren(safeTasksData, filters.parent_task_id))

  // Open task detail on row click.
  const handleTaskClick = (task: TaskDetail) => {
    if (onViewTaskDetail) {
      onViewTaskDetail(task)
    } else {
      modalsStore.handleDetailClick(task)
    }
  }
</script>

<div class="bg-background rounded-md border shadow-sm">
  <div class="p-0">
    <div class="rounded-md border">
      <TaskList
        tasks={tasksToShow}
        selectedTasks={selectionStore.selectedTasks}
        expandedTasks={expansionStore.expandedTasks}
        isTaskSelected={selectionStore.isTaskSelected}
        isAllSelected={selectionStore.isAllSelected(tasksToShow)}
        handleSelectAll={(checked: boolean) => {
          selectionStore.handleSelectAll(tasksToShow, checked)
        }}
        handleSelectTask={selectionStore.handleSelectTask}
        toggleExpandTask={expansionStore.toggleExpandTask}
        isTaskExpanded={expansionStore.isTaskExpanded}
        currentUserInfo={currentUserInfo}
        {completedStatusId}
        {formatDate}
        onTaskClick={handleTaskClick}
      />

      <TaskListPagination
        {baseRoute}
        meta={tasks.meta}
        {rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        {filters}
      />
    </div>
  </div>
</div>

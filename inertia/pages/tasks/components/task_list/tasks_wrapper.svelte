<script lang="ts">
  import type { Task } from '../../types.svelte'
  import { router } from '@inertiajs/svelte'
  import TaskList from './task_list.svelte'
  import TaskListPagination from './task_list_pagination.svelte'
  import { createTaskSelectionStore, createTaskExpansionStore, showTasksWithChildren } from '../../utils/task_state.svelte'
  import { getCurrentUserInfo } from '../../utils/task_permissions.svelte'
  import { createTaskModalsStore } from '../../hooks/use_task_modals.svelte'

  interface Props {
    tasks: {
      data: Task[]
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
        statuses: Array<{ id: number; name: string; color: string }>
        priorities: Array<{ id: number; name: string; color: string; value: number }>
        labels: Array<{ id: number; name: string; color: string }>
        users: Array<{ id: number; username: string; email: string }>
      }
    }
    activeTab: string
    completedStatusId?: number
    pendingStatusId?: number
    onToggleStatus: (task: Task, newStatusId: number) => void
    formatDate: (dateString: string) => string
    onViewTaskDetail?: (task: Task) => void
  }

  const {
    tasks,
    filters,
    completedStatusId,
    formatDate,
    onViewTaskDetail
  }: Props = $props()

  let rowsPerPage = $state(10)

  // Sử dụng stores
  const selectionStore = createTaskSelectionStore()
  const expansionStore = createTaskExpansionStore()
  const modalsStore = createTaskModalsStore()

  // Lấy thông tin người dùng hiện tại
  const currentUserInfo = getCurrentUserInfo()

  // Xử lý thay đổi số dòng mỗi trang
  const handleRowsPerPageChange = (e: Event) => {
    const target = e.target as HTMLSelectElement
    const newRowsPerPage = parseInt(target.value)
    rowsPerPage = newRowsPerPage

    router.get('/tasks', {
      ...filters,
      per_page: newRowsPerPage,
      page: 1
    }, {
      preserveState: true
    })
  }

  // Guard clause - Ensure tasks.data is always an array
  const safeTasksData = $derived(tasks?.data || [])

  // Lấy danh sách tasks để hiển thị (chỉ cha hoặc cả cha và con)
  const tasksToShow = $derived(showTasksWithChildren(safeTasksData, filters.parent_task_id))

  // Xử lý khi click vào task để xem chi tiết
  const handleTaskClick = (task: Task) => {
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
        handleSelectAll={(checked) => { selectionStore.handleSelectAll(tasksToShow, checked) }}
        handleSelectTask={selectionStore.handleSelectTask}
        toggleExpandTask={expansionStore.toggleExpandTask}
        isTaskExpanded={expansionStore.isTaskExpanded}
        currentUserInfo={currentUserInfo}
        {completedStatusId}
        {formatDate}
        onTaskClick={handleTaskClick}
      />

      <TaskListPagination
        meta={tasks.meta}
        {rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        {filters}
      />
    </div>
  </div>
</div>

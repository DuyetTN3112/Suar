import { router } from '@inertiajs/svelte'
import { FILTER_VALUES, FRONTEND_ROUTES } from '@/constants'

export interface TaskFilters {
  task_status_id?: string
  status?: string
  priority?: string
  label?: string
  search?: string
  assigned_to?: string
  parent_task_id?: string
}

export interface TaskMetadata {
  statuses: Array<{ value: string; label: string; color: string }>
  priorities: Array<{ value: string; label: string; color: string }>
  labels: Array<{ value: string; label: string; color: string }>
  users: Array<{
    id: string
    username: string
    email: string
  }>
}

export function createTaskFiltersStore(initialFilters: TaskFilters, metadata: TaskMetadata) {
  let searchQuery = $state(initialFilters.search || '')
  let selectedStatus = $state(
    initialFilters.task_status_id || initialFilters.status || FILTER_VALUES.ALL
  )
  let selectedPriority = $state(initialFilters.priority || FILTER_VALUES.ALL)
  let selectedAssignee = $state(initialFilters.assigned_to || FILTER_VALUES.ALL)
  let selectedLabel = $state(initialFilters.label || FILTER_VALUES.ALL)
  let activeTab = $state<string>(FILTER_VALUES.ALL)
  let searchTimeout: number | null = null

  // Tìm value của trạng thái completed và pending
  const completedStatusId = $derived(
    metadata.statuses.find(
      (status) =>
        status.value.toLowerCase().includes('done') ||
        status.label.toLowerCase().includes('complete') ||
        status.label.toLowerCase().includes('hoàn thành')
    )?.value
  )

  const pendingStatusId = $derived(
    metadata.statuses.find(
      (status) =>
        status.value.toLowerCase().includes('pending') ||
        status.label.toLowerCase().includes('wait') ||
        status.label.toLowerCase().includes('chờ')
    )?.value
  )

  // Hàm gửi request tìm kiếm
  function sendSearchRequest(query: string) {
    router.get(
      FRONTEND_ROUTES.TASKS,
      {
        ...initialFilters,
        search: query,
        page: 1,
      },
      {
        preserveState: true,
        only: ['tasks'],
      }
    )
  }

  // Tìm kiếm tasks với debounce
  function handleSearch(query: string) {
    searchQuery = query

    // Hủy timeout trước đó nếu có
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // Nếu query rỗng, tìm kiếm ngay lập tức
    if (!query.trim()) {
      sendSearchRequest(query)
      return
    }

    // Debounce search query
    searchTimeout = setTimeout(() => {
      sendSearchRequest(query)
    }, 300) as unknown as number
  }

  // Lọc theo trạng thái
  function handleStatusChange(status: string) {
    selectedStatus = status

    router.get(
      FRONTEND_ROUTES.TASKS,
      {
        ...initialFilters,
        task_status_id: status === FILTER_VALUES.ALL ? '' : status,
        status: '',
        page: 1,
      },
      {
        preserveState: true,
        only: ['tasks'],
      }
    )
  }

  // Lọc theo mức độ ưu tiên
  function handlePriorityChange(priority: string) {
    selectedPriority = priority

    router.get(
      FRONTEND_ROUTES.TASKS,
      {
        ...initialFilters,
        priority: priority === FILTER_VALUES.ALL ? '' : priority,
        page: 1,
      },
      {
        preserveState: true,
        only: ['tasks'],
      }
    )
  }

  // Lọc theo assignee
  function handleAssigneeChange(assignee: string) {
    selectedAssignee = assignee

    router.get(
      FRONTEND_ROUTES.TASKS,
      {
        ...initialFilters,
        assigned_to: assignee === FILTER_VALUES.ALL ? '' : assignee,
        page: 1,
      },
      {
        preserveState: true,
        only: ['tasks'],
      }
    )
  }

  // Lọc theo label
  function handleLabelChange(label: string) {
    selectedLabel = label

    router.get(
      FRONTEND_ROUTES.TASKS,
      {
        ...initialFilters,
        label: label === FILTER_VALUES.ALL ? '' : label,
        page: 1,
      },
      {
        preserveState: true,
        only: ['tasks'],
      }
    )
  }

  // Thay đổi tab (all, my-tasks, assigned-to-me)
  function handleTabChange(tab: string) {
    activeTab = tab

    // Tùy thuộc vào tab, có thể thêm logic filter khác nhau
    const authWindow = window as Window & {
      auth?: {
        user?: {
          id?: string | number
        }
      }
    }
    const rawCurrentUserId = authWindow.auth?.user?.id
    const currentUserId =
      typeof rawCurrentUserId === 'string'
        ? rawCurrentUserId
        : typeof rawCurrentUserId === 'number'
          ? String(rawCurrentUserId)
          : undefined

    const filters: TaskFilters = { ...initialFilters }

    if (tab === 'my-tasks') {
      filters.assigned_to = currentUserId
    } else if (tab === 'assigned-to-me') {
      filters.assigned_to = currentUserId
    }

    router.get(
      FRONTEND_ROUTES.TASKS,
      {
        ...filters,
        page: 1,
      },
      {
        preserveState: true,
        only: ['tasks'],
      }
    )
  }

  // Cleanup
  $effect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
    }
  })

  return {
    get searchQuery() {
      return searchQuery
    },
    set searchQuery(value: string) {
      searchQuery = value
    },
    get selectedStatus() {
      return selectedStatus
    },
    set selectedStatus(value: string) {
      selectedStatus = value
    },
    get selectedPriority() {
      return selectedPriority
    },
    set selectedPriority(value: string) {
      selectedPriority = value
    },
    get selectedAssignee() {
      return selectedAssignee
    },
    set selectedAssignee(value: string) {
      selectedAssignee = value
    },
    get selectedLabel() {
      return selectedLabel
    },
    set selectedLabel(value: string) {
      selectedLabel = value
    },
    get activeTab() {
      return activeTab
    },
    set activeTab(value: string) {
      activeTab = value
    },
    get completedStatusId() {
      return completedStatusId
    },
    get pendingStatusId() {
      return pendingStatusId
    },
    handleSearch,
    handleStatusChange,
    handlePriorityChange,
    handleAssigneeChange,
    handleLabelChange,
    handleTabChange,
  }
}

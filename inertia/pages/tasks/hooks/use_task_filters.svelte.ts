import { router } from '@inertiajs/svelte'

export interface TaskFilters {
  status?: string
  priority?: string
  label?: string
  search?: string
  assigned_to?: string
  parent_task_id?: string
}

export interface TaskMetadata {
  statuses: Array<{ id: number; name: string; color: string }>
  priorities: Array<{ id: number; name: string; color: string; value: number }>
  labels: Array<{ id: number; name: string; color: string }>
  users: Array<{
    id: number
    username: string
    email: string
  }>
}

export function createTaskFiltersStore(initialFilters: TaskFilters, metadata: TaskMetadata) {
  let searchQuery = $state(initialFilters.search || '')
  let selectedStatus = $state(initialFilters.status || 'all')
  let selectedPriority = $state(initialFilters.priority || 'all')
  let selectedAssignee = $state(initialFilters.assigned_to || 'all')
  let selectedLabel = $state(initialFilters.label || 'all')
  let activeTab = $state('all')
  let searchTimeout: number | null = null

  // Tìm ID của trạng thái completed và pending
  const completedStatusId = $derived(
    metadata.statuses.find(
      (status) =>
        status.name.toLowerCase().includes('done') ||
        status.name.toLowerCase().includes('complete') ||
        status.name.toLowerCase().includes('hoàn thành')
    )?.id
  )

  const pendingStatusId = $derived(
    metadata.statuses.find(
      (status) =>
        status.name.toLowerCase().includes('pending') ||
        status.name.toLowerCase().includes('wait') ||
        status.name.toLowerCase().includes('chờ')
    )?.id
  )

  // Hàm gửi request tìm kiếm
  function sendSearchRequest(query: string) {
    router.get(
      '/tasks',
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
      '/tasks',
      {
        ...initialFilters,
        status: status === 'all' ? '' : status,
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
      '/tasks',
      {
        ...initialFilters,
        priority: priority === 'all' ? '' : priority,
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
      '/tasks',
      {
        ...initialFilters,
        assigned_to: assignee === 'all' ? '' : assignee,
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
      '/tasks',
      {
        ...initialFilters,
        label: label === 'all' ? '' : label,
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
    const currentUserId = (window as any).auth?.user?.id

    const filters: TaskFilters = { ...initialFilters }

    if (tab === 'my-tasks') {
      filters.assigned_to = currentUserId?.toString()
    } else if (tab === 'assigned-to-me') {
      filters.assigned_to = currentUserId?.toString()
    }

    router.get(
      '/tasks',
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

import type { Task } from '../types.svelte'

export function createTaskSelectionStore() {
  let selectedTasks = $state<string[]>([])

  function handleSelectAll(tasks: Task[], checked: boolean) {
    if (checked) {
      const allTaskIds = tasks.map((task) => task.id)
      selectedTasks = allTaskIds
    } else {
      selectedTasks = []
    }
  }

  function handleSelectTask(taskId: string, checked: boolean) {
    if (checked) {
      selectedTasks = [...selectedTasks, taskId]
    } else {
      selectedTasks = selectedTasks.filter((id) => id !== taskId)
    }
  }

  function isTaskSelected(taskId: string): boolean {
    return selectedTasks.includes(taskId)
  }

  function isAllSelected(tasks: Task[]): boolean {
    return tasks.length > 0 && selectedTasks.length === tasks.length
  }

  return {
    get selectedTasks() {
      return selectedTasks
    },
    set selectedTasks(value: string[]) {
      selectedTasks = value
    },
    handleSelectAll,
    handleSelectTask,
    isTaskSelected,
    isAllSelected,
  }
}

export function createTaskExpansionStore() {
  let expandedTasks = $state<string[]>([])

  function toggleExpandTask(taskId: string) {
    if (expandedTasks.includes(taskId)) {
      expandedTasks = expandedTasks.filter((id) => id !== taskId)
    } else {
      expandedTasks = [...expandedTasks, taskId]
    }
  }

  function isTaskExpanded(taskId: string): boolean {
    return expandedTasks.includes(taskId)
  }

  return {
    get expandedTasks() {
      return expandedTasks
    },
    set expandedTasks(value: string[]) {
      expandedTasks = value
    },
    toggleExpandTask,
    isTaskExpanded,
  }
}

export function filterParentTasks(tasks: Task[] | undefined): Task[] {
  if (!tasks || !Array.isArray(tasks)) {
    console.warn('filterParentTasks: tasks is undefined or not an array', tasks)
    return []
  }
  return tasks.filter((task) => !task.parent_task_id)
}

export function showTasksWithChildren(tasks: Task[] | undefined, parent_task_id?: string): Task[] {
  if (!tasks || !Array.isArray(tasks)) {
    console.warn('showTasksWithChildren: tasks is undefined or not an array', tasks)
    return []
  }

  if (parent_task_id) {
    return tasks
  } else {
    return filterParentTasks(tasks)
  }
}

import { useState } from 'react'
import { Task } from '../types'
import { getCurrentUserInfo } from './task_permissions'

export const useTaskSelection = () => {
  const [selectedTasks, setSelectedTasks] = useState<number[]>([])
  // Xử lý chọn/bỏ chọn tất cả tasks
  const handleSelectAll = (tasks: Task[], checked: boolean) => {
    if (checked) {
      // Chọn tất cả task
      const allTaskIds = tasks.map((task) => task.id)
      setSelectedTasks(allTaskIds)
    } else {
      // Bỏ chọn tất cả
      setSelectedTasks([])
    }
  }
  // Xử lý chọn/bỏ chọn một task
  const handleSelectTask = (taskId: number, checked: boolean) => {
    if (checked) {
      setSelectedTasks((prev) => [...prev, taskId])
    } else {
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId))
    }
  }

  // Kiểm tra xem một task có được chọn không
  const isTaskSelected = (taskId: number) => {
    return selectedTasks.includes(taskId)
  }
  // Kiểm tra có chọn tất cả hay không
  const isAllSelected = (tasks: Task[]) => {
    return tasks.length > 0 && selectedTasks.length === tasks.length
  }
  return {
    selectedTasks,
    setSelectedTasks,
    handleSelectAll,
    handleSelectTask,
    isTaskSelected,
    isAllSelected,
  }
}

export const useTaskExpansion = () => {
  const [expandedTasks, setExpandedTasks] = useState<number[]>([])
  // Xử lý mở rộng/thu gọn task
  const toggleExpandTask = (taskId: number) => {
    if (expandedTasks.includes(taskId)) {
      setExpandedTasks(expandedTasks.filter((id) => id !== taskId))
    } else {
      setExpandedTasks([...expandedTasks, taskId])
    }
  }

  // Kiểm tra task có đang mở rộng không
  const isTaskExpanded = (taskId: number) => {
    return expandedTasks.includes(taskId)
  }
  return {
    expandedTasks,
    setExpandedTasks,
    toggleExpandTask,
    isTaskExpanded,
  }
}

export const useTaskFiltering = () => {
  // Lọc để hiển thị task cha (không có parent_task_id)
  const filterParentTasks = (tasks: Task[]) => {
    return tasks.filter((task) => !task.parent_task_id)
  }

  // Lọc hiển thị task cha và task con
  const showTasksWithChildren = (tasks: Task[], parent_task_id?: string) => {
    if (parent_task_id) {
      // Nếu đang xem theo parent_task_id, hiển thị tất cả task con
      return tasks
    } else {
      // Mặc định chỉ hiển thị task cha (không có parent_task_id)
      return filterParentTasks(tasks)
    }
  }
  return {
    filterParentTasks,
    showTasksWithChildren,
  }
}

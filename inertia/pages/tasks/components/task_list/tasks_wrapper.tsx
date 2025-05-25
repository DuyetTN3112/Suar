import React, { useState } from 'react'
import type { Task } from '../../types'
import { router } from '@inertiajs/react'
import { TaskList } from './task_list'
import { TaskListPagination } from './task_list_pagination'
import { useTaskSelection, useTaskExpansion, useTaskFiltering } from '../../utils/task_state'
import { getCurrentUserInfo } from '../../utils/task_permissions'
import { useTaskModals } from '../../hooks/use_task_modals'

type TasksWrapperProps = {
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

export function TasksWrapper({
  tasks,
  filters,

  completedStatusId,

  onToggleStatus,
  formatDate,
  onViewTaskDetail
}: TasksWrapperProps) {
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sử dụng custom hooks đã tạo
  const {
    selectedTasks,
    handleSelectAll,
    handleSelectTask,
    isTaskSelected,
    isAllSelected
  } = useTaskSelection();

  const {
    expandedTasks,
    toggleExpandTask,
    isTaskExpanded
  } = useTaskExpansion();

  const { showTasksWithChildren } = useTaskFiltering();

  // Lấy thông tin người dùng hiện tại
  const currentUserInfo = getCurrentUserInfo();

  // Sử dụng hook modal
  const { handleDetailClick } = useTaskModals();

  // Xử lý thay đổi số dòng mỗi trang
  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(e.target.value);
    setRowsPerPage(newRowsPerPage);

    router.get('/tasks', {
      ...filters,
      per_page: newRowsPerPage,
      page: 1
    }, {
      preserveState: true
    });
  };

  // ✅ Guard clause - Ensure tasks.data is always an array
  const safeTasksData = tasks?.data || []

  // Lấy danh sách tasks để hiển thị (chỉ cha hoặc cả cha và con)
  const tasksToShow = showTasksWithChildren(safeTasksData, filters.parent_task_id);

  // Xử lý khi click vào task để xem chi tiết
  const handleTaskClick = (task: Task) => {
    if (onViewTaskDetail) {
      onViewTaskDetail(task);
    } else {
      // Sử dụng modal thay vì chuyển hướng
      handleDetailClick(task);
    }
  };

  return (
    <div className="bg-background rounded-md border shadow-sm">
      <div className="p-0">
        <div className="rounded-md border">
          <TaskList
            tasks={tasksToShow}
            selectedTasks={selectedTasks}
            expandedTasks={expandedTasks}
            isTaskSelected={isTaskSelected}
            isAllSelected={isAllSelected(tasksToShow)}
            handleSelectAll={(checked: boolean) => handleSelectAll(tasksToShow, checked)}
            handleSelectTask={handleSelectTask}
            toggleExpandTask={toggleExpandTask}
            isTaskExpanded={isTaskExpanded}
            currentUserInfo={currentUserInfo}
            completedStatusId={completedStatusId}
            formatDate={formatDate}
            onToggleStatus={onToggleStatus}
            onTaskClick={handleTaskClick}
          />

          <TaskListPagination
            meta={tasks.meta}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleRowsPerPageChange}
            filters={filters}
          />
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Task } from '../types'
import { router } from '@inertiajs/react'
import { useTaskFilters } from './use_task_filters'
import { useTaskModals } from './use_task_modals'

type TasksStateProps = {
  initialTasks: {
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
  }
  metadata: {
    statuses: Array<{ id: number; name: string; color: string }>
    priorities: Array<{ id: number; name: string; color: string; value: number }>
    labels: Array<{ id: number; name: string; color: string }>
    users: Array<{
      id: number
      first_name: string
      last_name: string
      full_name: string
    }>
  }
}

export function useTaskState({ initialTasks, filters, metadata }: TasksStateProps) {
  // Sử dụng các hooks đã tách
  const taskFilters = useTaskFilters({ initialFilters: filters, metadata });
  const taskModals = useTaskModals();
  
  // Lấy các giá trị và hàm từ taskFilters
  const {
    searchQuery,
    setSearchQuery,
    selectedStatus,
    selectedPriority,
    activeTab,
    completedStatusId,
    pendingStatusId,
    handleSearch,
    handleStatusChange,
    handlePriorityChange,
    handleTabChange
  } = taskFilters;
  
  // Lấy các giá trị và hàm từ taskModals
  const {
    createModalOpen,
    setCreateModalOpen,
    importModalOpen,
    setImportModalOpen,
    detailModalOpen,
    setDetailModalOpen,
    selectedTaskId,
    selectedTask,
    handleCreateClick,
    handleImportClick,
    handleDetailClick,
    handleDetailClose
  } = taskModals;
  
  // Chuyển đổi trạng thái task
  const toggleTaskStatus = (task: Task, newStatusId: number) => {
    // Gửi request cập nhật trạng thái
    router.put(`/tasks/${task.id}/status`, {
      status_id: newStatusId
    }, {
      preserveState: true,
      only: ['tasks']
    });
  };
  
  return {
    // Search và filter
    searchQuery,
    setSearchQuery,
    activeTab,
    selectedStatus,
    selectedPriority,
    completedStatusId,
    pendingStatusId,
    
    // Modal states
    createModalOpen,
    setCreateModalOpen,
    importModalOpen,
    setImportModalOpen,
    detailModalOpen,
    setDetailModalOpen,
    
    // Task data
    selectedTaskId,
    selectedTask,
    
    // Handler functions
    handleSearch,
    handleStatusChange,
    handlePriorityChange,
    handleTabChange,
    toggleTaskStatus,
    handleCreateClick,
    handleImportClick,
    handleDetailClick,
    handleDetailClose
  };
} 
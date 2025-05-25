import { useEffect } from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import type { TasksProps } from './types'
import { Card } from '@/components/ui/card'
import { useTaskState } from './hooks/use_task_state'
import { formatDate } from './utils/task_formatter'
import useTranslation from '@/hooks/use_translation'

// Import các thành phần đã tái cấu trúc
import { TasksFilters } from './components/filters/tasks_filters'
import { TasksWrapper } from './components/task_list/tasks_wrapper'
import { CreateTaskModal } from './components/modals/create_task_modal'
import { ImportTasksModal } from './components/modals/import_tasks_modal'
import { TaskDetailModal } from './components/modals/task_detail_modal'

export default function Tasks({ tasks, filters, metadata, auth }: TasksProps) {
  const { t } = useTranslation()

  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    selectedStatus,
    selectedPriority,
    importModalOpen,
    setImportModalOpen,
    createModalOpen,
    setCreateModalOpen,
    detailModalOpen,

    selectedTask,
    handleSearch,
    handleStatusChange,
    handlePriorityChange,
    handleTabChange,
    toggleTaskStatus,
    handleCreateClick,
    handleImportClick,
    handleDetailClick,
    handleDetailClose
  } = useTaskState({ initialTasks: tasks, filters, metadata })

  // Cập nhật searchQuery từ URL khi component mount
  useEffect(() => {
    if (filters.search) {
      setSearchQuery(filters.search);
    }
  }, [filters.search]);



  // Kiểm tra quyền tạo task trực tiếp từ dữ liệu auth
  const hasCreatePermission = () => {
    const user = (window as unknown).auth?.user
    return user && (
      user.isAdmin === true ||
      user.role_id === 1 ||
      user.role_id === 2 ||
      (user.role && user.role.id === 1) ||
      (user.role && user.role.name === 'superadmin') ||
      user.userRole === 'superadmin' ||
      user.username === 'superadmin'
    )
  }

  const pageTitle = t('task.task_list', {}, 'Quản lý nhiệm vụ')

  return (
    <AppLayout title={pageTitle}>
      <Head title={pageTitle} />

      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">{pageTitle}</h1>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportClick}
            >
              {t('common.import', {}, 'Nhập')}
            </Button>

            <Button
              size="sm"
              onClick={handleCreateClick}
            >
              {t('task.add_task', {}, 'Tạo mới')}
            </Button>
          </div>
        </div>

        <Card>
          <TasksFilters
            filters={filters}
            metadata={metadata}
            onSearch={handleSearch}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onTabChange={handleTabChange}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedStatus={selectedStatus}
            selectedPriority={selectedPriority}
            activeTab={activeTab}
          >
            <TasksWrapper
              tasks={tasks}
              filters={filters}
              activeTab={activeTab}
              completedStatusId={metadata.statuses.find(s => s.name === 'Completed')?.id}
              pendingStatusId={metadata.statuses.find(s => s.name === 'Pending')?.id}
              onToggleStatus={toggleTaskStatus}
              formatDate={formatDate}
              onViewTaskDetail={handleDetailClick}
            />
          </TasksFilters>
        </Card>
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        statuses={metadata.statuses}
        priorities={metadata.priorities}
        labels={metadata.labels}
        users={metadata.users}
      />

      <ImportTasksModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
      />

      <TaskDetailModal
        open={detailModalOpen}
        onOpenChange={handleDetailClose}
        task={selectedTask}
        statuses={metadata.statuses}
        priorities={metadata.priorities}
        labels={metadata.labels}
        users={metadata.users}
        currentUser={auth?.user || {}}
      />
    </AppLayout>
  )
}

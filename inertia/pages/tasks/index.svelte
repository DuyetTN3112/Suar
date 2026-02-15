<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import type { TasksProps } from './types.svelte'
  import * as Card from '@/components/ui/card/index'
  import { createTaskStateStore } from './hooks/use_task_state.svelte'
  import { formatDate } from './utils/task_formatter.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import TasksFilters from './components/filters/tasks_filters.svelte'
  import TasksWrapper from './components/task_list/tasks_wrapper.svelte'
  import CreateTaskModal from './components/modals/create_task_modal.svelte'
  import ImportTasksModal from './components/modals/import_tasks_modal.svelte'
  import TaskDetailModal from './components/modals/task_detail_modal.svelte'

  interface Props {
    tasks: TasksProps['tasks']
    filters: TasksProps['filters']
    metadata: TasksProps['metadata']
    auth: TasksProps['auth']
  }

  const { tasks, filters, metadata, auth }: Props = $props()
  const { t } = useTranslation()

  const taskState = createTaskStateStore({ initialFilters: filters, metadata })

  let searchQuery = $state(filters.search || '')
  let createModalOpen = $state(false)
  let importModalOpen = $state(false)
  let detailModalOpen = $state(false)
  let selectedTask = $state<import('./types.svelte').Task | null>(null)

  // Debug logs
  console.log('[Tasks/index] Initial states:', {
    createModalOpen,
    importModalOpen,
    detailModalOpen,
    selectedTask: selectedTask?.id
  })

  $effect(() => {
    console.log('[Tasks/index] $effect - detailModalOpen:', detailModalOpen, 'selectedTask:', selectedTask?.id)
  })

  $effect(() => {
    if (filters.search) {
      searchQuery = filters.search
    }
  })

  const hasCreatePermission = () => {
    const user = auth?.user
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

  const pageTitle = $derived(t('task.task_list', {}, 'Quản lý nhiệm vụ'))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-xl font-semibold">{pageTitle}</h1>

      <div class="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onclick={() => { importModalOpen = true }}
        >
          {t('common.import', {}, 'Nhập')}
        </Button>

        <Button
          size="sm"
          onclick={() => { taskState.handleCreateClick().then(canCreate => { if (canCreate) createModalOpen = true }) }}
        >
          {t('task.add_task', {}, 'Tạo mới')}
        </Button>
      </div>
    </div>

    <Card.Root>
      <TasksFilters
        {filters}
        {metadata}
        onSearch={taskState.handleSearch}
        onStatusChange={taskState.handleStatusChange}
        onPriorityChange={taskState.handlePriorityChange}
        onTabChange={taskState.handleTabChange}
        bind:searchQuery={searchQuery}
        selectedStatus={taskState.selectedStatus.value}
        selectedPriority={taskState.selectedPriority.value}
        activeTab={taskState.activeTab.value}
      >
        <TasksWrapper
          {tasks}
          {filters}
          activeTab={taskState.activeTab.value}
          completedStatusId={metadata.statuses.find(s => s.name === 'Completed')?.id}
          pendingStatusId={metadata.statuses.find(s => s.name === 'Pending')?.id}
          onToggleStatus={taskState.toggleTaskStatus}
          formatDate={formatDate}
          onViewTaskDetail={(task) => {
            selectedTask = task
            detailModalOpen = true
          }}
        />
      </TasksFilters>
    </Card.Root>
  </div>

  <CreateTaskModal
    bind:open={createModalOpen}
    onOpenChange={(open) => { createModalOpen = open }}
    statuses={metadata.statuses}
    priorities={metadata.priorities}
    labels={metadata.labels}
    users={metadata.users}
  />

  <ImportTasksModal
    bind:open={importModalOpen}
    onOpenChange={(open) => { importModalOpen = open }}
  />

  <TaskDetailModal
    bind:open={detailModalOpen}
    onOpenChange={(open) => {
      detailModalOpen = open
      if (!open) {
        setTimeout(() => { selectedTask = null }, 300)
      }
    }}
    task={selectedTask}
    statuses={metadata.statuses}
    priorities={metadata.priorities}
    labels={metadata.labels}
    users={metadata.users}
    currentUser={auth?.user || {}}
  />
</AppLayout>

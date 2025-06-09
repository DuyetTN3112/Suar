<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import type { Task, TasksProps } from './types.svelte'
  import { createTaskStore } from '@/stores/tasks.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import TaskHeader from './components/header/task_header.svelte'
  import KanbanBoard from './components/views/kanban/kanban_board.svelte'
  import CreateTaskModal from './components/modals/create_task_modal.svelte'
  import ImportTasksModal from './components/modals/import_tasks_modal.svelte'
  import TaskDetailPanel from './components/detail/task_detail_panel.svelte'

  interface Props {
    tasks: TasksProps['tasks']
    filters: TasksProps['filters']
    metadata: TasksProps['metadata']
    auth: TasksProps['auth']
  }

  const { tasks, filters, metadata, auth: _auth }: Props = $props()
  const { t } = useTranslation()

  // Initialize new task store with server data
  const store = createTaskStore()

  $effect(() => {
    store.initFromServerData(tasks.data)
  })

  let createModalOpen = $state(false)
  let importModalOpen = $state(false)
  let detailModalOpen = $state(false)
  let selectedTask = $state<Task | null>(null)

  function handleCreateClick() {
    createModalOpen = true
  }

  function handleViewTaskDetail(task: Task) {
    selectedTask = task
    detailModalOpen = true
  }

  const pageTitle = $derived(t('task.task_list', {}, 'Quản lý nhiệm vụ'))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-4">
    <!-- Header with Filters, Display Properties -->
    <TaskHeader {store} {metadata} onCreateClick={handleCreateClick} />

    <!-- Kanban View Only -->
    <KanbanBoard
      {store}
      {metadata}
      onTaskClick={handleViewTaskDetail}
    />
  </div>

  <CreateTaskModal
    bind:open={createModalOpen}
    onOpenChange={(open: boolean) => { createModalOpen = open }}
    statuses={metadata.statuses}
    priorities={metadata.priorities}
    labels={metadata.labels}
    users={metadata.users}
  />

  <ImportTasksModal
    bind:open={importModalOpen}
    onOpenChange={(open: boolean) => { importModalOpen = open }}
  />

  <TaskDetailPanel
    bind:open={detailModalOpen}
    onOpenChange={(open: boolean) => {
      detailModalOpen = open
      if (!open) {
        setTimeout(() => { selectedTask = null }, 300)
      }
    }}
    task={selectedTask}
    {store}
    {metadata}
  />
</AppLayout>

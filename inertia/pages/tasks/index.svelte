<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import type { Task, TaskMetadata, TasksProps } from './types.svelte'
  import { createTaskStore } from '@/stores/tasks.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import TaskHeader from './components/header/task_header.svelte'
  import TaskScopeBar from './components/header/task_scope_bar.svelte'
  import KanbanBoard from './components/views/kanban/kanban_board.svelte'
  import CreateTaskModal from './components/modals/create_task_modal.svelte'
  import ImportTasksModal from './components/modals/import_tasks_modal.svelte'
  import TaskStatusManagementDialogs from './components/modals/task_status_management_dialogs.svelte'
  import TaskDetailPanel from './components/detail/task_detail_panel.svelte'
  import { router } from '@inertiajs/svelte'
  import { FRONTEND_ROUTES } from '@/constants'
  import {
    buildStatusDefinitions,
    canDeleteStatusDefinition,
    findStatusDefinition,
    getStatusMutationErrorMessage,
    slugifyStatusName,
  } from './status_management_helpers'
  import {
    createTaskStatusDefinition,
    deleteTaskStatusDefinition,
  } from './status_management_api'
  import { buildProjectScopeFilters } from './scope_helpers'

  interface Props extends TasksProps {
    metadata: TaskMetadata
  }

  const {
    shellMode = 'app',
    baseRoute = FRONTEND_ROUTES.TASKS,
    tasks,
    filters,
    metadata,
    auth,
    permissions,
    projectOptions = [],
    projectContext,
  }: Props = $props()
  const { t } = useTranslation()
  const currentOrganizationRole = $derived(auth?.user?.current_organization_role ?? null)
  const canManageWorkflow = $derived(
    currentOrganizationRole === 'org_owner' || currentOrganizationRole === 'org_admin'
  )
  const Layout = $derived(shellMode === 'organization' ? OrganizationLayout : AppLayout)

  const store = createTaskStore()
  const isBoardMutationLocked = $derived(store.isOptimisticActive)

  $effect(() => {
    store.initFromServerData(tasks.data)
  })

  let createModalOpen = $state(false)
  let selectedCreateStatus = $state('')
  let createStatusModalOpen = $state(false)
  let createStatusName = $state('')
  let createStatusSubmitting = $state(false)
  let createStatusError = $state('')
  const statusDefinitions = $derived(buildStatusDefinitions(metadata.statuses))
  let deleteStatusModalOpen = $state(false)
  let deleteStatusSubmitting = $state(false)
  let deleteStatusError = $state('')
  let statusDeleteTarget = $state<{ status: string; label: string; taskCount: number; id?: string; isSystem?: boolean } | null>(null)
  let importModalOpen = $state(false)
  let detailModalOpen = $state(false)
  let selectedTask = $state<Task | null>(null)
  const createTaskPermission = $derived({
    allowed: permissions?.canCreateTask ?? false,
    reason: permissions?.createTaskReason ?? null,
  })

  function isBoardReady(actionErrorMessage?: string): boolean {
    if (!isBoardMutationLocked) return true
    if (actionErrorMessage) {
      notificationStore.error('Board dang dong bo', actionErrorMessage)
    }
    return false
  }

  function handleCreateClick(status?: string) {
    if (!createTaskPermission.allowed) {
      notificationStore.error(
        'Bạn không đủ quyền tạo nhiệm vụ',
        createTaskPermission.reason ||
          'Chỉ org_owner, org_admin hoặc project_manager của project đã chọn mới được tạo nhiệm vụ.'
      )
      return
    }

    if (projectOptions.length === 0) {
      notificationStore.error('Chưa có project', 'Bạn cần tạo project trước khi tạo task.')
      return
    }
    selectedCreateStatus = status || ''
    createModalOpen = true
  }

  function handleCreateStatusClick() {
    if (!isBoardReady('Vui long doi thao tac keo-tha hoan tat truoc khi quan ly trang thai.')) return
    createStatusModalOpen = true
    createStatusError = ''
  }

  async function handleCreateStatusSubmit() {
    if (isBoardMutationLocked) {
      createStatusError = 'Board dang dong bo. Vui long thu lai sau it giay.'
      return
    }

    const name = createStatusName.trim()
    const slug = slugifyStatusName(name)

    if (!name) {
      createStatusError = 'Tên trạng thái là bắt buộc'
      return
    }

    if (!slug) {
      createStatusError = 'Tên trạng thái không hợp lệ'
      return
    }
    createStatusSubmitting = true
    createStatusError = ''

    try {
      await createTaskStatusDefinition({ name, slug, sortOrder: metadata.statuses.length })
      notificationStore.success('Đã tạo trạng thái mới')
      createStatusModalOpen = false
      createStatusName = ''
      router.reload({
        only: ['metadata', 'tasks', 'flash'],
      })
    } catch (error: unknown) {
      createStatusError = getStatusMutationErrorMessage(error, 'Không thể tạo trạng thái')
    } finally {
      createStatusSubmitting = false
    }
  }

  function canDeleteStatus(status: string): boolean {
    return canDeleteStatusDefinition(statusDefinitions, status, canManageWorkflow)
  }

  function handleDeleteStatusClick(payload: { status: string; label: string; taskCount: number }) {
    if (!isBoardReady('Vui long doi thao tac keo-tha hoan tat truoc khi xoa trang thai.')) return

    const definition = findStatusDefinition(statusDefinitions, payload.status)
    statusDeleteTarget = {
      ...payload,
      id: definition?.id,
      isSystem: definition?.is_system,
    }
    deleteStatusError = ''
    deleteStatusModalOpen = true
  }

  async function confirmDeleteStatus() {
    if (isBoardMutationLocked) {
      deleteStatusError = 'Board dang dong bo. Vui long thu lai sau it giay.'
      return
    }

    if (!statusDeleteTarget?.id) {
      deleteStatusError = 'Không thể xoá trạng thái này.'
      return
    }

    if (statusDeleteTarget.taskCount > 0) {
      deleteStatusError = 'Trạng thái còn task. Hãy chuyển task sang cột khác trước khi xoá.'
      return
    }
    deleteStatusSubmitting = true
    deleteStatusError = ''

    try {
      await deleteTaskStatusDefinition(statusDeleteTarget.id)
      notificationStore.success('Đã xoá trạng thái')
      deleteStatusModalOpen = false
      statusDeleteTarget = null
      router.reload({
        only: ['metadata', 'tasks', 'flash'],
      })
    } catch (error: unknown) {
      deleteStatusError = getStatusMutationErrorMessage(error, 'Không thể xoá trạng thái')
    } finally {
      deleteStatusSubmitting = false
    }
  }

  function handleViewTaskDetail(task: Task) {
    selectedTask = task
    detailModalOpen = true
  }

  function handleProjectScopeChange(projectId: string) {
    const nextFilters = buildProjectScopeFilters(filters, projectId)
    router.get(baseRoute, nextFilters, {
      preserveScroll: true,
    })
  }

  function handleTaskCreated(task: Task) {
    store.upsertTask(task)
  }

  function handleCreateStatusDialogClose() {
    createStatusModalOpen = false
    createStatusName = ''
    createStatusError = ''
  }

  function handleDeleteStatusDialogClose() {
    deleteStatusModalOpen = false
    deleteStatusError = ''
    statusDeleteTarget = null
  }

  const hasDeleteTargetTasks = $derived((statusDeleteTarget?.taskCount ?? 0) > 0)

  const pageTitle = $derived(shellMode === 'organization' ? 'Task tổ chức' : t('task.task_list', {}, 'Quản lý nhiệm vụ'))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-4">
    <TaskScopeBar
      {filters}
      {projectContext}
      {projectOptions}
      {createTaskPermission}
      onProjectScopeChange={handleProjectScopeChange}
    />
    <TaskHeader {store} {metadata} />
    <KanbanBoard
      {store}
      {metadata}
      onTaskClick={handleViewTaskDetail}
      onCreateTask={handleCreateClick}
      onCreateStatus={handleCreateStatusClick}
      onDeleteStatus={handleDeleteStatusClick}
      canCreateTask={createTaskPermission.allowed}
      canManageStatuses={canManageWorkflow}
      {canDeleteStatus}
    />
  </div>
  <CreateTaskModal
    bind:open={createModalOpen}
    onOpenChange={(open: boolean) => { createModalOpen = open }}
    initialStatus={selectedCreateStatus}
    onCreated={handleTaskCreated}
    statuses={metadata.statuses}
    priorities={metadata.priorities}
    labels={metadata.labels}
    projects={projectOptions}
    initialProjectId={projectContext?.selectedProject?.id || projectOptions[0]?.id || ''}
    users={metadata.users}
    parentTasks={metadata.parentTasks || []}
    availableSkills={metadata.availableSkills || []}
  />
  <ImportTasksModal open={importModalOpen} onOpenChange={(open: boolean) => { importModalOpen = open }} />
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
  <TaskStatusManagementDialogs
    createOpen={createStatusModalOpen}
    createStatusName={createStatusName}
    {createStatusError}
    createStatusSubmitting={createStatusSubmitting}
    onCreateSubmit={handleCreateStatusSubmit}
    onCreateClose={handleCreateStatusDialogClose}
    onCreateOpenChange={(open: boolean) => {
      createStatusModalOpen = open
    }}
    onCreateStatusNameChange={(value: string) => {
      createStatusName = value
    }}
    deleteOpen={deleteStatusModalOpen}
    deleteStatusError={deleteStatusError}
    deleteStatusSubmitting={deleteStatusSubmitting}
    deleteStatusTarget={statusDeleteTarget}
    {hasDeleteTargetTasks}
    onDeleteConfirm={confirmDeleteStatus}
    onDeleteClose={handleDeleteStatusDialogClose}
    onDeleteOpenChange={(open: boolean) => {
      deleteStatusModalOpen = open
    }}
  />
</Layout>

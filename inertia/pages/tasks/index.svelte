<script lang="ts">
  import { router, page  } from '@inertiajs/svelte'
  import { untrack } from 'svelte'

  import { FRONTEND_ROUTES } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import { createTaskStore } from '@/stores/tasks.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import TaskHeader from './components/header/task_header.svelte'
  import TaskScopeBar from './components/header/task_scope_bar.svelte'
  import TaskIndexModals from './components/modals/task_index_modals.svelte'
  import { loadTaskDetail } from './components/task_detail_api'
  import KanbanBoard from './components/views/kanban/kanban_board.svelte'
  import { buildProjectScopeFilters } from './scope_helpers'
  import { createStatusManagementController } from './status_management_controller.svelte'
  import type { Task, TaskMetadata, TasksProps, TaskStatusCategory } from './types.svelte'

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
  const isOrgTaskSurface = $derived(shellMode === 'organization')
  const isOrgOwnerOrAdmin = $derived(
    currentOrganizationRole === 'org_owner' || currentOrganizationRole === 'org_admin'
  )
  // TODO: remove role fallback after backend provides permissions.canManageWorkflow consistently.
  const canManageWorkflow = $derived(
    isOrgTaskSurface && (permissions?.canManageWorkflow ?? isOrgOwnerOrAdmin)
  )
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)

  function getCurrentTaskScope() {
    return {
      baseRoute,
      shellMode,
      projectId: filters.project_id ?? null,
    }
  }

  const store = createTaskStore({
    getCurrentScope: getCurrentTaskScope,
  })
  const isBoardMutationLocked = $derived(store.isOptimisticActive)

  $effect(() => {
    const serverTasks = tasks.data
    untrack(() => {
      store.initFromServerData(serverTasks)
    })
  })

  let createModalOpen = $state(false)
  let selectedCreateStatus = $state('')
  let detailModalOpen = $state(false)
  let detailTaskLoading = $state(false)
  let selectedTaskId = $state<string | null>(null)
  let detailFetchSequence = 0
  const selectedTask = $derived(selectedTaskId ? (store.getTaskById(selectedTaskId) ?? null) : null)
  const createTaskPermission = $derived({
    allowed: permissions?.canCreateTask ?? false,
    reason: permissions?.createTaskReason ?? null,
  })

  const statusManager = createStatusManagementController({
    getStatuses: () => metadata.statuses,
    canManageWorkflow: () => canManageWorkflow,
    isBoardMutationLocked: () => isBoardMutationLocked,
  })

  function handleCreateClick(status?: string) {
    if (!createTaskPermission.allowed) {
      notificationStore.error(
        'Bạn không đủ quyền tạo nhiệm vụ',
        createTaskPermission.reason ??
          'Chỉ Chủ sở hữu tổ chức, Quản trị viên tổ chức hoặc Quản lý dự án của dự án đã chọn mới được tạo nhiệm vụ.'
      )
      return
    }

    if (projectOptions.length === 0) {
      notificationStore.error('Chưa có project', 'Bạn cần tạo project trước khi tạo task.')
      return
    }
    selectedCreateStatus = status ?? ''
    createModalOpen = true
  }

  function handleViewTaskDetail(task: Task) {
    selectedTaskId = task.id
    detailModalOpen = true
  }

  function handleProjectScopeChange(projectId: string) {
    if (store.isOptimisticActive) {
      notificationStore.info('Board đang đồng bộ', 'Vui lòng đợi thao tác hiện tại hoàn tất.')
      return
    }

    const nextFilters = buildProjectScopeFilters(filters, projectId)
    router.get(baseRoute, nextFilters, {
      preserveScroll: true,
    })
  }

  function isTaskInCurrentScope(task: Task): boolean {
    const selectedProjectId = filters.project_id ?? null
    return !selectedProjectId || task.project_id === selectedProjectId
  }

  function handleTaskCreated(task: Task) {
    if (isTaskInCurrentScope(task)) {
      store.upsertTask(task)
    }
  }

  function handleDetailStatusChange(task: Task, toStatusId: string) {
    void store.moveTaskStatus(task.id, toStatusId)
  }

  function getDetailStatusChangeDecision(_task: Task, _toStatusId: string) {
    if (store.isOptimisticActive) {
      return { allowed: false, reason: 'Đang đồng bộ thay đổi trước đó.' }
    }

    return { allowed: true, reason: null }
  }

  function handleDetailClose() {
    detailModalOpen = false
    selectedTaskId = null
  }

  $effect(() => {
    if (detailModalOpen && selectedTaskId && !selectedTask && !store.isOptimisticActive) {
      handleDetailClose()
    }
  })

  $effect(() => {
    if (!detailModalOpen || !selectedTaskId) {
      detailTaskLoading = false
      return
    }

    const requestId = ++detailFetchSequence
    detailTaskLoading = true

    void loadTaskDetail(selectedTaskId)
      .then((task) => {
        if (!task || requestId !== detailFetchSequence || selectedTaskId !== task.id) {
          return
        }

        store.upsertTask(task)
      })
      .finally(() => {
        if (requestId === detailFetchSequence) {
          detailTaskLoading = false
        }
      })
  })

  const pageTitle = $derived(
    shellMode === 'organization' ? 'Task tổ chức' : t('task.task_list', {}, 'Quản lý nhiệm vụ')
  )
  const vm = $derived({ createTaskPermission })
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <div class="task-control-page">
      <section class="task-board-surface min-h-[calc(100vh-60px)] max-[680px]:min-h-[calc(100vh-150px)] relative rounded-3xl border border-border bg-white shadow-xs p-6 md:p-8" aria-label={pageTitle}>
      <TaskScopeBar
        {filters}
        {projectContext}
        {projectOptions}
        createTaskPermission={vm.createTaskPermission}
        isBoardMutationLocked={store.isOptimisticActive}
        onProjectScopeChange={handleProjectScopeChange}
      />
      <TaskHeader {store} {metadata} />
      <KanbanBoard
        {store}
        {metadata}
        onTaskClick={handleViewTaskDetail}
        onCreateTask={handleCreateClick}
        onCreateStatus={statusManager.handleCreateStatusClick}
        onDeleteStatus={statusManager.handleDeleteStatusClick}
        canCreateTask={vm.createTaskPermission.allowed && projectOptions.length > 0}
        canManageStatuses={canManageWorkflow}
        canDeleteStatus={statusManager.canDeleteStatus}
        createTaskDisabledReason={vm.createTaskPermission.reason}
        hasProjectOptions={projectOptions.length > 0}
      />
    </section>
  </div>
  <TaskIndexModals
    {metadata}
    {projectOptions}
    {projectContext}
    {createModalOpen}
    onCreateModalOpenChange={(open: boolean) => {
      createModalOpen = open
    }}
    {selectedCreateStatus}
    onTaskCreated={handleTaskCreated}
    {detailModalOpen}
    onDetailModalOpenChange={(open: boolean) => {
      detailModalOpen = open
    }}
    {selectedTask}
    {detailTaskLoading}
    onDetailClose={handleDetailClose}
    onDetailStatusChange={handleDetailStatusChange}
    getDetailStatusChangeDecision={getDetailStatusChangeDecision}
    createStatusModalOpen={statusManager.createStatusModalOpen}
    createStatusName={statusManager.createStatusName}
    createStatusCategory={statusManager.createStatusCategory}
    createStatusDescription={statusManager.createStatusDescription}
    createStatusColor={statusManager.createStatusColor}
    createStatusError={statusManager.createStatusError}
    createStatusSubmitting={statusManager.createStatusSubmitting}
    onCreateStatusSubmit={statusManager.handleCreateStatusSubmit}
    onCreateStatusDialogClose={statusManager.handleCreateStatusDialogClose}
    onCreateStatusModalOpenChange={(open: boolean) => {
      statusManager.createStatusModalOpen = open
    }}
    onCreateStatusNameChange={(value: string) => {
      statusManager.createStatusName = value
    }}
    onCreateStatusCategoryChange={(value: TaskStatusCategory | '') => {
      statusManager.createStatusCategory = value
    }}
    onCreateStatusDescriptionChange={(value: string) => {
      statusManager.createStatusDescription = value
    }}
    onCreateStatusColorChange={(value: string) => {
      statusManager.createStatusColor = value
    }}
    deleteStatusModalOpen={statusManager.deleteStatusModalOpen}
    deleteStatusError={statusManager.deleteStatusError}
    deleteStatusSubmitting={statusManager.deleteStatusSubmitting}
    statusDeleteTarget={statusManager.statusDeleteTarget}
    hasDeleteTargetTasks={statusManager.hasDeleteTargetTasks}
    isStatusMutationLocked={statusManager.isStatusMutationLocked}
    onDeleteStatusConfirm={statusManager.confirmDeleteStatus}
    onDeleteStatusDialogClose={statusManager.handleDeleteStatusDialogClose}
    onDeleteStatusModalOpenChange={(open: boolean) => {
      statusManager.deleteStatusModalOpen = open
    }}
  />
</Layout>

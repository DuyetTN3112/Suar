<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import { untrack } from 'svelte'

  import { getTaskDoneGateDecision } from '@/apps/shared/tasks/done_gate'
  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
  import { createTaskStore } from '@/apps/org/modules/tasks/stores/tasks.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import TaskHeader from '@/apps/org/modules/tasks/components/header/task_header.svelte'
  import TaskScopeBar from '@/apps/org/modules/tasks/components/header/task_scope_bar.svelte'
  import TaskIndexModals from '@/apps/org/modules/tasks/components/modals/task_index_modals.svelte'
  import TasksWrapper from '@/apps/org/modules/tasks/components/task_list/tasks_wrapper.svelte'
  import { loadTaskDetail } from '@/apps/org/modules/tasks/api/task_detail_api'
  import KanbanBoard from '@/apps/org/modules/tasks/components/views/kanban/kanban_board.svelte'
  import { createStatusManagementController } from '@/apps/org/modules/tasks/stores/status_management_controller.svelte'
  import type { TaskDetail, TaskMetadata, TasksProps, TaskStatusCategory } from '@/apps/org/modules/tasks/types/index.svelte'
  import { formatDate } from '@/apps/org/modules/tasks/utils/task_formatter.svelte'

  interface Props extends TasksProps {
    metadata: TaskMetadata
  }

  const {
    shellMode = 'app',
    workspaceView = 'board',
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
  const isListWorkspace = $derived(workspaceView === 'list')
  const isOrgOwnerOrAdmin = $derived(
    currentOrganizationRole === 'org_owner' || currentOrganizationRole === 'org_admin'
  )
  const currentQuery = $derived(new URLSearchParams(page.url.split('?')[1] ?? ''))
  const requestedRoleId = $derived(currentQuery.get('roleId') ?? currentQuery.get('role_id') ?? '')
  const requestedCreate = $derived(currentQuery.get('create') ?? '')
  const requestedStatus = $derived(currentQuery.get('status') ?? '')
  const selectedProjectId = $derived(projectContext?.selectedProject?.id ?? filters.project_id ?? '')
  // Workflow is project-owned. An org owner/admin governs every project in the
  // org, while the selected project determines which status catalogue is shown.
  const canManageWorkflow = $derived(
    Boolean(selectedProjectId) && (permissions?.canManageWorkflow ?? isOrgOwnerOrAdmin)
  )
  let didAutoOpenCreateModal = $state(false)

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
  let selectedTaskSnapshot = $state<TaskDetail | null>(null)
  let detailFetchSequence = 0
  const selectedTask = $derived(
    selectedTaskId ? (store.getTaskById(selectedTaskId) ?? selectedTaskSnapshot) : null
  )
  const createTaskPermission = $derived({
    allowed: permissions?.canCreateTask ?? false,
    reason: permissions?.createTaskReason ?? null,
  })
  const statusManager = createStatusManagementController({
    getStatuses: () => metadata.statuses,
    getProjectId: () => selectedProjectId || null,
    canManageWorkflow: () => canManageWorkflow,
    isBoardMutationLocked: () => isBoardMutationLocked,
  })

  function handleCreateClick(status?: string) {
    if (!createTaskPermission.allowed) {
      notificationStore.error(
        t('task.create.permission_create_denied', {}, 'You do not have permission to create tasks'),
        createTaskPermission.reason ??
          t('task.create.permission_create_denied_description', {}, 'Only organization owners, organization admins, or project managers for the selected project can create tasks.')
      )
      return
    }

    if (!selectedProjectId) {
      notificationStore.error(
        t('task.create.no_project_title', {}, 'No project selected'),
        t('task.create.project_context_help', {}, 'Select a project from the sidebar before creating a task.')
      )
      return
    }
    selectedCreateStatus = status ?? ''
    createModalOpen = true
  }

  $effect(() => {
    if (
      !didAutoOpenCreateModal &&
      requestedCreate === '1' &&
      createTaskPermission.allowed &&
      selectedProjectId
    ) {
      didAutoOpenCreateModal = true
      selectedCreateStatus = requestedStatus || ''
      createModalOpen = true
    }
  })

  function handleViewTaskDetail(task: TaskDetail) {
    selectedTaskId = task.id
    selectedTaskSnapshot = task
    detailModalOpen = true
  }

  function isTaskInCurrentScope(task: TaskDetail): boolean {
    const selectedProjectId = filters.project_id ?? null
    return !selectedProjectId || task.project_id === selectedProjectId
  }

  function handleTaskCreated(task: TaskDetail) {
    if (isTaskInCurrentScope(task)) {
      store.upsertTask(task)
    }
  }

  function handleDetailStatusChange(task: TaskDetail, toStatusId: string) {
    void store.moveTaskStatus(task.id, toStatusId)
  }

  function getDetailStatusChangeDecision(task: TaskDetail, toStatusId: string) {
    return getTaskDoneGateDecision({
      task,
      targetStatus: metadata.statuses.find((status) => status.value === toStatusId) ?? {
        value: toStatusId,
      },
      isBoardSyncing: store.isOptimisticActive,
      reason: {
        boardSyncing: t('task.workflow.board_sync_retry_error', {}, 'Board is syncing. Please try again in a few seconds.'),
        permissionDenied: t('task.workflow.status_permission_denied', {}, 'You do not have permission to update this task status.'),
        missingAssignee: t('task.workflow.assignee_required_for_done', {}, 'Assign a person to the task before moving it to Done.'),
      },
    })
  }

  function handleDetailClose() {
    detailModalOpen = false
    selectedTaskId = null
    selectedTaskSnapshot = null
  }

  function reloadSelectedTaskBrief(): void {
    const taskId = selectedTaskId
    if (!taskId) return

    const requestId = ++detailFetchSequence
    detailTaskLoading = true

    void loadTaskDetail(taskId)
      .then((task) => {
        if (!task || requestId !== detailFetchSequence || selectedTaskId !== task.id) {
          return
        }

        store.upsertTask(task)
        selectedTaskSnapshot = task
      })
      .catch((error: unknown) => {
        if (requestId !== detailFetchSequence) return

        const message = error instanceof Error ? error.message : 'Could not reload task detail.'
        notificationStore.error('Could not reload task detail.', message)
      })
      .finally(() => {
        if (requestId === detailFetchSequence) {
          detailTaskLoading = false
        }
      })
  }

  $effect(() => {
    if (!detailModalOpen || !selectedTaskId) {
      detailTaskLoading = false
      return
    }

    reloadSelectedTaskBrief()
  })

  const pageTitle = $derived(
    shellMode === 'organization'
      ? (isListWorkspace ? t('task.organization_task_list', {}, 'Organization task list') : t('task.organization_task_board', {}, 'Organization task board'))
      : t('task.task_list', {}, 'Task List')
  )
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<OrganizationLayout title={pageTitle}>
  <div class="task-control-page space-y-4">
      <section class="task-board-surface min-h-[calc(100vh-60px)] max-[680px]:min-h-[calc(100vh-150px)] relative rounded-3xl border border-border bg-card shadow-xs p-4 md:p-5" aria-label={pageTitle}>
      <TaskScopeBar
        {createTaskPermission}
        isBoardMutationLocked={store.isOptimisticActive}
      />
      <TaskHeader {store} {metadata} />
      {#if isListWorkspace}
        <TasksWrapper
          {baseRoute}
          {tasks}
          {filters}
          activeTab="all"
          formatDate={formatDate}
          onToggleStatus={handleDetailStatusChange}
          onViewTaskDetail={handleViewTaskDetail}
        />
      {:else}
        <KanbanBoard
          {store}
          {metadata}
          onTaskClick={handleViewTaskDetail}
          onCreateTask={handleCreateClick}
          onCreateStatus={statusManager.handleCreateStatusClick}
          onDeleteStatus={statusManager.handleDeleteStatusClick}
          onRenameStatus={statusManager.handleRenameStatusClick}
          onReorderStatuses={statusManager.handleReorderStatuses}
          canCreateTask={createTaskPermission.allowed && Boolean(selectedProjectId)}
          canManageStatuses={canManageWorkflow}
          canDeleteStatus={statusManager.canDeleteStatus}
          createTaskDisabledReason={createTaskPermission.reason}
          hasProjectOptions={projectOptions.length > 0}
        />
      {/if}
    </section>
  </div>
  <TaskIndexModals
    {metadata}
    {projectOptions}
    {projectContext}
    initialRoleId={requestedRoleId}
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
    onReloadBrief={reloadSelectedTaskBrief}
    onDetailStatusChange={handleDetailStatusChange}
    getDetailStatusChangeDecision={getDetailStatusChangeDecision}
    {shellMode}
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
    renameStatusModalOpen={statusManager.renameStatusModalOpen}
    renameStatusName={statusManager.renameStatusName}
    renameStatusColor={statusManager.renameStatusColor}
    renameStatusError={statusManager.renameStatusError}
    renameStatusSubmitting={statusManager.renameStatusSubmitting}
    statusRenameTarget={statusManager.statusRenameTarget}
    onRenameStatusSubmit={statusManager.handleRenameStatusSubmit}
    onRenameStatusDialogClose={statusManager.handleRenameStatusDialogClose}
    onRenameStatusModalOpenChange={(open: boolean) => {
      statusManager.renameStatusModalOpen = open
    }}
    onRenameStatusNameChange={(value: string) => {
      statusManager.renameStatusName = value
    }}
    onRenameStatusColorChange={(value: string) => {
      statusManager.renameStatusColor = value
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
</OrganizationLayout>

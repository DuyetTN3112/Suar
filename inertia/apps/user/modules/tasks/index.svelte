<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import { untrack } from 'svelte'

  import { normalizeApiProblem } from '@/apps/shared/http/api_problem'
  import { getTaskDoneGateDecision } from '@/apps/shared/tasks/done_gate'
  import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
  import { createTaskStore } from '@/apps/user/modules/tasks/stores/tasks.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import TaskHeader from '@/apps/user/modules/tasks/components/header/task_header.svelte'
  import TaskScopeBar from '@/apps/user/modules/tasks/components/header/task_scope_bar.svelte'
  import TaskIndexModals from '@/apps/user/modules/tasks/components/modals/task_index_modals.svelte'
  import { loadTaskDetail } from '@/apps/user/modules/tasks/api/task_detail_api'
  import KanbanBoard from '@/apps/user/modules/tasks/components/views/kanban/kanban_board.svelte'
  import { createStatusManagementController } from '@/apps/user/modules/tasks/stores/status_management_controller.svelte'
  import type { TaskDetail, TaskMetadata, TasksProps, TaskStatusCategory } from '@/apps/user/modules/tasks/types/index.svelte'

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
  const isProjectTaskSurface = $derived(shellMode === 'project')
  const isOrgOwnerOrAdmin = $derived(
    currentOrganizationRole === 'org_owner' || currentOrganizationRole === 'org_admin'
  )
  const currentQuery = $derived(new URLSearchParams(page.url.split('?')[1] ?? ''))
  const requestedRoleId = $derived(currentQuery.get('roleId') ?? currentQuery.get('role_id') ?? '')
  const requestedCreate = $derived(currentQuery.get('create') ?? '')
  const requestedStatus = $derived(currentQuery.get('status') ?? '')
  const selectedProjectId = $derived(projectContext?.selectedProject?.id ?? filters.project_id ?? '')
  const canManageWorkflow = $derived(
    Boolean(selectedProjectId) && (permissions?.canManageWorkflow ?? isOrgOwnerOrAdmin)
  )
  const requestedTaskId = $derived(currentQuery.get('task_id'))
  let didAutoOpenCreateModal = $state(false)
  let autoOpenedTaskId = $state<string | null>(null)

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
    replaceTaskDetailUrl(task.id)
  }

  function replaceTaskDetailUrl(taskId: string | null): void {
    if (typeof window === 'undefined') return

    const nextUrl = new URL(window.location.href)
    if (taskId) nextUrl.searchParams.set('task_id', taskId)
    else nextUrl.searchParams.delete('task_id')

    window.history.replaceState(window.history.state, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
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

  async function handleRenameStatus(payload: { status: string; label: string }) {
    statusManager.handleRenameStatusClick(payload)
  }

  async function handleReorderStatuses(payload: {
    orderedStatusIds: string[]
    previousStatusIds: string[]
  }) {
    await statusManager.handleReorderStatuses(payload)
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
    replaceTaskDetailUrl(null)
  }

  function reloadSelectedTaskBrief(): void {
    const taskId = selectedTaskId
    if (!taskId) return

    const requestId = ++detailFetchSequence
    detailTaskLoading = true

    void loadTaskDetail(taskId)
      .then((task) => {
        if (requestId !== detailFetchSequence || selectedTaskId !== task.id) {
          return
        }

        store.upsertTask(task)
        selectedTaskSnapshot = task
      })
      .catch((error: unknown) => {
        if (requestId !== detailFetchSequence) return

        const problem = normalizeApiProblem(error)
        if (problem.canceled) return

        const reference = problem.requestId ? ` Reference: ${problem.requestId}` : ''
        notificationStore.error(problem.title, `${problem.detail}${reference}`)
        // Keep the brief board snapshot open when hydration fails. Closing the
        // dialog here made task detail flash and disappear without an
        // explanation, especially during an Inertia visit.
      })
      .finally(() => {
        if (requestId === detailFetchSequence) {
          detailTaskLoading = false
        }
      })
  }

  $effect(() => {
    if (requestedTaskId && autoOpenedTaskId !== requestedTaskId) {
      selectedTaskId = requestedTaskId
      selectedTaskSnapshot = store.getTaskById(requestedTaskId) ?? null
      detailModalOpen = true
      autoOpenedTaskId = requestedTaskId
    }
  })

  $effect(() => {
    if (!detailModalOpen || !selectedTaskId) {
      detailTaskLoading = false
      return
    }

    reloadSelectedTaskBrief()
  })

  const pageTitle = $derived(
    isProjectTaskSurface
      ? t('task.project_task_board', {}, 'Project task board')
      : shellMode === 'organization'
        ? t('task.organization_task_board', {}, 'Organization task board')
        : t('task.task_board', {}, 'Task board')
  )
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle} workspaceMode={isProjectTaskSurface ? 'project' : 'personal'}>
  <div class="task-control-page space-y-4">
    <h1 class="sr-only">{pageTitle}</h1>
    <section class="task-board-surface min-h-[calc(100vh-60px)] max-[680px]:min-h-[calc(100vh-150px)] relative rounded-3xl border border-border bg-card shadow-xs p-4 md:p-5" aria-label={pageTitle}>
      <TaskScopeBar
        {createTaskPermission}
        isBoardMutationLocked={store.isOptimisticActive}
      />
      <TaskHeader {store} {metadata} />
      <KanbanBoard
        {store}
        {metadata}
        onTaskClick={handleViewTaskDetail}
        onCreateTask={handleCreateClick}
        onCreateStatus={statusManager.handleCreateStatusClick}
        onDeleteStatus={statusManager.handleDeleteStatusClick}
        onRenameStatus={handleRenameStatus}
        onReorderStatuses={handleReorderStatuses}
        canCreateTask={createTaskPermission.allowed && Boolean(selectedProjectId)}
        canManageStatuses={canManageWorkflow}
        canDeleteStatus={statusManager.canDeleteStatus}
        createTaskDisabledReason={createTaskPermission.reason}
        hasProjectOptions={projectOptions.length > 0}
      />
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
</AppLayout>

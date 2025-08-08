<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import axios from 'axios'
  import type { Task, TasksProps } from './types.svelte'
  import { createTaskStore } from '@/stores/tasks.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import TaskHeader from './components/header/task_header.svelte'
  import KanbanBoard from './components/views/kanban/kanban_board.svelte'
  import CreateTaskModal from './components/modals/create_task_modal.svelte'
  import ImportTasksModal from './components/modals/import_tasks_modal.svelte'
  import TaskDetailPanel from './components/detail/task_detail_panel.svelte'
  import { router } from '@inertiajs/svelte'
  import { TriangleAlert } from 'lucide-svelte'

  interface Props {
    shellMode?: TasksProps['shellMode']
    baseRoute?: TasksProps['baseRoute']
    tasks: TasksProps['tasks']
    filters: TasksProps['filters']
    metadata: TasksProps['metadata']
    auth: TasksProps['auth']
    permissions?: TasksProps['permissions']
    projectOptions?: Array<{ id: string; name: string }>
    projectContext?: { selectedProject: { id: string; name: string } | null }
  }

  const {
    shellMode = 'app',
    baseRoute = '/tasks',
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

  // Initialize new task store with server data
  const store = createTaskStore()

  $effect(() => {
    store.initFromServerData(tasks.data)
  })

  let createModalOpen = $state(false)
  let selectedCreateStatus = $state('')
  let createStatusModalOpen = $state(false)
  let createStatusName = $state('')
  let createStatusSubmitting = $state(false)
  let createStatusError = $state('')
  let statusDefinitions = $state<Array<{ id: string; slug: string; name: string; is_system: boolean }>>([])
  let statusDefinitionsLoaded = $state(false)
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

  $effect(() => {
    if (statusDefinitionsLoaded || typeof window === 'undefined') return

    statusDefinitionsLoaded = true
    void axios
      .get<{ success: boolean; data: Array<{ id: string; slug: string; name: string; is_system: boolean }> }>('/api/task-statuses')
      .then((response) => {
        statusDefinitions = response.data.data
      })
      .catch(() => {
        statusDefinitions = []
      })
  })

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
    createStatusModalOpen = true
    createStatusError = ''
  }

  function slugify(raw: string): string {
    return raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 50)
  }

  function handleCreateStatusSubmit() {
    const name = createStatusName.trim()
    const slug = slugify(name)

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

    void axios
      .post('/api/task-statuses', {
        name,
        slug,
        category: 'in_progress',
        color: '#6B7280',
        sort_order: metadata.statuses.length,
      })
      .then(() => {
        notificationStore.success('Đã tạo trạng thái mới')
        createStatusModalOpen = false
        createStatusName = ''
        router.reload({ only: ['metadata', 'tasks'] })
      })
      .catch((error: unknown) => {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
        createStatusError = message || 'Không thể tạo trạng thái'
      })
      .finally(() => {
        createStatusSubmitting = false
      })
  }

  function getStatusDefinition(status: string) {
    return statusDefinitions.find((item) => item.id === status || item.slug === status)
  }

  function canDeleteStatus(status: string): boolean {
    if (!canManageWorkflow) return false

    const def = getStatusDefinition(status)
    if (!def) return false
    return !def.is_system
  }

  function handleDeleteStatusClick(payload: { status: string; label: string; taskCount: number }) {
    const definition = getStatusDefinition(payload.status)
    statusDeleteTarget = {
      ...payload,
      id: definition?.id,
      isSystem: definition?.is_system,
    }
    deleteStatusError = ''
    deleteStatusModalOpen = true
  }

  function confirmDeleteStatus() {
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

    void axios
      .delete(`/api/task-statuses/${statusDeleteTarget.id}`)
      .then(() => {
        notificationStore.success('Đã xoá trạng thái')
        deleteStatusModalOpen = false
        statusDeleteTarget = null
        router.reload({ only: ['metadata', 'tasks'] })
      })
      .catch((error: unknown) => {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
        deleteStatusError = message || 'Không thể xoá trạng thái'
      })
      .finally(() => {
        deleteStatusSubmitting = false
      })
  }

  function handleViewTaskDetail(task: Task) {
    selectedTask = task
    detailModalOpen = true
  }

  function handleProjectScopeChange(projectId: string) {
    const normalizedProjectId = projectId === '__all__' ? undefined : projectId
    const nextFilters: Record<string, string | number | null | undefined> = {
      ...filters,
      page: 1,
    }

    if (normalizedProjectId) {
      nextFilters.project_id = normalizedProjectId
    } else {
      delete nextFilters.project_id
    }

    router.get(baseRoute, nextFilters, {
      preserveScroll: true,
    })
  }

  function handleTaskCreated(task: Task) {
    store.upsertTask(task)
  }

  const hasDeleteTargetTasks = $derived((statusDeleteTarget?.taskCount ?? 0) > 0)

  const pageTitle = $derived(
    shellMode === 'organization'
      ? 'Task tổ chức'
      : t('task.task_list', {}, 'Quản lý nhiệm vụ')
  )
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-4">
    <div class="rounded-lg border bg-card p-3">
      <div class="w-full sm:w-[320px]">
        <Select
          value={filters.project_id || projectContext?.selectedProject?.id || '__all__'}
          onValueChange={(value: string) => {
            handleProjectScopeChange(value)
          }}
        >
          <SelectTrigger>
            <span>
              {projectContext?.selectedProject?.name || 'Tất cả project'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" label="Tất cả project">
              Tất cả project
            </SelectItem>
            {#each projectOptions as project (project.id)}
              <SelectItem value={project.id} label={project.name}>
                {project.name}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      {#if projectOptions.length === 0}
        <p class="mt-2 text-sm text-muted-foreground">
          Chưa có project trong tổ chức hiện tại để hiển thị task.
        </p>
      {/if}
    </div>

    {#if !createTaskPermission.allowed}
      <div class="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100">
        <p class="font-semibold">Bạn chưa thể tạo nhiệm vụ ở màn này.</p>
        <p class="mt-1">
          {createTaskPermission.reason ||
            'Chỉ org_owner, org_admin hoặc project_manager của project đã chọn mới được tạo nhiệm vụ.'}
        </p>
      </div>
    {/if}

    <!-- Header with Filters, Display Properties -->
    <TaskHeader {store} {metadata} />

    <!-- Kanban View Only -->
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

  <ImportTasksModal
    open={importModalOpen}
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

  <Dialog
    bind:open={deleteStatusModalOpen}
    onOpenChange={(open: boolean) => {
      deleteStatusModalOpen = open
      if (!open) {
        deleteStatusError = ''
        statusDeleteTarget = null
      }
    }}
  >
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>Xoá trạng thái</DialogTitle>
        <DialogDescription>
          Hành động này chỉ xoá cột trạng thái, không tự động xoá task.
        </DialogDescription>
      </DialogHeader>

      {#if statusDeleteTarget}
        <div class="space-y-3 py-1 text-sm">
          <p>
            Bạn sắp xoá trạng thái <span class="font-semibold">{statusDeleteTarget.label}</span>.
          </p>

          <div class="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100">
            <div class="flex items-start gap-2">
              <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p class="font-medium">Cảnh báo</p>
                <p>
                  Cột này hiện có <span class="font-semibold">{statusDeleteTarget.taskCount}</span> task.
                  Nếu còn task, hệ thống sẽ chặn xoá để tránh mất dữ liệu.
                </p>
              </div>
            </div>
          </div>

          {#if deleteStatusError}
            <p class="text-red-500">{deleteStatusError}</p>
          {/if}
        </div>
      {/if}

      <DialogFooter>
        <Button
          variant="outline"
          onclick={() => {
            deleteStatusModalOpen = false
          }}
          disabled={deleteStatusSubmitting}
        >
          Hủy
        </Button>
        <Button
          variant="destructive"
          onclick={confirmDeleteStatus}
          disabled={deleteStatusSubmitting || !statusDeleteTarget?.id || hasDeleteTargetTasks}
        >
          {deleteStatusSubmitting ? 'Đang xoá...' : 'Xoá trạng thái'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <Dialog
    bind:open={createStatusModalOpen}
    onOpenChange={(open: boolean) => {
      createStatusModalOpen = open
      if (!open) {
        createStatusName = ''
        createStatusError = ''
      }
    }}
  >
    <DialogContent class="sm:max-w-[460px]">
      <DialogHeader>
        <DialogTitle>Thêm trạng thái mới</DialogTitle>
        <DialogDescription>
          Nhập tên trạng thái mới để thêm cột vào board.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-2 py-2">
        <Input
          placeholder="VD: Chờ QA"
          value={createStatusName}
          oninput={(event: Event) => {
            const target = event.target as HTMLInputElement
            createStatusName = target.value
          }}
          onkeydown={(event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleCreateStatusSubmit()
            }
          }}
        />
        {#if createStatusError}
          <p class="text-sm text-red-500">{createStatusError}</p>
        {/if}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onclick={() => {
            createStatusModalOpen = false
          }}
          disabled={createStatusSubmitting}
        >
          Hủy
        </Button>
        <Button onclick={handleCreateStatusSubmit} disabled={createStatusSubmitting}>
          {createStatusSubmitting ? 'Đang tạo...' : 'Tạo trạng thái'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</Layout>

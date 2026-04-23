<script lang="ts">
  import type { createTaskStore } from '@/stores/tasks.svelte'

  import type { Task, TaskMetadata } from '../../types.svelte'
  import TaskDetailPanel from '../detail/task_detail_panel.svelte'

  import CreateTaskModal from './create_task_modal.svelte'
  import ImportTasksModal from './import_tasks_modal.svelte'
  import TaskStatusManagementDialogs from './task_status_management_dialogs.svelte'

  interface StatusDeleteTarget {
    status: string
    label: string
    taskCount: number
    id?: string
    isSystem?: boolean
  }

  interface Props {
    store: ReturnType<typeof createTaskStore>
    metadata: TaskMetadata
    projectOptions: { id: string; name: string }[]
    projectContext?: { selectedProject: { id: string; name: string } | null }

    createModalOpen: boolean
    onCreateModalOpenChange: (open: boolean) => void
    selectedCreateStatus: string
    onTaskCreated: (task: Task) => void

    importModalOpen: boolean
    onImportModalOpenChange: (open: boolean) => void

    detailModalOpen: boolean
    onDetailModalOpenChange: (open: boolean) => void
    selectedTask: Task | null
    onDetailClose: () => void

    createStatusModalOpen: boolean
    createStatusName: string
    createStatusError: string
    createStatusSubmitting: boolean
    onCreateStatusSubmit: () => void
    onCreateStatusDialogClose: () => void
    onCreateStatusModalOpenChange: (open: boolean) => void
    onCreateStatusNameChange: (value: string) => void

    deleteStatusModalOpen: boolean
    deleteStatusError: string
    deleteStatusSubmitting: boolean
    statusDeleteTarget: StatusDeleteTarget | null
    hasDeleteTargetTasks: boolean
    onDeleteStatusConfirm: () => void
    onDeleteStatusDialogClose: () => void
    onDeleteStatusModalOpenChange: (open: boolean) => void
  }

  const {
    store,
    metadata,
    projectOptions,
    projectContext,
    createModalOpen,
    onCreateModalOpenChange,
    selectedCreateStatus,
    onTaskCreated,
    importModalOpen,
    onImportModalOpenChange,
    detailModalOpen,
    onDetailModalOpenChange,
    selectedTask,
    onDetailClose,
    createStatusModalOpen,
    createStatusName,
    createStatusError,
    createStatusSubmitting,
    onCreateStatusSubmit,
    onCreateStatusDialogClose,
    onCreateStatusModalOpenChange,
    onCreateStatusNameChange,
    deleteStatusModalOpen,
    deleteStatusError,
    deleteStatusSubmitting,
    statusDeleteTarget,
    hasDeleteTargetTasks,
    onDeleteStatusConfirm,
    onDeleteStatusDialogClose,
    onDeleteStatusModalOpenChange,
  }: Props = $props()
</script>

<CreateTaskModal
  open={createModalOpen}
  onOpenChange={onCreateModalOpenChange}
  initialStatus={selectedCreateStatus}
  onCreated={onTaskCreated}
  statuses={metadata.statuses}
  priorities={metadata.priorities}
  labels={metadata.labels}
  projects={projectOptions}
  initialProjectId={(projectContext?.selectedProject?.id ?? projectOptions[0]?.id) || ''}
  users={metadata.users}
  parentTasks={metadata.parentTasks ?? []}
  availableSkills={metadata.availableSkills ?? []}
/>

<ImportTasksModal open={importModalOpen} onOpenChange={onImportModalOpenChange} />

<TaskDetailPanel
  open={detailModalOpen}
  onOpenChange={(open: boolean) => {
    onDetailModalOpenChange(open)
    if (!open) {
      onDetailClose()
    }
  }}
  task={selectedTask}
  {store}
  {metadata}
/>

<TaskStatusManagementDialogs
  createOpen={createStatusModalOpen}
  {createStatusName}
  {createStatusError}
  {createStatusSubmitting}
  onCreateSubmit={onCreateStatusSubmit}
  onCreateClose={onCreateStatusDialogClose}
  onCreateOpenChange={onCreateStatusModalOpenChange}
  onCreateStatusNameChange={onCreateStatusNameChange}
  deleteOpen={deleteStatusModalOpen}
  {deleteStatusError}
  {deleteStatusSubmitting}
  deleteStatusTarget={statusDeleteTarget}
  {hasDeleteTargetTasks}
  onDeleteConfirm={onDeleteStatusConfirm}
  onDeleteClose={onDeleteStatusDialogClose}
  onDeleteOpenChange={onDeleteStatusModalOpenChange}
/>

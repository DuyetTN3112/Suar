<script lang="ts">
  import type { Task, TaskMetadata, TaskStatusCategory } from '../../types.svelte'
  import TaskDetailPanel from '../detail/task_detail_panel.svelte'

  import CreateTaskModal from './create_task_modal.svelte'
  import TaskStatusManagementDialogs from './task_status_management_dialogs.svelte'

  interface StatusDeleteTarget {
    status: string
    label: string
    taskCount: number
    id?: string
    isSystem?: boolean
  }

  interface CapabilityDecision {
    allowed: boolean
    reason?: string | null
  }

  interface Props {
    metadata: TaskMetadata
    projectOptions: { id: string; name: string }[]
    projectContext?: { selectedProject: { id: string; name: string } | null }

    createModalOpen: boolean
    onCreateModalOpenChange: (open: boolean) => void
    selectedCreateStatus: string
    onTaskCreated: (task: Task) => void

    detailModalOpen: boolean
    onDetailModalOpenChange: (open: boolean) => void
    selectedTask: Task | null
    onDetailClose: () => void
    onDetailStatusChange?: (task: Task, toStatusId: string) => void
    getDetailStatusChangeDecision?: (task: Task, toStatusId: string) => CapabilityDecision

    createStatusModalOpen: boolean
    createStatusName: string
    createStatusCategory: TaskStatusCategory | ''
    createStatusDescription: string
    createStatusColor: string
    createStatusError: string
    createStatusSubmitting: boolean
    onCreateStatusSubmit: () => void
    onCreateStatusDialogClose: () => void
    onCreateStatusModalOpenChange: (open: boolean) => void
    onCreateStatusNameChange: (value: string) => void
    onCreateStatusCategoryChange: (value: TaskStatusCategory | '') => void
    onCreateStatusDescriptionChange: (value: string) => void
    onCreateStatusColorChange: (value: string) => void

    deleteStatusModalOpen: boolean
    deleteStatusError: string
    deleteStatusSubmitting: boolean
    statusDeleteTarget: StatusDeleteTarget | null
    hasDeleteTargetTasks: boolean
    isStatusMutationLocked: boolean
    onDeleteStatusConfirm: () => void
    onDeleteStatusDialogClose: () => void
    onDeleteStatusModalOpenChange: (open: boolean) => void
  }

  const {
    metadata,
    projectOptions,
    projectContext,
    createModalOpen,
    onCreateModalOpenChange,
    selectedCreateStatus,
    onTaskCreated,
    detailModalOpen,
    onDetailModalOpenChange,
    selectedTask,
    onDetailClose,
    onDetailStatusChange,
    getDetailStatusChangeDecision,
    createStatusModalOpen,
    createStatusName,
    createStatusCategory,
    createStatusDescription,
    createStatusColor,
    createStatusError,
    createStatusSubmitting,
    onCreateStatusSubmit,
    onCreateStatusDialogClose,
    onCreateStatusModalOpenChange,
    onCreateStatusNameChange,
    onCreateStatusCategoryChange,
    onCreateStatusDescriptionChange,
    onCreateStatusColorChange,
    deleteStatusModalOpen,
    deleteStatusError,
    deleteStatusSubmitting,
    statusDeleteTarget,
    hasDeleteTargetTasks,
    isStatusMutationLocked,
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

<TaskDetailPanel
  open={detailModalOpen}
  onOpenChange={(open: boolean) => {
    onDetailModalOpenChange(open)
    if (!open) {
      onDetailClose()
    }
  }}
  task={selectedTask}
  {metadata}
  onChangeStatus={onDetailStatusChange}
  getStatusChangeDecision={getDetailStatusChangeDecision}
/>

<TaskStatusManagementDialogs
  createOpen={createStatusModalOpen}
  {createStatusName}
  {createStatusCategory}
  {createStatusDescription}
  {createStatusColor}
  {createStatusError}
  {createStatusSubmitting}
  onCreateSubmit={onCreateStatusSubmit}
  onCreateClose={onCreateStatusDialogClose}
  onCreateOpenChange={onCreateStatusModalOpenChange}
  onCreateStatusNameChange={onCreateStatusNameChange}
  onCreateStatusCategoryChange={onCreateStatusCategoryChange}
  onCreateStatusDescriptionChange={onCreateStatusDescriptionChange}
  onCreateStatusColorChange={onCreateStatusColorChange}
  deleteOpen={deleteStatusModalOpen}
  {deleteStatusError}
  {deleteStatusSubmitting}
  deleteStatusTarget={statusDeleteTarget}
  {hasDeleteTargetTasks}
  {isStatusMutationLocked}
  onDeleteConfirm={onDeleteStatusConfirm}
  onDeleteClose={onDeleteStatusDialogClose}
  onDeleteOpenChange={onDeleteStatusModalOpenChange}
/>

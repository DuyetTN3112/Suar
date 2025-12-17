<script lang="ts">
  import type { TaskDetail, TaskMetadata, TaskStatusCategory } from '@/apps/user/modules/tasks/types/index.svelte'
  import TaskDetailPanel from '@/apps/user/modules/tasks/components/detail/task_detail_panel.svelte'

  import CreateTaskModal from '@/apps/user/modules/tasks/components/modals/create_task_modal.svelte'
  import TaskStatusManagementDialogs from '@/apps/user/modules/tasks/components/modals/task_status_management_dialogs.svelte'

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
    initialRoleId?: string

    createModalOpen: boolean
    onCreateModalOpenChange: (open: boolean) => void
    selectedCreateStatus: string
    onTaskCreated: (task: TaskDetail) => void

    detailModalOpen: boolean
    onDetailModalOpenChange: (open: boolean) => void
    selectedTask: TaskDetail | null
    detailTaskLoading?: boolean
    onDetailClose: () => void
    onDetailStatusChange?: (task: TaskDetail, toStatusId: string) => void
    getDetailStatusChangeDecision?: (task: TaskDetail, toStatusId: string) => CapabilityDecision

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

  const props: Props = $props()
</script>

<CreateTaskModal
  open={props.createModalOpen}
  onOpenChange={props.onCreateModalOpenChange}
  initialStatus={props.selectedCreateStatus}
  onCreated={props.onTaskCreated}
  statuses={props.metadata.statuses}
  priorities={props.metadata.priorities}
  labels={props.metadata.labels}
  projects={props.projectOptions}
  initialProjectId={(props.projectContext?.selectedProject?.id ?? props.projectOptions[0]?.id) || ''}
  initialRoleId={props.initialRoleId ?? ''}
  users={props.metadata.users}
  parentTasks={props.metadata.parentTasks ?? []}
  availableSkills={props.metadata.availableSkills ?? []}
  proficiencyLevels={props.metadata.proficiencyLevels ?? []}
/>

<TaskDetailPanel
  open={props.detailModalOpen}
  onOpenChange={(open: boolean) => {
    props.onDetailModalOpenChange(open)
    if (!open) {
      props.onDetailClose()
    }
  }}
  task={props.selectedTask}
  metadata={props.metadata}
  isHydratingDetail={props.detailTaskLoading ?? false}
  onChangeStatus={props.onDetailStatusChange}
  getStatusChangeDecision={props.getDetailStatusChangeDecision}
/>

<TaskStatusManagementDialogs
  createOpen={props.createStatusModalOpen}
  createStatusName={props.createStatusName}
  createStatusCategory={props.createStatusCategory}
  createStatusDescription={props.createStatusDescription}
  createStatusColor={props.createStatusColor}
  createStatusError={props.createStatusError}
  createStatusSubmitting={props.createStatusSubmitting}
  onCreateSubmit={props.onCreateStatusSubmit}
  onCreateClose={props.onCreateStatusDialogClose}
  onCreateOpenChange={props.onCreateStatusModalOpenChange}
  onCreateStatusNameChange={props.onCreateStatusNameChange}
  onCreateStatusCategoryChange={props.onCreateStatusCategoryChange}
  onCreateStatusDescriptionChange={props.onCreateStatusDescriptionChange}
  onCreateStatusColorChange={props.onCreateStatusColorChange}
  deleteOpen={props.deleteStatusModalOpen}
  deleteStatusError={props.deleteStatusError}
  deleteStatusSubmitting={props.deleteStatusSubmitting}
  deleteStatusTarget={props.statusDeleteTarget}
  hasDeleteTargetTasks={props.hasDeleteTargetTasks}
  isStatusMutationLocked={props.isStatusMutationLocked}
  onDeleteConfirm={props.onDeleteStatusConfirm}
  onDeleteClose={props.onDeleteStatusDialogClose}
  onDeleteOpenChange={props.onDeleteStatusModalOpenChange}
/>

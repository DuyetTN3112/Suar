<script lang="ts">
  /**
   * `/projects/:projectId/tasks` uses the organisation application shell, not
   * an organisation-wide task board.  Task authoring itself must remain one
   * surface: a Project Board, its modal, and the compatibility page must all
   * show the same structured contract fields.
   */
  import UnifiedCreateTaskForm from '@/apps/user/modules/tasks/components/modals/create_task_form.svelte'
  import type { TaskCreateFormData as UnifiedTaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'
  import type {
    TaskCreateAssigneeGroups,
    TaskCreateFormData,
  } from '@/apps/org/modules/tasks/types/create_form_types'

  interface Props {
    formData: TaskCreateFormData
    setFormData: (updater: (prev: TaskCreateFormData) => TaskCreateFormData) => void
    errors: Record<string, string>
    statuses: { value: string; label: string; slug?: string; category?: string }[]
    priorities: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    assigneeGroups?: TaskCreateAssigneeGroups
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    availableSkills?: {
      id: string
      name: string
      categoryCode?: string | null
      rubricVersionId?: string | null
      rubric_version_id?: string | null
      projectSkillId?: string | null
      project_skill_id?: string | null
      minimumTaskRequirementLevelId?: string | null
      minimum_task_requirement_level_id?: string | null
      maximumTaskRequirementLevelId?: string | null
      maximum_task_requirement_level_id?: string | null
    }[]
    proficiencyLevels?: { value: string; label: string }[]
    selectedProjectVisibility?: string | null
    formError?: string
  }

  const props: Props = $props()
  const unifiedFormData = $derived(props.formData as unknown as UnifiedTaskCreateFormData)

  function setUnifiedFormData(
    updater: (previous: UnifiedTaskCreateFormData) => UnifiedTaskCreateFormData
  ) {
    props.setFormData((previous) =>
      updater(previous as unknown as UnifiedTaskCreateFormData) as unknown as TaskCreateFormData
    )
  }
</script>

<UnifiedCreateTaskForm
  formData={unifiedFormData}
  setFormData={setUnifiedFormData}
  errors={props.errors}
  statuses={props.statuses}
  priorities={props.priorities}
  labels={props.labels}
  users={props.users}
  assigneeGroups={props.assigneeGroups}
  parentTasks={props.parentTasks}
  availableSkills={props.availableSkills}
  proficiencyLevels={props.proficiencyLevels}
  selectedProjectVisibility={props.selectedProjectVisibility}
  formError={props.formError}
/>

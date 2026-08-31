<script lang="ts">
  /**
   * The board route `/projects/:projectId/tasks` is rendered by the `org` app
   * shell, but Task authoring is one product workflow.  Keeping a second
   * modal here caused the Project board to retain the old, free-text form
   * while the user workspace had the structured contract form.
   *
   * This adapter deliberately delegates the board entry point to the single
   * authoring modal.  Its data source is still the Project board passed below;
   * only the presentation and authoring store are shared.
  */
  import UnifiedCreateTaskModal from '@/apps/user/modules/tasks/components/modals/create_task_modal.svelte'
  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialStatus?: string
    initialProjectId?: string
    initialRoleId?: string
    statuses?: { value: string; label: string; slug?: string; category?: string }[]
    projects?: { id: string; name: string }[]
    users?: { id: string; username: string; email: string }[]
    onCreated?: (task: TaskDetail) => void
    parentTasks?: { id: string; title: string; task_status_id: string | null }[]
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
    priorities?: { value: string; label: string }[]
    labels?: { value: string; label: string }[]
  }

  const props: Props = $props()
</script>

<UnifiedCreateTaskModal {...props} />

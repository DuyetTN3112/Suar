<script lang="ts">
  import axios from 'axios'
  import { LoaderCircle } from 'lucide-svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import { uiToast } from '@/apps/user/shared/lib/ui_toast'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    displayName: string
    shortName?: string
    genericDescription?: string
  }

  interface Skill {
    id: string
    skillName: string
    categoryCode?: string
  }

  interface ProjectSkill {
    id: string
    skill: Skill
    isActive: boolean
    rubricVersionId?: string | null
    minimumTaskRequirementLevelId?: string | null
    maximumTaskRequirementLevelId?: string | null
  }

  interface Props {
    open: boolean
    activeProjectSkills: ProjectSkill[]
    proficiencyLevels: ProficiencyLevel[]
    taskId: string
    onAddSuccess: () => void
  }

  let {
    open = $bindable(),
    activeProjectSkills,
    proficiencyLevels,
    taskId,
    onAddSuccess,
  }: Props = $props()

  let selectedProjectSkillId = $state('')
  let addMinLevelId = $state('')
  let addRubricVersionId = $state('')
  let addMandatory = $state(true)
  let addImportance = $state<'low' | 'medium' | 'high' | 'critical'>('medium')
  let addWeight = $state(1.0)
  let addNotes = $state('')
  let adding = $state(false)
  const { t } = useTranslation()
  const selectedProjectSkill = $derived(
    activeProjectSkills.find((projectSkill) => projectSkill.id === selectedProjectSkillId) ?? null
  )
  const allowedMinimumLevels = $derived(
    !selectedProjectSkill?.minimumTaskRequirementLevelId ||
      !selectedProjectSkill.maximumTaskRequirementLevelId
      ? []
      : proficiencyLevels.filter(
          (level) =>
            level.ordinal >=
              (proficiencyLevels.find(
                (candidate) => candidate.id === selectedProjectSkill?.minimumTaskRequirementLevelId
              )?.ordinal ?? Number.POSITIVE_INFINITY) &&
            level.ordinal <=
              (proficiencyLevels.find(
                (candidate) => candidate.id === selectedProjectSkill?.maximumTaskRequirementLevelId
              )?.ordinal ?? Number.NEGATIVE_INFINITY)
        )
  )

  $effect(() => {
    addRubricVersionId = selectedProjectSkill?.rubricVersionId ?? ''
    if (!allowedMinimumLevels.some((level) => level.id === addMinLevelId)) {
      addMinLevelId = allowedMinimumLevels[0]?.id ?? ''
    }
  })

  function resetAdd() {
    selectedProjectSkillId = ''
    addMinLevelId = ''
    addRubricVersionId = ''
    addMandatory = true
    addImportance = 'medium'
    addWeight = 1.0
    addNotes = ''
  }

  async function handleAdd(e: Event) {
    e.preventDefault()
    if (!selectedProjectSkillId) return
    if (!selectedProjectSkill) return

    adding = true
    try {
      await axios.post(`/api/v1/tasks/${taskId}/requirements`, {
        skillId: selectedProjectSkill.skill.id,
        projectSkillId: selectedProjectSkillId,
        minimumLevelId: addMinLevelId || null,
        rubricVersionId: addRubricVersionId || null,
        isMandatory: addMandatory,
        importance: addImportance,
        weight: addWeight,
        requirementNotes: addNotes || null,
      })
      uiToast.success(t('task.skill_requirements.add_success', {}, 'Skill requirement added'))
      open = false
      resetAdd()
      onAddSuccess()
    } catch {
      uiToast.error(t('task.skill_requirements.add_error', {}, 'Unable to add skill requirement'))
    } finally {
      adding = false
    }
  }

  function handleCancel() {
    open = false
    resetAdd()
  }
</script>

{#if open}
  <Dialog bind:open={open}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('task.skill_requirements.add_dialog_title', {}, 'Add skill requirement')}</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleAdd} class="space-y-4 pt-2">
        <div class="space-y-1.5">
          <Label for="add-skill">{t('task.skill_requirements.select_skill_label', {}, 'Select skill')}</Label>
          <select
            id="add-skill"
            bind:value={selectedProjectSkillId}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            required
          >
            <option value="" disabled>{t('task.skill_requirements.select_skill_placeholder', {}, 'Select skill from catalog')}</option>
            {#each activeProjectSkills as projectSkill (projectSkill.id)}
              <option value={projectSkill.id}>{projectSkill.skill.skillName}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-1.5">
          <Label for="add-minimum-level">Mức tối thiểu để nhận Task</Label>
          <select
            id="add-minimum-level"
            bind:value={addMinLevelId}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            disabled={!selectedProjectSkill || allowedMinimumLevels.length === 0}
            required
          >
            <option value="" disabled>Chọn mức tối thiểu</option>
            {#each allowedMinimumLevels as level (level.id)}
              <option value={level.id}>{level.shortName ?? level.displayName}</option>
            {/each}
          </select>
          {#if selectedProjectSkill && allowedMinimumLevels.length === 0}
            <p class="text-xs text-destructive">Kỹ năng này chưa được Project cấu hình khoảng level.</p>
          {:else if allowedMinimumLevels.length > 0}
            <p class="text-xs text-muted-foreground">
              Project cho phép Task đặt mức tối thiểu từ
              {allowedMinimumLevels[0]?.shortName ?? allowedMinimumLevels[0]?.displayName}
              đến
              {allowedMinimumLevels[allowedMinimumLevels.length - 1]?.shortName ?? allowedMinimumLevels[allowedMinimumLevels.length - 1]?.displayName}.
            </p>
          {/if}
        </div>

        <div class="space-y-1.5">
          <Label for="add-rubric">{t('task.skill_requirements.rubric_label', {}, 'Rubric')}</Label>
          <select
            id="add-rubric"
            bind:value={addRubricVersionId}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t('task.skill_requirements.no_rubric_option', {}, 'No rubric binding')}</option>
            {#if selectedProjectSkill?.rubricVersionId}
              <option value={selectedProjectSkill.rubricVersionId}>
                {t('task.skill_requirements.project_default_rubric', {}, 'Project default rubric')}
              </option>
            {/if}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="add-importance">{t('task.skill_requirements.importance_label', {}, 'Importance')}</Label>
            <select
              id="add-importance"
              bind:value={addImportance}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="low">{t('ui_misc.tasks.importance.low', {}, 'Low')}</option>
              <option value="medium">{t('ui_misc.tasks.importance.medium', {}, 'Medium')}</option>
              <option value="high">{t('ui_misc.tasks.importance.high', {}, 'High')}</option>
              <option value="critical">{t('ui_misc.tasks.importance.critical', {}, 'Critical')}</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="add-weight">{t('task.skill_requirements.weight_label', {}, 'Weight')}</Label>
            <Input id="add-weight" type="number" step="0.1" min="0" bind:value={addWeight} />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input id="add-mandatory" type="checkbox" bind:checked={addMandatory} class="h-4 w-4 rounded border-input" />
          <label for="add-mandatory" class="text-sm text-foreground">
            {t('task.skill_requirements.mandatory_min_level_task', {}, 'Must meet minimum level before accepting the task')}
          </label>
        </div>

        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" onclick={handleCancel}>{t('common.cancel', {}, 'Cancel')}</Button>
          <Button type="submit" disabled={!selectedProjectSkillId || !addMinLevelId || adding}>
            {#if adding}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            {t('task.skill_requirements.add_button', {}, 'Add')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}

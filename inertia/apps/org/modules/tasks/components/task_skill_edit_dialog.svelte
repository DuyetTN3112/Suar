<script lang="ts">
  import axios from 'axios'
  import { LoaderCircle } from 'lucide-svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import LevelRangeSelector from '@/apps/org/modules/profile/components/level_range_selector.svelte'
  import { uiToast } from '@/apps/org/shared/lib/ui_toast'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

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

  interface TaskRequirement {
    id: string
    skillId: string
    projectSkillId?: string | null
    minimumLevelId?: string | null
    targetLevelId?: string | null
    assessmentCeilingLevelId?: string | null
    rubricVersionId?: string | null
    isMandatory: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    weight: number
    skill?: Skill
    requirementNotes?: string | null
  }

  interface ProjectSkill {
    id: string
    rubricVersionId?: string | null
  }

  interface Props {
    open: boolean
    requirement: TaskRequirement | null
    projectSkills?: ProjectSkill[]
    proficiencyLevels: ProficiencyLevel[]
    taskId: string
    onEditSuccess: () => void
  }

  let {
    open = $bindable(),
    requirement,
    projectSkills = [],
    proficiencyLevels,
    taskId,
    onEditSuccess,
  }: Props = $props()

  let editMinLevelId = $state('')
  let editTargetLevelId = $state('')
  let editCeilingLevelId = $state('')
  let editRubricVersionId = $state('')
  let editMandatory = $state(false)
  let editImportance = $state<'low' | 'medium' | 'high' | 'critical'>('medium')
  let editWeight = $state(1.0)
  let editNotes = $state('')
  let saving = $state(false)
  const { t } = useTranslation()
  const projectDefaultRubricVersionId = $derived(
    projectSkills.find((projectSkill) => projectSkill.id === requirement?.projectSkillId)
      ?.rubricVersionId ?? null
  )
  const rubricOptions = $derived(
    [...new Set([requirement?.rubricVersionId ?? null, projectDefaultRubricVersionId].filter(Boolean) as string[])]
  )

  $effect(() => {
    if (open && requirement) {
      editMinLevelId = requirement.minimumLevelId ?? ''
      editTargetLevelId = requirement.targetLevelId ?? ''
      editCeilingLevelId = requirement.assessmentCeilingLevelId ?? ''
      editRubricVersionId = requirement.rubricVersionId ?? projectDefaultRubricVersionId ?? ''
      editMandatory = requirement.isMandatory
      editImportance = requirement.importance
      editWeight = requirement.weight
      editNotes = requirement.requirementNotes ?? ''
    }
  })

  async function handleSave(e: Event) {
    e.preventDefault()
    if (!requirement) return
    saving = true
    try {
      await axios.put(`/api/v1/tasks/${taskId}/requirements/${requirement.id}`, {
        minimumLevelId: editMinLevelId || null,
        targetLevelId: editTargetLevelId || null,
        assessmentCeilingLevelId: editCeilingLevelId || null,
        rubricVersionId: editRubricVersionId || null,
        isMandatory: editMandatory,
        importance: editImportance,
        weight: editWeight,
        requirementNotes: editNotes || null,
      })
      uiToast.success(t('task.skill_requirements.save_success', {}, 'Skill requirement updated'))
      open = false
      onEditSuccess()
    } catch {
      uiToast.error(t('task.skill_requirements.save_error', {}, 'Unable to save skill requirement'))
    } finally {
      saving = false
    }
  }
</script>

{#if open && requirement}
  <Dialog bind:open={open}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('task.skill_requirements.edit_dialog_title', { skillName: requirement.skill?.skillName ?? '' }, 'Edit: :skillName')}</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleSave} class="space-y-4 pt-2">
        <LevelRangeSelector
          levels={proficiencyLevels}
          bind:minLevelId={editMinLevelId}
          bind:targetLevelId={editTargetLevelId}
          bind:ceilingLevelId={editCeilingLevelId}
        />

        <div class="space-y-1.5">
          <Label for="edit-rubric">{t('task.skill_requirements.rubric_label', {}, 'Rubric')}</Label>
          <select
            id="edit-rubric"
            bind:value={editRubricVersionId}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t('task.skill_requirements.no_rubric_option', {}, 'No rubric binding')}</option>
            {#each rubricOptions as rubricVersionId (rubricVersionId)}
              <option value={rubricVersionId}>
                {rubricVersionId === projectDefaultRubricVersionId
                  ? t('task.skill_requirements.project_default_rubric', {}, 'Project default rubric')
                  : t('task.skill_requirements.current_rubric', {}, 'Current rubric')}
              </option>
            {/each}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="edit-imp">{t('task.skill_requirements.importance_label', {}, 'Importance')}</Label>
            <select
              id="edit-imp"
              bind:value={editImportance}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="low">{t('ui_misc.tasks.importance.low', {}, 'Low')}</option>
              <option value="medium">{t('ui_misc.tasks.importance.medium', {}, 'Medium')}</option>
              <option value="high">{t('ui_misc.tasks.importance.high', {}, 'High')}</option>
              <option value="critical">{t('ui_misc.tasks.importance.critical', {}, 'Critical')}</option>
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="edit-weight">{t('task.skill_requirements.weight_label', {}, 'Weight')}</Label>
            <Input id="edit-weight" type="number" step="0.1" min="0" bind:value={editWeight} />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input id="edit-mandatory" type="checkbox" bind:checked={editMandatory} class="h-4 w-4 rounded border-input" />
          <label for="edit-mandatory" class="text-sm text-foreground">{t('task.skill_requirements.mandatory_min_level', {}, 'Must meet minimum level')}</label>
        </div>

        <div class="flex justify-end gap-2">
          <Button type="button" variant="outline" onclick={() => { open = false }}>{t('common.cancel', {}, 'Cancel')}</Button>
          <Button type="submit" disabled={saving}>
            {#if saving}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            {t('common.save', {}, 'Save')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}

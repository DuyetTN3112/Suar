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
  import LevelRangeSelector from '@/apps/user/modules/profile/components/level_range_selector.svelte'
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

  interface TaskRequirement {
    id: string
    skillId: string
    minimumLevelId?: string | null
    targetLevelId?: string | null
    assessmentCeilingLevelId?: string | null
    isMandatory: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    weight: number
    skill?: Skill
    requirementNotes?: string | null
  }

  interface Props {
    open: boolean
    requirement: TaskRequirement | null
    proficiencyLevels: ProficiencyLevel[]
    taskId: string
    onEditSuccess: () => void
  }

  let {
    open = $bindable(),
    requirement,
    proficiencyLevels,
    taskId,
    onEditSuccess,
  }: Props = $props()

  let editMinLevelId = $state('')
  let editTargetLevelId = $state('')
  let editCeilingLevelId = $state('')
  let editMandatory = $state(false)
  let editImportance = $state<'low' | 'medium' | 'high' | 'critical'>('medium')
  let editWeight = $state(1.0)
  let editNotes = $state('')
  let saving = $state(false)
  const { t } = useTranslation()

  $effect(() => {
    if (open && requirement) {
      editMinLevelId = requirement.minimumLevelId ?? ''
      editTargetLevelId = requirement.targetLevelId ?? ''
      editCeilingLevelId = requirement.assessmentCeilingLevelId ?? ''
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

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="edit-imp">{t('task.skill_requirements.importance_label', {}, 'Importance')}</Label>
            <select
              id="edit-imp"
              bind:value={editImportance}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
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

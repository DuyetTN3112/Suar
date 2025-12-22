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

  interface ProjectSkill {
    id: string
    skill: Skill
    isActive: boolean
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
  let addTargetLevelId = $state('')
  let addCeilingLevelId = $state('')
  let addMandatory = $state(true)
  let addImportance = $state<'low' | 'medium' | 'high' | 'critical'>('medium')
  let addWeight = $state(1.0)
  let addNotes = $state('')
  let adding = $state(false)
  const { t } = useTranslation()

  function resetAdd() {
    selectedProjectSkillId = ''
    addMinLevelId = ''
    addTargetLevelId = ''
    addCeilingLevelId = ''
    addMandatory = true
    addImportance = 'medium'
    addWeight = 1.0
    addNotes = ''
  }

  async function handleAdd(e: Event) {
    e.preventDefault()
    if (!selectedProjectSkillId) return
    const selectedProjectSkill = activeProjectSkills.find((p) => p.id === selectedProjectSkillId)
    if (!selectedProjectSkill) return

    adding = true
    try {
      await axios.post(`/api/v1/tasks/${taskId}/requirements`, {
        skillId: selectedProjectSkill.skill.id,
        projectSkillId: selectedProjectSkillId,
        minimumLevelId: addMinLevelId || null,
        targetLevelId: addTargetLevelId || null,
        assessmentCeilingLevelId: addCeilingLevelId || null,
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

        <LevelRangeSelector
          levels={proficiencyLevels}
          bind:minLevelId={addMinLevelId}
          bind:targetLevelId={addTargetLevelId}
          bind:ceilingLevelId={addCeilingLevelId}
        />

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="add-importance">{t('task.skill_requirements.importance_label', {}, 'Importance')}</Label>
            <select
              id="add-importance"
              bind:value={addImportance}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
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
          <Button type="submit" disabled={!selectedProjectSkillId || adding}>
            {#if adding}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            {t('task.skill_requirements.add_button', {}, 'Add')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}

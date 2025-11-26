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
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    displayName: string
    shortName?: string
    genericDescription?: string
  }

  interface ProjectSkill {
    id: string
    skill: { id: string; skillName: string; categoryCode?: string }
    isActive: boolean
  }

  interface RoleSkill {
    id: string
    skill?: { skillName: string }
    minimumLevel?: ProficiencyLevel
    targetLevel?: ProficiencyLevel
    assessmentCeilingLevel?: ProficiencyLevel
    isMandatory: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    weight: number
  }

  interface Props {
    projectId: string
    roleId: string
    roleSkill?: RoleSkill | null
    open: boolean
    activeProjectSkills: ProjectSkill[]
    proficiencyLevels: ProficiencyLevel[]
    onSuccess: () => void
  }

  let {
    projectId,
    roleId,
    roleSkill = null,
    open = $bindable(),
    activeProjectSkills,
    proficiencyLevels,
    onSuccess,
  }: Props = $props()

  const { t } = $derived(useTranslation())
  const isEditMode = $derived(roleSkill !== null)
  const importanceOptions = ['low', 'medium', 'high', 'critical'] as const

  let selectedProjectSkillId = $state('')
  let minLevelId = $state('')
  let targetLevelId = $state('')
  let ceilingLevelId = $state('')
  let isMandatory = $state(false)
  let importance = $state<'low' | 'medium' | 'high' | 'critical'>('medium')
  let weight = $state(1.0)
  let processing = $state(false)

  $effect(() => {
    if (open) {
      if (roleSkill) {
        selectedProjectSkillId = ''
        minLevelId = roleSkill.minimumLevel?.id ?? ''
        targetLevelId = roleSkill.targetLevel?.id ?? ''
        ceilingLevelId = roleSkill.assessmentCeilingLevel?.id ?? ''
        isMandatory = roleSkill.isMandatory
        importance = roleSkill.importance
        weight = roleSkill.weight
      } else {
        selectedProjectSkillId = ''
        minLevelId = ''
        targetLevelId = ''
        ceilingLevelId = ''
        isMandatory = false
        importance = 'medium'
        weight = 1.0
      }
    }
  })

  async function handleSubmit(e: Event) {
    e.preventDefault()
    processing = true
    try {
      if (isEditMode && roleSkill) {
        await axios.put(
          `/api/v1/projects/${projectId}/professional-roles/${roleId}/skills/${roleSkill.id}`,
          {
            minimumLevelId: minLevelId || null,
            targetLevelId: targetLevelId || null,
            assessmentCeilingLevelId: ceilingLevelId || null,
            isMandatory: isMandatory,
            importance,
            weight,
          }
        )
        uiToast.success(t('project.role_skill_dialog.update_success', {}, 'Skill settings updated'))
      } else {
        if (!selectedProjectSkillId) return
        await axios.post(
          `/api/v1/projects/${projectId}/professional-roles/${roleId}/skills`,
          {
            projectSkillId: selectedProjectSkillId,
            minimumLevelId: minLevelId || null,
            targetLevelId: targetLevelId || null,
            assessmentCeilingLevelId: ceilingLevelId || null,
            isMandatory: isMandatory,
            importance,
            weight,
          }
        )
        uiToast.success(t('project.role_skill_dialog.add_success', {}, 'Skill added to role'))
      }
      open = false
      onSuccess()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      uiToast.error(error.response?.data?.message ?? t('project.role_skill_dialog.save_error', {}, 'Unable to save settings'))
    } finally {
      processing = false
    }
  }
</script>

{#if open}
  <Dialog bind:open={open}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditMode ? t('project.role_skill_dialog.edit_title', {}, 'Edit skill settings in role') : t('project.role_skill_dialog.add_title', {}, 'Add skill to role')}</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleSubmit} class="space-y-4 pt-2">
        {#if !isEditMode}
          <div class="space-y-1.5">
            <Label for="rs-skill">{t('project.role_skill_dialog.skill_label', {}, 'Choose skill from catalog')}</Label>
            <select
              id="rs-skill"
              bind:value={selectedProjectSkillId}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              required
            >
              <option value="" disabled>{t('project.role_skill_dialog.skill_placeholder', {}, 'Choose skill')}</option>
              {#each activeProjectSkills as ps (ps.id)}
                <option value={ps.id}>{ps.skill.skillName}</option>
              {/each}
            </select>
            {#if activeProjectSkills.length === 0}
              <p class="text-xs text-muted-foreground">
                {t('project.role_skill_dialog.all_skills_added', {}, 'This role already has all active skills in the catalog.')}
              </p>
            {/if}
          </div>
        {/if}

        <LevelRangeSelector
          levels={proficiencyLevels}
          bind:minLevelId
          bind:targetLevelId
          bind:ceilingLevelId
        />

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="rs-importance">{t('project.role_skill_dialog.importance_label', {}, 'Importance')}</Label>
            <select
              id="rs-importance"
              bind:value={importance}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              {#each importanceOptions as level}
                <option value={level}>{t(`project.role_skill_dialog.importance.${level}`, {}, level)}</option>
              {/each}
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="rs-weight">{t('project.role_skill_dialog.weight_label', {}, 'Weight')}</Label>
            <Input id="rs-weight" type="number" step="0.1" min="0" bind:value={weight} />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input id="rs-mandatory" type="checkbox" bind:checked={isMandatory} class="h-4 w-4 rounded border-primary/50" />
          <label for="rs-mandatory" class="text-sm text-foreground">
            {isEditMode ? t('project.role_skill_dialog.mandatory_full', {}, 'Must meet the minimum level') : t('project.role_skill_dialog.mandatory_short', {}, 'Mandatory')}
          </label>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onclick={() => { open = false }}>{t('project.role_skill_dialog.cancel', {}, 'Cancel')}</Button>
          <Button type="submit" disabled={(!isEditMode && !selectedProjectSkillId) || processing}>
            {#if processing}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            {isEditMode ? t('project.role_skill_dialog.save', {}, 'Save changes') : t('project.role_skill_dialog.add_skill', {}, 'Add skill')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}

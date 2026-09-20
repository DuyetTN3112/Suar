<script lang="ts">
  import axios from 'axios'
  import { LoaderCircle } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { uiToast } from '@/apps/user/shared/lib/ui_toast'
  import {
    getErrorMessage,
    isValidRange,
    type ProficiencyLevel,
    type ProjectSkill,
    type RubricVersion,
  } from '@/apps/shared/projects/project_skills_types'

  interface Props {
    open: boolean
    projectId: string
    editingSkill: ProjectSkill | null
    proficiencyLevels: ProficiencyLevel[]
    onSaved: () => Promise<void> | void
  }

  let {
    open = $bindable(false),
    projectId,
    editingSkill = $bindable(null),
    proficiencyLevels,
    onSaved,
  }: Props = $props()

  const { t } = useTranslation()

  let displayNameOverride = $state('')
  let descriptionOverride = $state('')
  let editMinimumTaskRequirementLevelId = $state('')
  let editMaximumTaskRequirementLevelId = $state('')
  let editRubricVersionId = $state('')
  let rubricVersions = $state<RubricVersion[]>([])
  let rubricLoading = $state(false)
  let saving = $state(false)

  $effect(() => {
    if (open && editingSkill) {
      displayNameOverride = editingSkill.displayNameOverride ?? ''
      descriptionOverride = editingSkill.descriptionOverride ?? ''
      editRubricVersionId = editingSkill.rubricVersionId ?? ''
      editMinimumTaskRequirementLevelId = editingSkill.minimumTaskRequirementLevelId ?? ''
      editMaximumTaskRequirementLevelId = editingSkill.maximumTaskRequirementLevelId ?? ''
      void loadRubrics(editingSkill.skill.id)
    }
  })

  async function loadRubrics(skillId: string) {
    rubricVersions = []
    rubricLoading = true
    try {
      const response = await axios.get<{ data: RubricVersion[] }>(
        `/api/v1/skills/${skillId}/rubrics`
      )
      rubricVersions = response.data.data.filter(
        (version) => version.status === 'published' && version.effective_to === null
      )
    } catch (error: unknown) {
      uiToast.error(
        getErrorMessage(
          error,
          'Không tải được rubric global của skill này. Hãy publish rubric trước.'
        )
      )
    } finally {
      rubricLoading = false
    }
  }

  async function handleSaveOverrides(e: Event) {
    e.preventDefault()
    if (!editingSkill) return
    saving = true
    try {
      await axios.put(`/api/v1/projects/${projectId}/skills/${editingSkill.id}`, {
        displayNameOverride: displayNameOverride || null,
        descriptionOverride: descriptionOverride || null,
        rubricVersionId: editRubricVersionId || null,
        minimumTaskRequirementLevelId: editMinimumTaskRequirementLevelId || null,
        maximumTaskRequirementLevelId: editMaximumTaskRequirementLevelId || null,
      })
      uiToast.success(t('project.skills_tab.save_success', {}, 'Skill settings updated'))
      open = false
      editingSkill = null
      await onSaved()
    } catch (error: unknown) {
      uiToast.error(getErrorMessage(error, t('project.skills_tab.save_error', {}, 'Unable to save skill settings')))
    } finally {
      saving = false
    }
  }

  function handleCancel() {
    open = false
    editingSkill = null
  }
</script>

{#if open && editingSkill}
  <Dialog bind:open>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('project.skills_tab.edit_title', { skill: editingSkill.skill.skillName }, `Configure: ${editingSkill.skill.skillName}`)}</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleSaveOverrides} class="space-y-4 pt-2">
        <div class="space-y-1.5">
          <Label for="ps-display-name">{t('project.skills_tab.display_name_label', {}, 'Custom display name')}</Label>
          <Input
            id="ps-display-name"
            bind:value={displayNameOverride}
            placeholder={editingSkill.skill.skillName}
          />
        </div>
        <div class="space-y-1.5">
          <Label for="ps-description">{t('project.skills_tab.description_label', {}, 'Custom description')}</Label>
          <Textarea
            id="ps-description"
            bind:value={descriptionOverride}
            rows={3}
            placeholder={t('project.skills_tab.description_placeholder', {}, 'Describe this skill in this project context...')}
          />
        </div>
        <div class="space-y-1.5">
          <Label for="ps-rubric">Rubric global dùng cho task</Label>
          <select
            id="ps-rubric"
            bind:value={editRubricVersionId}
            disabled={rubricLoading}
            class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">Chưa gắn rubric</option>
            {#each rubricVersions as rubric (rubric.id)}
              <option value={rubric.id}>Rubric v{rubric.version} · đã publish</option>
            {/each}
          </select>
          {#if rubricLoading}
            <p class="text-xs text-muted-foreground">Đang tải rubric global...</p>
          {:else if rubricVersions.length === 0}
            <p class="text-xs text-amber-700 dark:text-amber-300">
              Skill này chưa có rubric published. Skill vẫn có thể nằm trong Project, nhưng chưa dùng để giao task được.
            </p>
          {:else}
            <p class="text-xs text-muted-foreground">
              Chỉ rubric published đang hiệu lực mới được gắn vào Project Skill.
            </p>
          {/if}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="ps-edit-minimum">Mức task thấp nhất</Label>
            <select
              id="ps-edit-minimum"
              bind:value={editMinimumTaskRequirementLevelId}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              required
            >
              <option value="" disabled>Chọn level</option>
              {#each proficiencyLevels as level (level.id)}
                <option value={level.id}>{level.code.toUpperCase()} · {level.displayName}</option>
              {/each}
            </select>
          </div>
          <div class="space-y-1.5">
            <Label for="ps-edit-maximum">Mức task cao nhất</Label>
            <select
              id="ps-edit-maximum"
              bind:value={editMaximumTaskRequirementLevelId}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              required
            >
              <option value="" disabled>Chọn level</option>
              {#each proficiencyLevels as level (level.id)}
                <option value={level.id}>{level.code.toUpperCase()} · {level.displayName}</option>
              {/each}
            </select>
          </div>
        </div>
        <p class="text-xs text-muted-foreground">
          Task chỉ được chọn mức tối thiểu trong khoảng này. Người cao hơn vẫn đủ điều kiện.
        </p>
        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onclick={handleCancel}>
            {t('project.skills_tab.cancel', {}, 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={
              saving ||
              !isValidRange(
                editMinimumTaskRequirementLevelId,
                editMaximumTaskRequirementLevelId,
                proficiencyLevels
              )
            }
          >
            {#if saving}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            {t('project.skills_tab.save_settings', {}, 'Save settings')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}

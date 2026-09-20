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
  import SkillSearchCombobox from '@/apps/user/modules/search/components/skill_search_combobox.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { uiToast } from '@/apps/user/shared/lib/ui_toast'
  import {
    getErrorMessage,
    isValidRange,
    type ProficiencyLevel,
    type ProjectSkillCategoryFilter,
    type Skill,
  } from '@/apps/shared/projects/project_skills_types'

  interface Props {
    open: boolean
    projectId: string
    addableSkills: Skill[]
    proficiencyLevels: ProficiencyLevel[]
    onAdded: () => Promise<void> | void
  }

  let {
    open = $bindable(false),
    projectId,
    addableSkills,
    proficiencyLevels,
    onAdded,
  }: Props = $props()

  const { t } = useTranslation()

  let selectedSkillId = $state('')
  let customSkillName = $state('')
  let customSkillCategory = $state<ProjectSkillCategoryFilter>('technology')
  let adding = $state(false)
  let addMinimumTaskRequirementLevelId = $state('')
  let addMaximumTaskRequirementLevelId = $state('')

  async function handleAdd(e: Event) {
    e.preventDefault()
    const isCustomSkill = customSkillName.trim().length > 0
    if (
      (!selectedSkillId && !isCustomSkill) ||
      !addMinimumTaskRequirementLevelId ||
      !addMaximumTaskRequirementLevelId
    ) {
      return
    }
    adding = true
    try {
      if (isCustomSkill) {
        await axios.post(`/api/v1/projects/${projectId}/skills/custom`, {
          name: customSkillName.trim(),
          categoryCode: customSkillCategory,
          minimumTaskRequirementLevelId: addMinimumTaskRequirementLevelId,
          maximumTaskRequirementLevelId: addMaximumTaskRequirementLevelId,
        })
      } else {
        await axios.post(`/api/v1/projects/${projectId}/skills`, {
          skillId: selectedSkillId,
          minimumTaskRequirementLevelId: addMinimumTaskRequirementLevelId,
          maximumTaskRequirementLevelId: addMaximumTaskRequirementLevelId,
        })
      }
      uiToast.success(t('project.skills_tab.add_success', {}, 'Skill added to Catalog'))
      open = false
      selectedSkillId = ''
      customSkillName = ''
      customSkillCategory = 'technology'
      addMinimumTaskRequirementLevelId = ''
      addMaximumTaskRequirementLevelId = ''
      await onAdded()
    } catch (error: unknown) {
      uiToast.error(getErrorMessage(error, t('project.skills_tab.add_error', {}, 'Unable to add skill')))
    } finally {
      adding = false
    }
  }
</script>

<Dialog bind:open>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t('project.skills_tab.add_title', {}, 'Add Skill to Catalog')}</DialogTitle>
    </DialogHeader>
    <form onsubmit={handleAdd} class="space-y-4 pt-2">
      <div class="space-y-2">
        <Label>{t('project.skills_tab.select_skill', {}, 'Choose Skill')}</Label>
        <SkillSearchCombobox
          skills={addableSkills}
          bind:value={selectedSkillId}
          onSelect={() => { customSkillName = '' }}
          placeholder={t('project.skills_tab.select_skill_placeholder', {}, 'Search and choose a skill...')}
        />
        <div class="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div class="space-y-1.5">
            <Label for="ps-add-custom-name">Hoặc tạo skill mới</Label>
            <Input
              id="ps-add-custom-name"
              bind:value={customSkillName}
              oninput={() => { selectedSkillId = '' }}
              placeholder="Nhập tên skill chưa có trong catalog"
            />
          </div>
          <select
            aria-label="Nhóm skill mới"
            bind:value={customSkillCategory}
            class="flex h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="technology">Công nghệ</option>
            <option value="engineering">Kỹ thuật phần mềm</option>
            <option value="soft_skill">Kỹ năng mềm</option>
            <option value="delivery">Quản lý công việc</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <Label for="ps-add-minimum">Mức task thấp nhất</Label>
            <select
              id="ps-add-minimum"
              bind:value={addMinimumTaskRequirementLevelId}
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
            <Label for="ps-add-maximum">Mức task cao nhất</Label>
            <select
              id="ps-add-maximum"
              bind:value={addMaximumTaskRequirementLevelId}
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
          Đây là khoảng level task được phép yêu cầu; không phải trần năng lực người làm.
        </p>
        {#if addableSkills.length === 0}
          <p class="text-xs text-muted-foreground">
            {t('project.skills_tab.all_skills_added', {}, 'All skills are already in the Catalog.')}
          </p>
        {/if}
      </div>
      <div class="flex justify-end gap-2">
        <Button type="button" variant="outline" onclick={() => { open = false }}>
          {t('project.skills_tab.cancel', {}, 'Cancel')}
        </Button>
        <Button
          type="submit"
          disabled={
            (!selectedSkillId && !customSkillName.trim()) ||
            !isValidRange(
              addMinimumTaskRequirementLevelId,
              addMaximumTaskRequirementLevelId,
              proficiencyLevels
            ) ||
            adding
          }
        >
          {#if adding}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
          {t('project.skills_tab.add_to_catalog', {}, 'Add to Catalog')}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

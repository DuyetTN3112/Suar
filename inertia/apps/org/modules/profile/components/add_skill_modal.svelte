<script lang="ts">
  /**
   * AddSkillModal — dialog for adding a new skill to the user's profile.
   */
  import { router } from '@inertiajs/svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import SelectValue from '@/apps/org/shared/ui/select_value.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import { getProfileCategoryLabel } from '@/apps/org/modules/profile/profile_theme'

  import type { AvailableSkill, ProficiencyLevelOption } from '../types.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    availableSkills: AvailableSkill[]
    proficiencyLevels: ProficiencyLevelOption[]
    existingSkillIds?: string[]
  }

  let { open = $bindable(), onOpenChange, availableSkills, proficiencyLevels, existingSkillIds = [] }: Props = $props()

  let selectedSkillId = $state('')
  let selectedLevelCode = $state('')
  let submitting = $state(false)
  const { t } = useTranslation()

  function categoryLabel(categoryCode: string): string {
    return t(
      `user.profile_categories.${categoryCode}`,
      {},
      getProfileCategoryLabel(categoryCode)
    )
  }

  function proficiencyLevelLabel(level: ProficiencyLevelOption): string {
    return t(`user.proficiency_levels.labels.${level.value}`, {}, level.label)
  }

  // Filter out already-added skills
  const filteredSkills = $derived(
    availableSkills.filter((s) => s.is_active && !existingSkillIds.includes(s.id))
  )

  const isValid = $derived(selectedSkillId !== '' && selectedLevelCode !== '')

  function handleSubmit() {
    if (!isValid || submitting) return
    submitting = true

    router.post(
      '/profile/skills',
      { skillId: selectedSkillId, levelCode: selectedLevelCode },
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => {
          submitting = false
          selectedSkillId = ''
          selectedLevelCode = ''
          onOpenChange(false)
        },
      }
    )
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      selectedSkillId = ''
      selectedLevelCode = ''
    }
    onOpenChange(value)
  }
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{t('user.profile_forms.add_title', {}, 'Add skill')}</DialogTitle>
    </DialogHeader>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <div class="space-y-2">
        <Label for="skill-select">{t('user.profile_forms.skill_label', {}, 'Skill')}</Label>
        <Select
          type="single"
          value={selectedSkillId}
          onValueChange={(v: string) => { if (v) selectedSkillId = v }}
        >
          <SelectTrigger id="skill-select" class="w-full">
            <SelectValue placeholder={t('user.profile_forms.skill_placeholder', {}, 'Choose skill...')} />
          </SelectTrigger>
          <SelectContent>
            {#each filteredSkills as skill (skill.id)}
              <SelectItem value={skill.id}>
                <div class="flex items-center gap-2">
                  <span>{skill.skill_name}</span>
                  <span class="text-xs text-muted-foreground">
                    ({categoryLabel(skill.category_code)})
                  </span>
                </div>
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="level-select">{t('user.profile_forms.level_label', {}, 'Self-assessed level')}</Label>
        <Select
          type="single"
          value={selectedLevelCode}
          onValueChange={(v: string) => { if (v) selectedLevelCode = v }}
        >
          <SelectTrigger id="level-select" class="w-full">
            <SelectValue placeholder={t('user.profile_forms.level_placeholder', {}, 'Choose level...')} />
          </SelectTrigger>
          <SelectContent>
            {#each proficiencyLevels as level (level.value)}
              <SelectItem value={level.value}>
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style="background-color: {level.colorHex}"
                  ></span>
                  <span>{proficiencyLevelLabel(level)}</span>
                  <span class="text-muted-foreground text-xs">
                    ({level.minPercentage}–{level.maxPercentage}%)
                  </span>
                </div>
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onclick={() => { handleOpenChange(false); }}>
          {t('common.cancel', {}, 'Cancel')}
        </Button>
        <Button type="submit" disabled={!isValid || submitting}>
          {submitting
            ? t('user.profile_forms.adding', {}, 'Adding...')
            : t('user.profile_forms.add_button', {}, 'Add skill')}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

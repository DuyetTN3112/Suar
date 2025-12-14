<script lang="ts">
  /**
   * AddSkillModal — dialog for adding a new skill to the user's profile.
   */
  import { router } from '@inertiajs/svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/user/shared/ui/dialog_content.svelte'
  import DialogFooter from '@/apps/user/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/user/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/user/shared/ui/dialog_title.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Select from '@/apps/user/shared/ui/select.svelte'
  import SelectContent from '@/apps/user/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/user/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/user/shared/ui/select_trigger.svelte'
  import SelectValue from '@/apps/user/shared/ui/select_value.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import {
    PROFILE_CATEGORY_ORDER,
    getProfileCategoryLabel,
  } from '@/apps/user/modules/profile/profile_theme'

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
  let addMode = $state<'existing' | 'custom'>('existing')
  let skillSearch = $state('')
  let customSkillName = $state('')
  let selectedCategoryCode = $state('engineering')
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
    availableSkills.filter((s) => {
      const search = skillSearch.trim().toLowerCase()
      const label = categoryLabel(s.category_code).toLowerCase()
      const matchesSearch =
        search.length === 0 ||
        s.skill_name.toLowerCase().includes(search) ||
        label.includes(search) ||
        (s.skill_code ?? '').toLowerCase().includes(search)

      return s.is_active && !existingSkillIds.includes(s.id) && matchesSearch
    })
  )

  const categoryOptions = $derived(PROFILE_CATEGORY_ORDER.map((categoryCode) => ({
    value: categoryCode,
    label: categoryLabel(categoryCode),
  })))

  const isValid = $derived(
    selectedLevelCode !== '' &&
      (
        addMode === 'existing'
          ? selectedSkillId !== ''
          : customSkillName.trim().length >= 2 && selectedCategoryCode !== ''
      )
  )

  function handleSubmit() {
    if (!isValid || submitting) return
    submitting = true
    const payload =
      addMode === 'existing'
        ? {
            skillId: selectedSkillId,
            verifiedPublicProficiencyCode: selectedLevelCode,
          }
        : {
            customSkillName: customSkillName.trim(),
            categoryCode: selectedCategoryCode,
            verifiedPublicProficiencyCode: selectedLevelCode,
          }

    router.post(
      '/profile/skills',
      payload,
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => {
          submitting = false
          selectedSkillId = ''
          selectedLevelCode = ''
          skillSearch = ''
          customSkillName = ''
          selectedCategoryCode = 'engineering'
          addMode = 'existing'
          onOpenChange(false)
        },
      }
    )
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      selectedSkillId = ''
      selectedLevelCode = ''
      skillSearch = ''
      customSkillName = ''
      selectedCategoryCode = 'engineering'
      addMode = 'existing'
    }
    onOpenChange(value)
  }

  function setAddMode(mode: 'existing' | 'custom') {
    addMode = mode
    selectedSkillId = ''
  }
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{t('user.profile_forms.add_title', {}, 'Add skill')}</DialogTitle>
    </DialogHeader>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <div class="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/30 p-1">
        <button
          type="button"
          class={`h-9 rounded-md text-sm font-bold ${addMode === 'existing' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          onclick={() => { setAddMode('existing') }}
        >
          {t('user.profile_forms.existing', {}, 'Existing')}
        </button>
        <button
          type="button"
          class={`h-9 rounded-md text-sm font-bold ${addMode === 'custom' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          onclick={() => { setAddMode('custom') }}
        >
          {t('user.profile_forms.custom', {}, 'New skill')}
        </button>
      </div>

      {#if addMode === 'existing'}
        <div class="space-y-2">
          <Label for="skill-search">{t('user.profile_forms.search_label', {}, 'Search skills')}</Label>
          <Input id="skill-search" bind:value={skillSearch} placeholder="React, API Design, Clean Code..." />
        </div>

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
      {:else}
        <div class="space-y-2">
          <Label for="custom-skill-name">{t('user.profile_forms.custom_name_label', {}, 'Skill name')}</Label>
          <Input id="custom-skill-name" bind:value={customSkillName} placeholder={t('user.profile_forms.custom_name_placeholder', {}, 'Example: Domain-Driven Design')} />
        </div>

        <div class="space-y-2">
          <Label for="custom-skill-category">{t('user.profile_forms.category_label', {}, 'Skill group')}</Label>
          <select
            id="custom-skill-category"
            bind:value={selectedCategoryCode}
            class="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-suar-hairline focus-visible:border-orange focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          >
            {#each categoryOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>
      {/if}

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

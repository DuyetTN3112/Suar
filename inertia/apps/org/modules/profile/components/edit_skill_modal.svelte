<script lang="ts">
  /**
   * EditSkillModal — dialog for editing a user skill's level.
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
  import { findFrontendCanonicalProficiencyLevelOption } from '@/apps/org/modules/profile/lib/proficiency_level_catalog'

  import type { UserSkillResult, ProficiencyLevelOption } from '../types.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    skill: UserSkillResult | null
    proficiencyLevels: ProficiencyLevelOption[]
  }

  let { open = $bindable(), onOpenChange, skill, proficiencyLevels }: Props = $props()
  const { t } = useTranslation()

  let selectedLevelCode = $state('')
  let submitting = $state(false)

  function proficiencyLevelLabel(level: ProficiencyLevelOption): string {
    return t(`user.proficiency_levels.labels.${level.value}`, {}, level.label)
  }

  // Sync initial value when skill changes
  $effect(() => {
    if (skill) {
      selectedLevelCode =
        findFrontendCanonicalProficiencyLevelOption(skill.verified_public_proficiency_code)?.value
          ?? skill.verified_public_proficiency_code
    }
  })

  const isValid = $derived(selectedLevelCode !== '' && skill !== null)

  function handleSubmit() {
    if (!isValid || submitting || !skill) return
    submitting = true

    router.put(
      `/profile/skills/${skill.id}`,
      { levelCode: selectedLevelCode },
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => {
          submitting = false
          onOpenChange(false)
        },
      }
    )
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      selectedLevelCode = ''
    }
    onOpenChange(value)
  }
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{t('user.profile_forms.edit_title', { skill: skill?.skill_name ?? '' }, 'Edit skill: :skill')}</DialogTitle>
    </DialogHeader>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <div class="space-y-2">
        <Label for="edit-level-select">{t('user.profile_forms.level_label', {}, 'Self-assessed level')}</Label>
        <Select
          type="single"
          value={selectedLevelCode}
          onValueChange={(v: string) => { if (v) selectedLevelCode = v }}
        >
          <SelectTrigger id="edit-level-select" class="w-full">
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
            ? t('user.profile_forms.saving', {}, 'Saving...')
            : t('user.profile_forms.update_button', {}, 'Update')}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

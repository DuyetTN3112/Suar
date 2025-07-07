<script lang="ts">
  /**
   * AddSkillModal — dialog for adding a new skill to the user's profile.
   */
  import { router } from '@inertiajs/svelte'

  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'

  import type { AvailableSkill, ProficiencyLevelOption } from '../types.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    availableSkills: AvailableSkill[]
    proficiencyLevels: ProficiencyLevelOption[]
    existingSkillIds?: string[]
  }

  // eslint-disable-next-line prefer-const
  let { open = $bindable(), onOpenChange, availableSkills, proficiencyLevels, existingSkillIds = [] }: Props = $props()

  let selectedSkillId = $state('')
  let selectedLevelCode = $state('')
  let submitting = $state(false)

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
      { skill_id: selectedSkillId, level_code: selectedLevelCode },
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
      <DialogTitle>Thêm kỹ năng</DialogTitle>
    </DialogHeader>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <div class="space-y-2">
        <Label for="skill-select">Kỹ năng</Label>
        <Select
          type="single"
          value={selectedSkillId}
          onValueChange={(v: string) => { if (v) selectedSkillId = v }}
        >
          <SelectTrigger id="skill-select" class="w-full">
            <SelectValue placeholder="Chọn kỹ năng..." />
          </SelectTrigger>
          <SelectContent>
            {#each filteredSkills as skill (skill.id)}
              <SelectItem value={skill.id}>
                <div class="flex items-center gap-2">
                  <span>{skill.skill_name}</span>
                  <span class="text-muted-foreground text-xs capitalize">
                    ({skill.category_code.replace('_', ' ')})
                  </span>
                </div>
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="level-select">Mức độ tự đánh giá</Label>
        <Select
          type="single"
          value={selectedLevelCode}
          onValueChange={(v: string) => { if (v) selectedLevelCode = v }}
        >
          <SelectTrigger id="level-select" class="w-full">
            <SelectValue placeholder="Chọn mức độ..." />
          </SelectTrigger>
          <SelectContent>
            {#each proficiencyLevels as level (level.value)}
              <SelectItem value={level.value}>
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style="background-color: {level.colorHex}"
                  ></span>
                  <span>{level.labelVi}</span>
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
          Hủy
        </Button>
        <Button type="submit" disabled={!isValid || submitting}>
          {submitting ? 'Đang thêm...' : 'Thêm kỹ năng'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

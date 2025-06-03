<script lang="ts">
  /**
   * EditSkillModal — dialog for editing a user skill's level.
   */
  import { router } from '@inertiajs/svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import Button from '@/components/ui/button.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import type { UserSkillResult, ProficiencyLevelOption } from '../types.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    skill: UserSkillResult | null
    proficiencyLevels: ProficiencyLevelOption[]
  }

  let {
    open = $bindable(false),
    onOpenChange,
    skill,
    proficiencyLevels,
  }: Props = $props()

  let selectedLevelCode = $state('')
  let submitting = $state(false)

  // Sync initial value when skill changes
  $effect(() => {
    if (skill) {
      selectedLevelCode = skill.level_code
    }
  })

  const isValid = $derived(selectedLevelCode !== '' && skill !== null)

  function handleSubmit() {
    if (!isValid || submitting || !skill) return
    submitting = true

    router.put(
      `/profile/skills/${skill.id}`,
      { level_code: selectedLevelCode },
      {
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
      <DialogTitle>Chỉnh sửa kỹ năng: {skill?.skill_name ?? ''}</DialogTitle>
    </DialogHeader>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <div class="space-y-2">
        <Label for="edit-level-select">Mức độ tự đánh giá</Label>
        <Select
          type="single"
          value={selectedLevelCode}
          onValueChange={(v) => { if (v) selectedLevelCode = v }}
        >
          <SelectTrigger id="edit-level-select" class="w-full">
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
          {submitting ? 'Đang lưu...' : 'Cập nhật'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

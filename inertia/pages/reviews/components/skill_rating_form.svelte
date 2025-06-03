<script lang="ts">
  /**
   * SkillRatingForm — form for submitting skill review ratings.
   * Renders a list of skills with a level_code select for each.
   */
  import { router } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import type {
    SerializedSkill,
    ProficiencyLevelOption,
    ReviewerType,
    SkillRatingInput,
  } from '../types.svelte'

  interface Props {
    sessionId: string
    skills: SerializedSkill[]
    proficiencyLevels: ProficiencyLevelOption[]
    reviewerType: ReviewerType
    disabled?: boolean
  }

  const { sessionId, skills, proficiencyLevels, reviewerType, disabled = false }: Props = $props()

  // Initialize ratings state for each skill
  const ratings = $state<Record<string, { level_code: string; comment: string }>>(
    Object.fromEntries(skills.map((s) => [s.id, { level_code: '', comment: '' }]))
  )

  let submitting = $state(false)

  const isValid = $derived(
    skills.every((s) => ratings[s.id]?.level_code !== '')
  )

  function handleSubmit() {
    if (!isValid || submitting || disabled) return

    submitting = true
    const skillRatings: SkillRatingInput[] = skills.map((s) => ({
      skill_id: s.id,
      level_code: ratings[s.id].level_code,
      comment: ratings[s.id].comment || undefined,
    }))

    router.post(
      `/reviews/${sessionId}/submit`,
      {
        reviewer_type: reviewerType,
        skill_ratings: skillRatings,
      },
      {
        preserveScroll: true,
        onFinish: () => { submitting = false },
      }
    )
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
  <div class="space-y-4">
    {#each skills as skill (skill.id)}
      <div class="rounded-lg border p-4 space-y-3">
        <div>
          <h4 class="text-sm font-medium">{skill.skill_name}</h4>
          {#if skill.description}
            <p class="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
          {/if}
          <span class="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
            {skill.category_code.replace('_', ' ')}
          </span>
        </div>

        <div class="space-y-2">
          <Label for="level-{skill.id}">Mức độ thành thạo</Label>
          <Select
            type="single"
            value={ratings[skill.id].level_code}
            onValueChange={(v) => { if (v) ratings[skill.id].level_code = v }}
          >
            <SelectTrigger id="level-{skill.id}" class="w-full" disabled={disabled}>
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

        <div class="space-y-2">
          <Label for="comment-{skill.id}">Nhận xét (tùy chọn)</Label>
          <Textarea
            id="comment-{skill.id}"
            bind:value={ratings[skill.id].comment}
            placeholder="Thêm nhận xét về kỹ năng này..."
            rows={2}
            disabled={disabled}
            class="resize-none"
          />
        </div>
      </div>
    {/each}
  </div>

  <Button type="submit" disabled={!isValid || submitting || disabled} class="w-full">
    {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
  </Button>
</form>

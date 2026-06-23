<script lang="ts">
  import { CircleQuestionMark } from 'lucide-svelte'

  import Tooltip from '@/components/ui/tooltip.svelte'
  import TooltipContent from '@/components/ui/tooltip_content.svelte'
  import TooltipTrigger from '@/components/ui/tooltip_trigger.svelte'

  import { cn } from '$lib/utils-svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    display_name: string
  }

  interface Props {
    levels: ProficiencyLevel[]
    minLevelId: string
    targetLevelId: string
    ceilingLevelId: string
    onMinChange?: (id: string) => void
    onTargetChange?: (id: string) => void
    onCeilingChange?: (id: string) => void
    disabled?: boolean
    class?: string
  }

  let {
    levels,
    minLevelId = $bindable(''),
    targetLevelId = $bindable(''),
    ceilingLevelId = $bindable(''),
    onMinChange,
    onTargetChange,
    onCeilingChange,
    disabled = false,
    class: className = '',
  }: Props = $props()

  const minOrdinal = $derived(levels.find((l) => l.id === minLevelId)?.ordinal ?? 0)
  const targetOrdinal = $derived(levels.find((l) => l.id === targetLevelId)?.ordinal ?? 0)
  const ceilingOrdinal = $derived(levels.find((l) => l.id === ceilingLevelId)?.ordinal ?? 0)

  const isValid = $derived(() => {
    const hasMin = minOrdinal > 0
    const hasTarget = targetOrdinal > 0
    const hasCeiling = ceilingOrdinal > 0
    if (!hasMin && !hasTarget && !hasCeiling) return true
    if (hasMin && hasTarget && minOrdinal > targetOrdinal) return false
    if (hasTarget && hasCeiling && targetOrdinal > ceilingOrdinal) return false
    if (hasMin && hasCeiling && minOrdinal > ceilingOrdinal) return false
    return true
  })

  const selectClass =
    'flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors disabled:cursor-not-allowed disabled:opacity-50'

  function makeHandler(setter: (id: string) => void, cb?: (id: string) => void) {
    return (e: Event) => {
      const val = (e.target as HTMLSelectElement).value
      setter(val)
      cb?.(val)
    }
  }
</script>

<div class={cn('space-y-3', className)}>
  <div class="grid grid-cols-3 gap-3">
    <!-- Min -->
    <div class="space-y-1">
      <div class="flex items-center gap-1">
        <label for="minimum-level" class="text-xs font-medium text-slate-600">Level tối thiểu</label>
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark class="h-3.5 w-3.5 text-slate-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent class="max-w-52 font-normal normal-case">
            Mức tối thiểu để người dùng đủ điều kiện nhận task này.
          </TooltipContent>
        </Tooltip>
      </div>
      <select
        id="minimum-level"
        {disabled}
        class={cn(selectClass, !isValid() && minOrdinal > 0 ? 'border-amber-400' : 'border-input')}
        value={minLevelId}
        onchange={makeHandler((v) => { minLevelId = v }, onMinChange)}
      >
        <option value="">— None —</option>
        {#each levels as lvl (lvl.id)}
          <option value={lvl.id}>{lvl.display_name}</option>
        {/each}
      </select>
    </div>

    <!-- Target -->
    <div class="space-y-1">
      <div class="flex items-center gap-1">
        <label for="target-level" class="text-xs font-medium text-slate-600">Level mục tiêu</label>
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark class="h-3.5 w-3.5 text-slate-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent class="max-w-52 font-normal normal-case">
            Mức kỳ vọng thực hiện tốt task. Reviewer sẽ so sánh với mức này.
          </TooltipContent>
        </Tooltip>
      </div>
      <select
        id="target-level"
        {disabled}
        class={cn(selectClass, !isValid() && targetOrdinal > 0 ? 'border-amber-400' : 'border-input')}
        value={targetLevelId}
        onchange={makeHandler((v) => { targetLevelId = v }, onTargetChange)}
      >
        <option value="">— None —</option>
        {#each levels as lvl (lvl.id)}
          <option value={lvl.id}>{lvl.display_name}</option>
        {/each}
      </select>
    </div>

    <!-- Ceiling -->
    <div class="space-y-1">
      <div class="flex items-center gap-1">
        <label for="ceiling-level" class="text-xs font-medium text-slate-600">Giới hạn đánh giá</label>
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark class="h-3.5 w-3.5 text-slate-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent class="max-w-52 font-normal normal-case">
            Mức tối đa reviewer có thể ghi nhận từ task này. Bằng chứng vượt mức này không được tính.
          </TooltipContent>
        </Tooltip>
      </div>
      <select
        id="ceiling-level"
        {disabled}
        class={cn(selectClass, !isValid() && ceilingOrdinal > 0 ? 'border-amber-400' : 'border-input')}
        value={ceilingLevelId}
        onchange={makeHandler((v) => { ceilingLevelId = v }, onCeilingChange)}
      >
        <option value="">— None —</option>
        {#each levels as lvl (lvl.id)}
          <option value={lvl.id}>{lvl.display_name}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if !isValid()}
    <p class="text-xs text-amber-600 flex items-center gap-1">
      <CircleQuestionMark class="h-3.5 w-3.5 shrink-0" />
      Thứ tự level không hợp lệ: tối thiểu ≤ mục tiêu ≤ giới hạn.
    </p>
  {/if}
</div>

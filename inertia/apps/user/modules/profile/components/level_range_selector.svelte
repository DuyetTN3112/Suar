<script lang="ts">
  import { CircleQuestionMark } from 'lucide-svelte'

  import Tooltip from '@/apps/user/shared/ui/tooltip.svelte'
  import TooltipContent from '@/apps/user/shared/ui/tooltip_content.svelte'
  import TooltipTrigger from '@/apps/user/shared/ui/tooltip_trigger.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import { cn } from '$lib/utils-svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    displayName?: string
    display_name?: string
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
  const { t } = useTranslation()

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

  function getLevelLabel(level: ProficiencyLevel): string {
    return level.displayName ?? level.display_name ?? level.code
  }

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
        <label for="minimum-level" class="text-xs font-medium text-muted-foreground">{t('user.profile_level_range.min_label', {}, 'Minimum level')}</label>
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent class="max-w-52 font-normal normal-case">
            {t('user.profile_level_range.min_hint', {}, 'Minimum level required for a user to be eligible for this task.')}
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
        <option value="">{t('user.profile_level_range.none', {}, 'None')}</option>
        {#each levels as lvl (lvl.id)}
          <option value={lvl.id}>{getLevelLabel(lvl)}</option>
        {/each}
      </select>
    </div>

    <!-- Target -->
    <div class="space-y-1">
      <div class="flex items-center gap-1">
        <label for="target-level" class="text-xs font-medium text-muted-foreground">{t('user.profile_level_range.target_label', {}, 'Target level')}</label>
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent class="max-w-52 font-normal normal-case">
            {t('user.profile_level_range.target_hint', {}, 'Expected level for strong task delivery. Reviewers compare evidence against this level.')}
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
        <option value="">{t('user.profile_level_range.none', {}, 'None')}</option>
        {#each levels as lvl (lvl.id)}
          <option value={lvl.id}>{getLevelLabel(lvl)}</option>
        {/each}
      </select>
    </div>

    <!-- Ceiling -->
    <div class="space-y-1">
      <div class="flex items-center gap-1">
        <label for="ceiling-level" class="text-xs font-medium text-muted-foreground">{t('user.profile_level_range.ceiling_label', {}, 'Review ceiling')}</label>
        <Tooltip>
          <TooltipTrigger>
            <CircleQuestionMark class="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent class="max-w-52 font-normal normal-case">
            {t('user.profile_level_range.ceiling_hint', {}, 'Maximum level reviewers can recognize from this task. Evidence beyond this level is not counted.')}
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
        <option value="">{t('user.profile_level_range.none', {}, 'None')}</option>
        {#each levels as lvl (lvl.id)}
          <option value={lvl.id}>{getLevelLabel(lvl)}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if !isValid()}
    <p class="text-xs text-destructive flex items-center gap-1">
      <CircleQuestionMark class="h-3.5 w-3.5 shrink-0" />
      {t('user.profile_level_range.invalid_order', {}, 'Invalid level order: minimum <= target <= ceiling.')}
    </p>
  {/if}
</div>

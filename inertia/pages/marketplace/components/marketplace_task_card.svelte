<script lang="ts">
  /**
   * MarketplaceTaskCard — displays a public task in marketplace grid.
   */
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { Building2, Calendar, DollarSign, Tag, CheckCircle } from 'lucide-svelte'
  import { DIFFICULTY_CONFIG, type MarketplaceTask, type TaskDifficulty } from '../types.svelte'

  interface Props {
    task: MarketplaceTask
    onApply?: (task: MarketplaceTask) => void
  }

  const { task, onApply }: Props = $props()

  const orgName = $derived(task.organization?.name ?? 'Tổ chức không xác định')

  const difficultyInfo = $derived(
    task.difficulty ? DIFFICULTY_CONFIG[task.difficulty] : null
  )

  const budgetDisplay = $derived(
    task.estimated_budget
      ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
          task.estimated_budget
        )
      : null
  )

  const dueDateDisplay = $derived(
    task.due_date
      ? new Date(task.due_date).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : null
  )

  const deadlineDisplay = $derived(
    task.application_deadline
      ? new Date(task.application_deadline).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : null
  )

  const skills = $derived(
    task.required_skills_rel?.map((r) => r.skill).filter(Boolean) ?? []
  )

  const hasApplied = $derived((task.user_applied ?? 0) > 0)

  function handleClick() {
    if (!hasApplied) {
      onApply?.(task)
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }
</script>

<Card
  class="hover:shadow-md transition-shadow flex flex-col"
>
  <CardHeader class="pb-2">
    <div class="flex items-start justify-between gap-2">
      <CardTitle class="text-sm font-medium line-clamp-2">{task.title}</CardTitle>
      {#if difficultyInfo}
        <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium {difficultyInfo.color}">
          {difficultyInfo.labelVi}
        </span>
      {/if}
    </div>
  </CardHeader>
  <CardContent class="space-y-2 text-sm text-muted-foreground flex-1">
    <!-- Organization -->
    <div class="flex items-center gap-2">
      <Building2 class="h-3.5 w-3.5 shrink-0" />
      <span class="truncate">{orgName}</span>
    </div>

    <!-- Budget -->
    {#if budgetDisplay}
      <div class="flex items-center gap-2">
        <DollarSign class="h-3.5 w-3.5 shrink-0" />
        <span>{budgetDisplay}</span>
      </div>
    {/if}

    <!-- Due date -->
    {#if dueDateDisplay}
      <div class="flex items-center gap-2">
        <Calendar class="h-3.5 w-3.5 shrink-0" />
        <span>Hạn: {dueDateDisplay}</span>
      </div>
    {/if}

    <!-- Application deadline -->
    {#if deadlineDisplay}
      <div class="flex items-center gap-2">
        <Calendar class="h-3.5 w-3.5 shrink-0 text-orange-500" />
        <span>Hạn ứng tuyển: {deadlineDisplay}</span>
      </div>
    {/if}

    <!-- Skills -->
    {#if skills.length > 0}
      <div class="flex items-start gap-2">
        <Tag class="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div class="flex flex-wrap gap-1">
          {#each skills.slice(0, 4) as skill}
            <Badge variant="secondary" class="text-[10px] px-1.5 py-0">
              {skill?.skill_name}
            </Badge>
          {/each}
          {#if skills.length > 4}
            <Badge variant="outline" class="text-[10px] px-1.5 py-0">
              +{skills.length - 4}
            </Badge>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Apply status / button -->
    <div class="pt-2 mt-auto">
      {#if hasApplied}
        <div class="flex items-center gap-1.5 text-green-600 text-xs font-medium">
          <CheckCircle class="h-3.5 w-3.5" />
          Đã ứng tuyển
        </div>
      {:else}
        <button
          type="button"
          class="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          onclick={handleClick}
          onkeydown={handleKeydown}
        >
          Ứng tuyển
        </button>
      {/if}
    </div>
  </CardContent>
</Card>

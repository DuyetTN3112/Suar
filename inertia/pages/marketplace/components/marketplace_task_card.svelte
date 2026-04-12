<script lang="ts">
  import {
    Building2,
    Calendar,
    DollarSign,
    Tag,
    CircleCheckBig,
    FolderKanban,
    User,
    UserRoundCheck,
    Link2,
    Clock3,
    RefreshCw,
  } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'

  import { DIFFICULTY_CONFIG, type MarketplaceTask } from '../types.svelte'

  interface Props {
    task: MarketplaceTask
    onApply?: (task: MarketplaceTask) => void
  }

  const { task, onApply }: Props = $props()

  const orgName = $derived(task.organization?.name ?? 'Tổ chức không xác định')
  const projectName = $derived((task.project?.name) ?? 'Không thuộc dự án')

  const projectOwnerName = $derived(
    (task.project?.owner?.username as string | undefined) ??
      (task.project?.owner?.email as string | undefined) ??
      (task.creator?.username as string | undefined) ??
      'Chưa xác định'
  )

  const assignerName = $derived(
    (task.creator?.username as string | undefined) ??
      (task.creator?.email as string | undefined) ??
      'Chưa xác định'
  )

  const assigneeName = $derived('Chưa giao')

  const parentTaskName = $derived(
    (task.parentTask?.title) ??
      (task.parent_task_id ? `TASK-${task.parent_task_id}` : 'Không có')
  )

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

  const descriptionPreview = $derived((task.description ?? '').trim().slice(0, 170))

  const createdAtDisplay = $derived(
    task.created_at
      ? new Date(task.created_at).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
  )

  const startDateDisplay = $derived.by(() => {
    const startDate = (task as { start_date?: string | null }).start_date ?? task.created_at
    if (!startDate) return null
    return new Date(startDate).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  })

  const updatedAtDisplay = $derived(
    task.updated_at
      ? new Date(task.updated_at).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null
  )

  const skills = $derived(
    task.required_skills_rel
      ?.map((r) => {
        const skillData = r.skill as {
          skill_name?: string
          skillName?: string
          skill_code?: string
          skillCode?: string
          name?: string
        } | undefined
        const skillName =
          [
            skillData?.skill_name,
            skillData?.skillName,
            skillData?.name,
            skillData?.skill_code,
            skillData?.skillCode,
          ]
            .map((value) => value?.trim())
            .find((value): value is string => value !== undefined && value.length > 0) ??
          (r.skill_id ? `Skill #${r.skill_id}` : 'Kỹ năng chưa đặt tên')

        const levelRaw = (r.required_level_code ?? '').trim().toLowerCase()
        const level = levelRaw ? levelRaw.charAt(0).toUpperCase() + levelRaw.slice(1) : 'Không yêu cầu'

        return {
          id: r.id,
          label: `${skillName} (${level})`,
          isMandatory: Boolean(r.is_mandatory),
        }
      })
      .filter(Boolean) ?? []
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

<Card class="hover:shadow-md transition-shadow flex flex-col h-full">
  <CardHeader class="pb-2">
    <div class="flex items-start justify-between gap-2">
      <CardTitle class="text-base font-semibold line-clamp-2">{task.title}</CardTitle>
      {#if difficultyInfo}
        <span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium {difficultyInfo.color}">
          {difficultyInfo.labelVi}
        </span>
      {/if}
    </div>
  </CardHeader>
  <CardContent class="space-y-4 text-sm text-muted-foreground flex-1">
    {#if descriptionPreview}
      <p class="line-clamp-4 text-sm leading-relaxed text-foreground/85">{descriptionPreview}</p>
    {/if}

    <div class="flex items-center gap-2">
      <Building2 class="h-3.5 w-3.5 shrink-0" />
      <span class="truncate">{orgName}</span>
    </div>

    <div class="flex items-center gap-2">
      <FolderKanban class="h-3.5 w-3.5 shrink-0" />
      <span class="truncate">Dự án: {projectName}</span>
    </div>

    <div class="flex items-center gap-2">
      <User class="h-3.5 w-3.5 shrink-0" />
      <span class="truncate">Chủ dự án: {projectOwnerName}</span>
    </div>

    <div class="grid gap-2 rounded-md border border-border/70 bg-muted/20 p-3 sm:grid-cols-2">
      <div class="flex items-center gap-2">
        <UserRoundCheck class="h-3.5 w-3.5 shrink-0" />
        <span>Người giao: {assignerName}</span>
      </div>
      <div class="flex items-center gap-2">
        <User class="h-3.5 w-3.5 shrink-0" />
        <span>Người nhận: {assigneeName}</span>
      </div>
      <div class="flex items-center gap-2 sm:col-span-2">
        <Link2 class="h-3.5 w-3.5 shrink-0" />
        <span class="truncate">Task cha: {parentTaskName}</span>
      </div>
      {#if startDateDisplay}
        <div class="flex items-center gap-2">
          <Clock3 class="h-3.5 w-3.5 shrink-0" />
          <span>Bắt đầu: {startDateDisplay}</span>
        </div>
      {/if}
      {#if createdAtDisplay}
        <div class="flex items-center gap-2">
          <Clock3 class="h-3.5 w-3.5 shrink-0" />
          <span>Tạo: {createdAtDisplay}</span>
        </div>
      {/if}
      {#if updatedAtDisplay}
        <div class="flex items-center gap-2">
          <RefreshCw class="h-3.5 w-3.5 shrink-0" />
          <span>Cập nhật: {updatedAtDisplay}</span>
        </div>
      {/if}
    </div>

    {#if budgetDisplay}
      <div class="flex items-center gap-2">
        <DollarSign class="h-3.5 w-3.5 shrink-0" />
        <span>{budgetDisplay}</span>
      </div>
    {/if}

    {#if dueDateDisplay}
      <div class="flex items-center gap-2">
        <Calendar class="h-3.5 w-3.5 shrink-0" />
        <span>Hạn: {dueDateDisplay}</span>
      </div>
    {/if}

    {#if deadlineDisplay}
      <div class="flex items-center gap-2">
        <Calendar class="h-3.5 w-3.5 shrink-0 text-primary" />
        <span>Hạn ứng tuyển: {deadlineDisplay}</span>
      </div>
    {/if}

    {#if skills.length > 0}
      <div class="flex items-start gap-2">
        <Tag class="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div class="flex flex-wrap gap-1.5">
          {#each skills.slice(0, 3) as skill}
            <Badge class="text-xs px-2 py-0.5 border border-blue-300 bg-blue-100 text-blue-900">
              {skill.label}{skill.isMandatory ? ' - bắt buộc' : ''}
            </Badge>
          {/each}
          {#if skills.length > 3}
            <Badge variant="outline" class="text-xs px-2 py-0.5">
              +{skills.length - 3}
            </Badge>
          {/if}
        </div>
      </div>
    {/if}

    <div class="pt-2 mt-auto">
      {#if hasApplied}
        <div class="flex items-center gap-1.5 text-blue-600 text-xs font-medium">
          <CircleCheckBig class="h-3.5 w-3.5" />
          Đã ứng tuyển
        </div>
      {:else}
        <button
          type="button"
          class="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          onclick={handleClick}
          onkeydown={handleKeydown}
        >
          Ứng tuyển
        </button>
      {/if}
    </div>
  </CardContent>
</Card>

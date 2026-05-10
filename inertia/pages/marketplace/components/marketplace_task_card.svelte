<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import {
    Building2,
    Calendar,
    Tag,
    CircleCheckBig,
    FolderKanban,
    Sparkles,
    User,
    UserRoundCheck,
    Link2,
    Clock3,
    RefreshCw,
    ChevronDown,
    ChevronUp,
  } from 'lucide-svelte'

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

  const currentUserApplication = $derived(task.current_user_application ?? null)
  const hasApplied = $derived(currentUserApplication !== null || (task.user_applied ?? 0) > 0)
  const isWithdrawable = $derived(currentUserApplication?.status === 'pending')
  const visibilityLabel = $derived.by(() => {
    switch (task.task_visibility) {
      case 'all':
        return 'Công khai cho nội bộ và bên ngoài'
      case 'external':
        return 'Mở cho người ngoài dự án'
      case 'internal':
        return 'Chỉ nội bộ'
      default:
        return task.task_visibility
    }
  })
  const detailSections = $derived(
    [
      task.acceptance_criteria
        ? { label: 'Tiêu chí hoàn thành', value: task.acceptance_criteria }
        : null,
      task.verification_method
        ? { label: 'Cách nghiệm thu', value: task.verification_method }
        : null,
      task.context_background
        ? { label: 'Bối cảnh', value: task.context_background }
        : null,
      task.role_in_task ? { label: 'Vai trò', value: task.role_in_task } : null,
      task.business_domain ? { label: 'Miền nghiệp vụ', value: task.business_domain } : null,
    ].filter(Boolean) as { label: string; value: string }[]
  )
  let detailOpen = $state(false)
  let withdrawing = $state(false)

  function applicationStatusLabel(status: 'pending' | 'approved' | 'rejected'): string {
    switch (status) {
      case 'pending':
        return 'Đang chờ duyệt'
      case 'approved':
        return 'Đã được chấp thuận'
      case 'rejected':
        return 'Đã bị từ chối'
    }
  }

  function handleClick() {
    if (!hasApplied) {
      onApply?.(task)
    }
  }

  function handleWithdraw() {
    if (!currentUserApplication || !isWithdrawable) return
    withdrawing = true
    router.post(`/applications/${currentUserApplication.id}/withdraw`, undefined, {
      preserveScroll: true,
      onFinish: () => {
        withdrawing = false
      },
    })
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }
</script>

<article class="marketplace-opportunity rounded-[24px] border border-border bg-card p-5 shadow-suar-xs">
  <div class="flex flex-wrap items-start justify-between gap-4 rounded-[20px] border border-border bg-background p-4">
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span>{visibilityLabel}</span>
        {#if task.match_score !== undefined}
          <span class="inline-flex items-center gap-1 rounded-full border border-border bg-accent px-2.5 py-1 text-foreground">
            <Sparkles class="h-3.5 w-3.5" />
            Ưu tiên {task.match_score}
          </span>
        {/if}
      </div>
      <div>
        <h2 class="text-xl font-black tracking-tight text-foreground">{task.title}</h2>
      {#if descriptionPreview}
          <p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{descriptionPreview}</p>
      {/if}
      </div>
    </div>
    {#if difficultyInfo}
      <span class="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
          {difficultyInfo.marker} {difficultyInfo.labelVi}
        </span>
    {/if}
  </div>

  <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><Building2 class="h-4 w-4" /> {orgName}</span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><FolderKanban class="h-4 w-4" /> {projectName}</span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><User class="h-4 w-4" /> Chủ dự án: {projectOwnerName}</span>
      </div>

      <div class="grid gap-3 rounded-[20px] border border-border bg-muted/30 p-4 text-sm text-muted-foreground md:grid-cols-2">
        <div><UserRoundCheck class="mr-2 inline h-4 w-4" /> Người giao: {assignerName}</div>
        <div><User class="mr-2 inline h-4 w-4" /> Người nhận: {assigneeName}</div>
        <div><Link2 class="mr-2 inline h-4 w-4" /> Task cha: {parentTaskName}</div>
        <div><Tag class="mr-2 inline h-4 w-4" /> Quyền ứng tuyển: {visibilityLabel}</div>
        {#if createdAtDisplay}<div><Clock3 class="mr-2 inline h-4 w-4" /> Tạo: {createdAtDisplay}</div>{/if}
        {#if startDateDisplay}<div><Clock3 class="mr-2 inline h-4 w-4" /> Bắt đầu: {startDateDisplay}</div>{/if}
        {#if updatedAtDisplay}<div><RefreshCw class="mr-2 inline h-4 w-4" /> Cập nhật: {updatedAtDisplay}</div>{/if}
      </div>

      <div class="flex flex-wrap gap-2">
        {#if dueDateDisplay}
          <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><Calendar class="h-4 w-4" /> Hạn làm: {dueDateDisplay}</span>
        {/if}
        {#if deadlineDisplay}
          <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><Calendar class="h-4 w-4" /> Hạn ứng tuyển: {deadlineDisplay}</span>
        {/if}
      </div>

      {#if skills.length > 0}
        <div class="flex flex-wrap items-center gap-2">
          <Tag class="h-4 w-4 text-muted-foreground" />
          {#each skills.slice(0, 3) as skill}
            <span class="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
              {skill.label}{skill.isMandatory ? ' - bắt buộc' : ''}
            </span>
          {/each}
          {#if skills.length > 3}
            <span class="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]">+{skills.length - 3}</span>
          {/if}
        </div>
      {/if}

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
          onclick={() => {
            detailOpen = !detailOpen
          }}
        >
          {#if detailOpen}
            <ChevronUp class="h-4 w-4" />
            Thu gọn chi tiết
          {:else}
            <ChevronDown class="h-4 w-4" />
            Xem chi tiết task
          {/if}
        </button>

        {#if !hasApplied}
          <button
            type="button"
            class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onclick={handleClick}
            onkeydown={handleKeydown}
          >
            Ứng tuyển ngay
          </button>
        {/if}
      </div>

      {#if detailOpen}
        <div class="grid gap-3 rounded-[20px] border border-border bg-background p-4 md:grid-cols-2">
          {#if detailSections.length > 0}
            {#each detailSections as section}
              <div class="rounded-2xl border border-border bg-muted/20 p-4">
                <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section.label}</div>
                <p class="mt-2 text-sm leading-6 text-foreground">{section.value}</p>
              </div>
            {/each}
          {/if}

          {#if task.tech_stack && task.tech_stack.length > 0}
            <div class="rounded-2xl border border-border bg-muted/20 p-4">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tech stack</div>
              <p class="mt-2 text-sm leading-6 text-foreground">{task.tech_stack.join(', ')}</p>
            </div>
          {/if}

          {#if task.domain_tags && task.domain_tags.length > 0}
            <div class="rounded-2xl border border-border bg-muted/20 p-4">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Domain tags</div>
              <p class="mt-2 text-sm leading-6 text-foreground">{task.domain_tags.join(', ')}</p>
            </div>
          {/if}

          {#if !detailSections.length && !(task.tech_stack && task.tech_stack.length > 0) && !(task.domain_tags && task.domain_tags.length > 0)}
            <div class="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
              Task này chưa có thêm brief chi tiết ngoài phần mô tả ngắn.
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <aside class="rounded-[20px] border border-border bg-muted/30 p-4">
      <h3 class="text-sm font-black uppercase tracking-[0.16em] text-foreground">Trạng thái ứng tuyển</h3>
      {#if currentUserApplication}
        <p class="mt-3 text-sm text-muted-foreground">{applicationStatusLabel(currentUserApplication.status)}</p>
        <div class="mt-4 grid gap-3 text-sm">
          <div class="rounded-2xl border border-border bg-background p-3"><span class="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Trạng thái</span><strong class="mt-1 block text-foreground">{currentUserApplication.status}</strong></div>
          <div class="rounded-2xl border border-border bg-background p-3"><span class="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Nguồn đơn</span><strong class="mt-1 block text-foreground">public_listing</strong></div>
        </div>
        {#if isWithdrawable}
          <button
            type="button"
            class="mt-4 w-full rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"
            disabled={withdrawing}
            onclick={handleWithdraw}
          >
            {withdrawing ? 'Đang rút đơn...' : 'Rút đơn'}
          </button>
        {/if}
      {:else}
        <p class="mt-3 text-sm text-muted-foreground">Chưa có đơn ứng tuyển hiện hành. Bạn có thể đọc brief rồi ứng tuyển trực tiếp từ listing này.</p>
        <div class="mt-4 grid gap-3 text-sm">
          <div class="rounded-2xl border border-border bg-background p-3"><span class="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Trạng thái</span><strong class="mt-1 block text-foreground">Chưa ứng tuyển</strong></div>
          <div class="rounded-2xl border border-border bg-background p-3"><span class="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Nguồn</span><strong class="mt-1 block text-foreground">Marketplace</strong></div>
        </div>
      {/if}
      {#if hasApplied}
        <div class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground"><CircleCheckBig class="h-4 w-4" /> Đã ứng tuyển</div>
      {/if}
    </aside>
  </div>
</article>

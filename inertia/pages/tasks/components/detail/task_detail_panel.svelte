<script lang="ts">
  import {
    Clock,
    CircleCheck,
    Circle,
    CircleX,
    Eye,
    ArrowUpRight,
    Pencil,
    Sparkles,
  } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import type { Task } from '../../types.svelte'

  import TaskDetailMetadataSidebar from './task_detail_metadata_sidebar.svelte'
  import TaskExecutionBrief from './task_execution_brief.svelte'

  interface CapabilityDecision {
    allowed: boolean
    reason?: string | null
  }

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: Task | null
    metadata: {
      statuses: { value: string; label: string; color?: string }[]
      labels: { value: string; label: string; color?: string }[]
      priorities: { value: string; label: string; color?: string }[]
      users: { id: string; username: string; email: string }[]
    }
    isHydratingDetail?: boolean
    onEdit?: (task: Task) => void
    onChangeStatus?: (task: Task, toStatusId: string) => void
    getStatusChangeDecision?: (task: Task, toStatusId: string) => CapabilityDecision
  }

  const {
    open = false,
    onOpenChange,
    task,
    metadata,
    isHydratingDetail = false,
    onEdit,
    onChangeStatus,
    getStatusChangeDecision,
  }: Props = $props()

  const { t } = useTranslation()

  const statusConfig: Partial<Record<string, { icon: typeof Circle; color: string; bgColor: string }>> = {
    todo: { icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-slate-100 dark:bg-slate-800' },
    in_progress: { icon: Clock, color: 'text-foreground', bgColor: 'bg-ink-06 dark:bg-blue-900/30' },
    in_review: { icon: Eye, color: 'text-fuchsia-500', bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
    done: { icon: CircleCheck, color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    cancelled: { icon: CircleX, color: 'text-destructive', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  }

  const priorityConfig: Record<string, { color: string; bgColor: string }> = {
    urgent: { color: 'text-destructive', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    high: { color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    medium: { color: 'text-foreground', bgColor: 'bg-ink-06 dark:bg-blue-900/30' },
    low: { color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-900/30' },
  }

  const priorityLabel = $derived(
    task ? metadata.priorities.find(p => p.value === task.priority)?.label ?? task.priority : ''
  )
  const labelLabel = $derived(
    task ? metadata.labels.find(l => l.value === task.label)?.label ?? task.label : ''
  )
  const activeStatusId = $derived((task?.task_status_id ?? task?.status) ?? '')

  const priorityClass = $derived(task ? priorityConfig[task.priority] : undefined)
  function hasNonEmptyArray(value: unknown): boolean {
    return Array.isArray(value) && value.length > 0
  }

  const hasContextCard = $derived(
    Boolean(
      task?.task_type ??
        task?.acceptance_criteria ??
        task?.verification_method ??
        task?.context_background ??
        (hasNonEmptyArray(task?.tech_stack) ? 'tech-stack' : null) ??
        (hasNonEmptyArray(task?.learning_objectives) ? 'learning-objectives' : null) ??
        (hasNonEmptyArray(task?.domain_tags) ? 'domain-tags' : null) ??
        task?.environment ??
        task?.collaboration_type ??
        task?.complexity_notes ??
        task?.role_in_task ??
        task?.autonomy_level ??
        task?.problem_category ??
        task?.business_domain ??
        task?.estimated_users_affected ??
        task?.impact_scope ??
        (hasNonEmptyArray(task?.expected_deliverables) ? 'deliverables' : null) ??
        (hasNonEmptyArray(task?.measurable_outcomes) ? 'measurable-outcomes' : null)
    )
  )

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatRelativeDate(dateStr: string | null): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < -1) return `Quá hạn ${Math.abs(days)} ngày`
    if (days === -1) return 'Quá hạn hôm qua'
    if (days === 0) return 'Hôm nay'
    if (days === 1) return 'Ngày mai'
    return `Còn ${days} ngày`
  }

  const isOverdue = $derived(task?.due_date ? new Date(task.due_date).getTime() < Date.now() : false)

  function handleStatusChange(newStatus: string) {
    if (!task || !onChangeStatus) return

    const decision = getStatusChangeDecision?.(task, newStatus) ?? { allowed: true }
    if (!decision.allowed) return

    onChangeStatus(task, newStatus)
  }

  function getSidebarStatusChangeDecision(newStatus: string): CapabilityDecision {
    if (!task) return { allowed: false, reason: null }
    return getStatusChangeDecision?.(task, newStatus) ?? { allowed: true }
  }
</script>

<Dialog {open} onOpenChange={onOpenChange}>
  <DialogContent class="w-[96vw] sm:max-w-6xl h-[92vh] max-h-[92vh] p-0 overflow-hidden">
    {#if task}
      <div class="flex h-full flex-col">
        <header class="border-b p-5">
          <div class="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span class="rounded bg-muted px-2 py-1 font-mono">{task.id.slice(0, 8)}</span>
            <Sparkles class="h-3.5 w-3.5" />
            <span>Issue</span>
          </div>

          <h2 class="text-2xl font-bold leading-tight">{task.title}</h2>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            {#if onEdit}
              <Button size="sm" variant="outline" onclick={() => { onEdit(task); }}>
                <Pencil class="mr-1 h-3.5 w-3.5" />
                {t('common.edit', {}, 'Chỉnh sửa')}
              </Button>
            {/if}
              <Button size="sm" variant="outline" onclick={() => window.open(`/tasks/${task.id}`, '_blank')}>
                <ArrowUpRight class="mr-1 h-3.5 w-3.5" />
                {t('common.open', {}, 'Mở')}
              </Button>
              {#if isHydratingDetail}
                <span class="text-xs text-muted-foreground">Đang tải chi tiết đầy đủ...</span>
              {/if}
            </div>
          </header>

        <div class="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_280px]">
          <section class="min-w-0 overflow-y-auto p-5">
            <div class="space-y-6">
              <div>
                <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('task.description', {}, 'Mô tả')}
                </h3>
                {#if task.description}
                  <div class="rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </div>
                {:else}
                  <div class="rounded-lg border border-dashed p-4 text-sm italic text-muted-foreground">
                    {t('task.no_description', {}, 'Không có mô tả')}
                  </div>
                {/if}
              </div>

              {#if task.parentTask}
                <div>
                  <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('task.parent_task', {}, 'Task cha')}
                  </h3>
                  <div class="rounded-lg border p-3 text-sm">
                    <span class="font-medium">{task.parentTask.title}</span>
                    <Badge variant="outline" class="ml-2 text-[10px]">{task.parentTask.status}</Badge>
                  </div>
                </div>
              {/if}

              {#if task.childTasks && task.childTasks.length > 0}
                <div>
                  <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('task.child_tasks', {}, 'Task con')} ({task.childTasks.length})
                  </h3>
                  <div class="space-y-2">
                    {#each task.childTasks as child (child.id)}
                      <div class="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <span class="truncate pr-2">{child.title}</span>
                        <Badge variant="outline" class="shrink-0 text-[10px]">{child.status}</Badge>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if hasContextCard}
                <div class="rounded-lg border bg-muted/5 p-4 space-y-4">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span class="text-primary font-bold">✦</span> Bối cảnh & Nghiệm thu chi tiết
                  </h4>

                  {#if task.context_background}
                    <div class="space-y-1">
                      <span class="text-[11px] font-bold text-muted-foreground uppercase">Bối cảnh nghiệp vụ</span>
                      <p class="text-xs bg-muted/40 p-2.5 rounded-md whitespace-pre-wrap border border-border/40">{task.context_background}</p>
                    </div>
                  {/if}

                  {#if task.acceptance_criteria}
                    <div class="space-y-1">
                      <span class="text-[11px] font-bold text-muted-foreground uppercase">Tiêu chí nghiệm thu (Acceptance)</span>
                      <p class="text-xs bg-muted/40 p-2.5 rounded-md whitespace-pre-wrap border border-border/40">{task.acceptance_criteria}</p>
                    </div>
                  {/if}

                  {#if task.verification_method}
                    <div class="space-y-1">
                      <span class="text-[11px] font-bold text-muted-foreground uppercase">Phương thức xác minh</span>
                      <p class="text-xs bg-muted/40 p-2.5 rounded-md whitespace-pre-wrap border border-border/40">{task.verification_method}</p>
                    </div>
                  {/if}

                  <!-- Tech Stack & Domain Tags -->
                  <div class="grid gap-3 sm:grid-cols-2">
                    {#if task.tech_stack && task.tech_stack.length > 0}
                      <div class="space-y-1">
                        <span class="text-[11px] font-bold text-muted-foreground uppercase">Tech Stack</span>
                        <div class="flex flex-wrap gap-1 pt-0.5">
                          {#each task.tech_stack as tech}
                            <Badge variant="secondary" class="bg-primary/5 text-primary border border-primary/10 text-[10px] py-0 px-1.5">{tech}</Badge>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    {#if task.domain_tags && task.domain_tags.length > 0}
                      <div class="space-y-1">
                        <span class="text-[11px] font-bold text-muted-foreground uppercase">Domain Tags</span>
                        <div class="flex flex-wrap gap-1 pt-0.5">
                          {#each task.domain_tags as tag}
                            <Badge variant="outline" class="border-indigo-100 text-indigo-700 bg-indigo-50/40 text-[10px] py-0 px-1.5">{tag}</Badge>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>

                  {#if task.learning_objectives && task.learning_objectives.length > 0}
                    <div class="space-y-1">
                      <span class="text-[11px] font-bold text-muted-foreground uppercase">Mục tiêu học tập</span>
                      <ul class="list-disc list-inside text-xs pl-0.5 text-muted-foreground space-y-0.5">
                        {#each task.learning_objectives as obj}
                          <li><span class="text-foreground">{obj}</span></li>
                        {/each}
                      </ul>
                    </div>
                  {/if}

                  <!-- Advanced Info Grid -->
                  <div class="border-t pt-3 space-y-2">
                    <span class="text-[11px] font-bold text-muted-foreground uppercase block">AI & Dispute Resolution Info</span>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                      {#if task.task_type}
                        <div class="rounded border p-1.5 bg-muted/20">
                          <span class="text-[9px] text-muted-foreground block font-bold uppercase">Loại Task</span>
                          <span class="font-medium truncate block">{task.task_type}</span>
                        </div>
                      {/if}
                      {#if task.environment}
                        <div class="rounded border p-1.5 bg-muted/20">
                          <span class="text-[9px] text-muted-foreground block font-bold uppercase">Môi trường</span>
                          <span class="font-medium truncate block">{task.environment}</span>
                        </div>
                      {/if}
                      {#if task.collaboration_type}
                        <div class="rounded border p-1.5 bg-muted/20">
                          <span class="text-[9px] text-muted-foreground block font-bold uppercase">Cộng tác</span>
                          <span class="font-medium truncate block">{task.collaboration_type}</span>
                        </div>
                      {/if}
                      {#if task.role_in_task}
                        <div class="rounded border p-1.5 bg-muted/20">
                          <span class="text-[9px] text-muted-foreground block font-bold uppercase">Vai trò</span>
                          <span class="font-medium truncate block">{task.role_in_task}</span>
                        </div>
                      {/if}
                      {#if task.autonomy_level}
                        <div class="rounded border p-1.5 bg-muted/20">
                          <span class="text-[9px] text-muted-foreground block font-bold uppercase">Tự chủ</span>
                          <span class="font-medium truncate block">{task.autonomy_level}</span>
                        </div>
                      {/if}
                      {#if task.problem_category}
                        <div class="rounded border p-1.5 bg-muted/20">
                          <span class="text-[9px] text-muted-foreground block font-bold uppercase">Vấn đề</span>
                          <span class="font-medium truncate block">{task.problem_category}</span>
                        </div>
                      {/if}
                      {#if task.business_domain}
                        <div class="rounded border p-1.5 bg-muted/20">
                          <span class="text-[9px] text-muted-foreground block font-bold uppercase">Nghiệp vụ</span>
                          <span class="font-medium truncate block">{task.business_domain}</span>
                        </div>
                      {/if}
                      {#if task.estimated_users_affected !== undefined && task.estimated_users_affected !== null}
                        <div class="rounded border p-1.5 bg-muted/20">
                          <span class="text-[9px] text-muted-foreground block font-bold uppercase font-bold">User ảnh hưởng</span>
                          <span class="font-medium block">{task.estimated_users_affected}</span>
                        </div>
                      {/if}
                      {#if task.complexity_notes}
                        <div class="col-span-full rounded border p-1.5 bg-muted/20">
                          <span class="text-[9px] text-muted-foreground block font-bold uppercase">Ghi chú độ phức tạp</span>
                          <span class="font-medium block whitespace-pre-wrap">{task.complexity_notes}</span>
                        </div>
                      {/if}
                    </div>
                  </div>

                  <TaskExecutionBrief task={task} />
                </div>
              {/if}
            </div>
          </section>

          <TaskDetailMetadataSidebar
            {task}
            {metadata}
            {activeStatusId}
            {priorityLabel}
            {labelLabel}
            {isOverdue}
            {formatDate}
            {formatRelativeDate}
            onStatusChange={handleStatusChange}
            getStatusChangeDecision={getSidebarStatusChangeDecision}
            {statusConfig}
            {priorityClass}
          />
        </div>
      </div>
    {/if}
  </DialogContent>
</Dialog>

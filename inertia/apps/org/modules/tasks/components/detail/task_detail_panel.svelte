<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import {
    Clock,
    CircleCheck,
    Circle,
    CircleX,
    Eye,
    Pencil,
    Sparkles,
  } from 'lucide-svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'

  import TaskDetailMetadataSidebar from '@/apps/org/modules/tasks/components/detail/task_detail_metadata_sidebar.svelte'
  import TaskDiscussionTab from '@/apps/org/modules/tasks/components/detail/task_discussion_tab.svelte'
  import TaskExecutionBrief from '@/apps/org/modules/tasks/components/detail/task_execution_brief.svelte'
  import TaskFilesTab from '@/apps/org/modules/tasks/components/detail/task_files_tab.svelte'

  interface CapabilityDecision {
    allowed: boolean
    reason?: string | null
  }

  interface WorkSurfacePermissions {
    isCreator?: boolean
    isAssignee?: boolean
    canEdit?: boolean
    canAssign?: boolean
    canChangeStatus?: boolean
    canComment?: boolean
    canOpenWorkTabs?: boolean
  }

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: TaskDetail | null
    metadata: {
      statuses: { value: string; label: string; color?: string }[]
      labels: { value: string; label: string; color?: string }[]
      priorities: { value: string; label: string; color?: string }[]
      users: { id: string; username: string; email: string }[]
    }
    isHydratingDetail?: boolean
    onReloadBrief?: () => void | Promise<void>
    onChangeStatus?: (task: TaskDetail, toStatusId: string) => void
    getStatusChangeDecision?: (task: TaskDetail, toStatusId: string) => CapabilityDecision
    shellMode?: 'app' | 'organization'
    workSurfacePermissions?: WorkSurfacePermissions | null
  }

  const {
    open = false,
    onOpenChange,
    task,
    metadata,
    isHydratingDetail = false,
    onReloadBrief,
    onChangeStatus,
    getStatusChangeDecision,
    workSurfacePermissions = null,
  }: Props = $props()

  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  let filesOpen = $state(false)
  async function reloadBrief(): Promise<void> {
    if (onReloadBrief) {
      await onReloadBrief()
      return
    }

    router.reload({ only: ['task'] })
  }

  const statusConfig: Partial<Record<string, { icon: typeof Circle; color: string; bgColor: string }>> = {
    todo: { icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-secondary' },
    in_progress: { icon: Clock, color: 'text-foreground', bgColor: 'bg-muted' },
    in_review: { icon: Eye, color: 'text-primary', bgColor: 'bg-accent border border-primary/10' },
    done: { icon: CircleCheck, color: 'text-primary', bgColor: 'bg-primary/10' },
    cancelled: { icon: CircleX, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  }

  const priorityConfig: Record<string, { color: string; bgColor: string }> = {
    urgent: { color: 'text-destructive', bgColor: 'bg-destructive/10' },
    high: { color: 'text-primary', bgColor: 'bg-primary/10' },
    medium: { color: 'text-foreground', bgColor: 'bg-muted' },
    low: { color: 'text-muted-foreground', bgColor: 'bg-secondary' },
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
        (hasNonEmptyArray(task?.domain_tags) ? 'domain-tags' : null) ??
        task?.environment ??
        task?.collaboration_type ??
        task?.complexity_notes ??
        task?.role_in_task ??
        task?.autonomy_level ??
        task?.problem_category ??
        task?.business_domain ??
        task?.estimated_users_affected ??
        task?.resolved_brief ??
        (hasNonEmptyArray(task?.expected_deliverables) ? 'deliverables' : null)
    )
  )

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—'
    const parsed = new Date(dateStr)
    if (Number.isNaN(parsed.getTime())) return dateStr
    return new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed)
  }

  function formatRelativeDate(dateStr: string | null): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = d.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days < -1) {
      const count = Math.abs(days)
      return t('task.detail_panel.relative_overdue_days', { count }, `${count} days overdue`)
    }
    if (days === -1) return t('task.detail_panel.relative_overdue_yesterday', {}, 'Overdue yesterday')
    if (days === 0) return t('task.detail_panel.relative_today', {}, 'Today')
    if (days === 1) return t('task.detail_panel.relative_tomorrow', {}, 'Tomorrow')
    return t('task.detail_panel.relative_days_remaining', { count: days }, `${days} days left`)
  }

  const isOverdue = $derived(task?.due_date ? new Date(task.due_date).getTime() < Date.now() : false)
  const currentUserId = $derived(
    (page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id ?? null
  )
  const taskPermissions = $derived((task?.permissions ?? null) as WorkSurfacePermissions | null)
  const effectiveWorkSurfacePermissions = $derived(workSurfacePermissions ?? taskPermissions)
  // A board viewer may discuss the task; marketplace previews are read-only.
  // Keep the legacy fallback for board payloads that predate canComment.
  const canOpenDiscussion = $derived(
    Boolean(task) && effectiveWorkSurfacePermissions?.canComment !== false
  )
  const canOpenWorkTabs = $derived(
    effectiveWorkSurfacePermissions?.canOpenWorkTabs ??
      Boolean(
        effectiveWorkSurfacePermissions?.isCreator ||
          effectiveWorkSurfacePermissions?.isAssignee ||
          effectiveWorkSurfacePermissions?.canEdit ||
          effectiveWorkSurfacePermissions?.canAssign ||
          effectiveWorkSurfacePermissions?.canChangeStatus ||
          (currentUserId &&
            (task?.creator_id === currentUserId ||
              task?.assigned_to === currentUserId ||
              task?.assignee?.id === currentUserId))
      )
  )
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
            <span>{t('task.detail_panel.issue_label', {}, 'Issue')}</span>
          </div>

          <h2 class="text-2xl font-bold leading-tight">{task.title}</h2>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            {#if effectiveWorkSurfacePermissions?.canEdit}
              <Button size="sm" variant="outline" onclick={() => router.visit(`/tasks/${task.id}/edit`)}>
                <Pencil class="mr-1 h-3.5 w-3.5" />
                {t('common.edit', {}, 'Edit')}
              </Button>
            {/if}
              {#if isHydratingDetail}
                <span class="text-xs text-muted-foreground">{t('task.detail_panel.hydrating_detail', {}, 'Loading full detail...')}</span>
              {/if}
            </div>
          </header>

        <div class="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_280px]">
          <section class="min-w-0 overflow-y-auto p-5">
            <div class="space-y-6">
              <div>
                <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('task.description', {}, 'Description')}
                </h3>
                {#if task.description}
                  <div class="rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </div>
                {:else}
                  <div class="rounded-lg border border-dashed p-4 text-sm italic text-muted-foreground">
                    {t('task.no_description', {}, 'No description')}
                  </div>
                {/if}
              </div>

              {#if task.parentTask}
                <div>
                  <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('task.parent_task', {}, 'Parent task')}
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
                    {t('task.child_tasks', {}, 'Child tasks')} ({task.childTasks.length})
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
                <TaskExecutionBrief
                  task={task}
                  resolvedBrief={task.resolved_brief}
                  onReloadBrief={reloadBrief}
                />
              {/if}

              {#if task.id && canOpenDiscussion}
                <details class="rounded-lg border bg-background/70 p-3" data-testid="task-detail-discussion">
                  <summary class="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-1 py-1 text-left">
                    <span class="font-semibold">{t('task.discussion_tab.title', {}, 'Task discussion')}</span>
                    <span class="text-xs text-muted-foreground">{t('common.expand', {}, 'Open when needed')}</span>
                  </summary>
                  <div class="pt-3">
                    <TaskDiscussionTab taskId={task.id} {currentUserId} />
                  </div>
                </details>
              {/if}

              {#if task.id && canOpenWorkTabs}
                <section class="rounded-lg border bg-background/70 p-4" data-testid="task-detail-files">
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-3 text-left"
                    aria-expanded={filesOpen}
                    onclick={() => { filesOpen = !filesOpen }}
                  >
                    <span class="font-semibold">{t('task.files_tab.title', {}, 'Attachments')}</span>
                    <span class="text-xs text-muted-foreground">
                      {filesOpen ? t('common.collapse', {}, 'Thu gọn') : t('common.expand', {}, 'Mở khi cần')}
                    </span>
                  </button>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {t('task.files_tab.supporting_help', {}, 'Tài liệu hỗ trợ cho task; không phải bằng chứng bắt buộc để chuyển trạng thái.')}
                  </p>
                  {#if filesOpen}
                    <div class="mt-4">
                      <TaskFilesTab taskId={task.id} {currentUserId} />
                    </div>
                  {/if}
                </section>
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

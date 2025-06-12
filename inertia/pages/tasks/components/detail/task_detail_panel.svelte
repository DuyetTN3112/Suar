<script lang="ts">
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import type { Task } from '../../types.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import {
    Calendar,
    Clock,
    Tag,
    AlertCircle,
    CheckCircle2,
    Circle,
    XCircle,
    Eye,
    ArrowUpRight,
    Pencil,
    User,
    Building2,
    Sparkles,
  } from 'lucide-svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    task: Task | null
    store: TaskStore
    metadata: {
      statuses: Array<{ value: string; label: string; color?: string }>
      labels: Array<{ value: string; label: string; color?: string }>
      priorities: Array<{ value: string; label: string; color?: string }>
      users: Array<{ id: string; username: string; email: string }>
    }
    onEdit?: (task: Task) => void
  }

  let {
    open = $bindable(false),
    onOpenChange,
    task,
    store,
    metadata,
    onEdit,
  }: Props = $props()

  const { t } = useTranslation()

  const statusConfig: Record<string, { icon: typeof Circle; color: string; bgColor: string }> = {
    todo: { icon: Circle, color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-800' },
    in_progress: { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    in_review: { icon: Eye, color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
    done: { icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    cancelled: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  }

  const priorityConfig: Record<string, { color: string; bgColor: string }> = {
    urgent: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    high: { color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    medium: { color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
    low: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  }

  const priorityLabel = $derived(
    task ? metadata.priorities.find(p => p.value === task.priority)?.label ?? task.priority : ''
  )
  const labelLabel = $derived(
    task ? metadata.labels.find(l => l.value === task.label)?.label ?? task.label : ''
  )

  const pConfig = $derived(task ? priorityConfig[task.priority] : undefined)

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
    if (!task) return
    store.moveTaskStatus(task.id, newStatus as Task['status'])
  }
</script>

<Dialog bind:open onOpenChange={onOpenChange}>
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
            </div>
          </section>

          <aside class="overflow-y-auto border-l bg-muted/10 p-4">
            <div class="space-y-5">
              <div>
                <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('task.status', {}, 'Trạng thái')}
                </h3>
                <div class="flex flex-wrap gap-1.5">
                  {#each metadata.statuses as statusOption}
                    {@const config = statusConfig[statusOption.value]}
                    {@const StatusIcon = config?.icon}
                    <button
                      class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border {task.status === statusOption.value
                        ? `${config?.bgColor ?? 'bg-muted'} ${config?.color ?? 'text-foreground'} border-current/20 ring-1 ring-current/10`
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}"
                      onclick={() => { handleStatusChange(statusOption.value); }}
                    >
                      {#if StatusIcon}
                        <StatusIcon class="h-3 w-3" />
                      {/if}
                      {statusOption.label}
                    </button>
                  {/each}
                </div>
              </div>

              <Separator />

              <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-foreground">{t('task.priority', {}, 'Ưu tiên')}</span>
                  <Badge variant="outline" class="border-0 {pConfig?.bgColor ?? ''} {pConfig?.color ?? ''}">
                    <AlertCircle class="mr-1 h-3 w-3" />
                    {priorityLabel}
                  </Badge>
                </div>

                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-foreground">{t('task.label', {}, 'Nhãn')}</span>
                  <Badge variant="outline">
                    <Tag class="mr-1 h-3 w-3" />
                    {labelLabel}
                  </Badge>
                </div>

                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-foreground">{t('task.assignee', {}, 'Người thực hiện')}</span>
                  {#if task.assignee}
                    <span class="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs">
                      <User class="h-3.5 w-3.5" />
                      {task.assignee.username}
                    </span>
                  {:else}
                    <span class="text-xs text-muted-foreground">—</span>
                  {/if}
                </div>

                <div class="flex items-start justify-between gap-3">
                  <span class="text-muted-foreground">{t('task.due_date', {}, 'Hạn chót')}</span>
                  {#if task.due_date}
                    <div class="text-right">
                      <div class="inline-flex items-center gap-1.5 text-xs {isOverdue ? 'text-red-500' : ''}">
                        <Calendar class="h-3.5 w-3.5" />
                        {formatDate(task.due_date)}
                      </div>
                      <p class="mt-0.5 text-[11px] {isOverdue ? 'text-red-400' : 'text-muted-foreground'}">
                        {formatRelativeDate(task.due_date)}
                      </p>
                    </div>
                  {:else}
                    <span class="text-xs text-muted-foreground">—</span>
                  {/if}
                </div>

                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-foreground">{t('task.estimated_time', {}, 'Ước tính')}</span>
                  <span class="inline-flex items-center gap-1 text-xs">
                    <Clock class="h-3.5 w-3.5" />
                    {task.estimated_time ? `${task.estimated_time}h` : '—'}
                  </span>
                </div>

                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-foreground">{t('task.created_at', {}, 'Ngày tạo')}</span>
                  <span class="text-xs">{formatDate(task.created_at)}</span>
                </div>

                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-foreground">{t('task.updated_at', {}, 'Cập nhật')}</span>
                  <span class="text-xs">{formatDate(task.updated_at)}</span>
                </div>

                {#if task.creator}
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-muted-foreground">{t('task.creator', {}, 'Người tạo')}</span>
                    <span class="text-xs">{task.creator.username || task.creator.email}</span>
                  </div>
                {/if}

                {#if task.organization}
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-muted-foreground">{t('task.organization', {}, 'Tổ chức')}</span>
                    <span class="inline-flex items-center gap-1 text-xs">
                      <Building2 class="h-3.5 w-3.5" />
                      {task.organization.name}
                    </span>
                  </div>
                {/if}
              </div>
            </div>
          </aside>
        </div>
      </div>
    {/if}
  </DialogContent>
</Dialog>

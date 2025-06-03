<script lang="ts">
  import Sheet from '@/components/ui/sheet.svelte'
  import SheetContent from '@/components/ui/sheet_content.svelte'
  import SheetHeader from '@/components/ui/sheet_header.svelte'
  import SheetTitle from '@/components/ui/sheet_title.svelte'
  import SheetDescription from '@/components/ui/sheet_description.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import type { Task } from '../../../types.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import {
    Calendar,
    User,
    Clock,
    Tag,
    AlertCircle,
    CheckCircle2,
    Circle,
    XCircle,
    Eye,
    ArrowUpRight,
    Pencil,
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

  const statusLabel = $derived(
    task ? metadata.statuses.find(s => s.value === task.status)?.label ?? task.status : ''
  )
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

  const isOverdue = $derived(() => {
    if (!task?.due_date) return false
    return new Date(task.due_date).getTime() < Date.now()
  })

  function handleStatusChange(newStatus: string) {
    if (!task) return
    store.moveTaskStatus(task.id, newStatus as Task['status'])
  }
</script>

<Sheet bind:open {onOpenChange}>
  <SheetContent class="w-[400px] sm:w-[540px] overflow-y-auto">
    {#if task}
      <SheetHeader>
        <SheetTitle class="text-lg">
          {task.title}
        </SheetTitle>
        <SheetDescription>
          <span class="text-xs text-muted-foreground">ID: {task.id.slice(0, 8)}...</span>
        </SheetDescription>
      </SheetHeader>

      <div class="mt-6 space-y-6">
        <!-- Quick Actions -->
        <div class="flex items-center gap-2">
          {#if onEdit}
            <Button size="sm" variant="outline" onclick={() => { onEdit(task); }}>
              <Pencil class="h-3.5 w-3.5 mr-1" />
              {t('common.edit', {}, 'Chỉnh sửa')}
            </Button>
          {/if}
          <Button size="sm" variant="outline" onclick={() => window.open(`/tasks/${task.id}`, '_blank')}>
            <ArrowUpRight class="h-3.5 w-3.5 mr-1" />
            {t('common.open', {}, 'Mở')}
          </Button>
        </div>

        <Separator />

        <!-- Status -->
        <div>
          <h4 class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            {t('task.status', {}, 'Trạng thái')}
          </h4>
          <div class="flex flex-wrap gap-1.5">
            {#each metadata.statuses as statusOption}
              {@const config = statusConfig[statusOption.value]}
              <button
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border {task.status === statusOption.value
                  ? `${config?.bgColor ?? 'bg-muted'} ${config?.color ?? 'text-foreground'} border-current/20 ring-1 ring-current/10`
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}"
                onclick={() => { handleStatusChange(statusOption.value); }}
              >
                {#if config}
                  <svelte:component this={config.icon} class="h-3 w-3" />
                {/if}
                {statusOption.label}
              </button>
            {/each}
          </div>
        </div>

        <Separator />

        <!-- Properties Grid -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Priority -->
          <div>
            <h4 class="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              {t('task.priority', {}, 'Ưu tiên')}
            </h4>
            <Badge variant="outline" class="{pConfig?.bgColor ?? ''} {pConfig?.color ?? ''} border-0">
              <AlertCircle class="h-3 w-3 mr-1" />
              {priorityLabel}
            </Badge>
          </div>

          <!-- Label -->
          <div>
            <h4 class="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              {t('task.label', {}, 'Nhãn')}
            </h4>
            <Badge variant="outline">
              <Tag class="h-3 w-3 mr-1" />
              {labelLabel}
            </Badge>
          </div>

          <!-- Assignee -->
          <div>
            <h4 class="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              {t('task.assignee', {}, 'Người thực hiện')}
            </h4>
            {#if task.assignee}
              <div class="flex items-center gap-2">
                <div class="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                  {task.assignee.username.charAt(0).toUpperCase()}
                </div>
                <span class="text-sm">{task.assignee.username}</span>
              </div>
            {:else}
              <span class="text-sm text-muted-foreground">—</span>
            {/if}
          </div>

          <!-- Due Date -->
          <div>
            <h4 class="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
              {t('task.due_date', {}, 'Hạn chót')}
            </h4>
            {#if task.due_date}
              <div class="flex items-center gap-1.5 text-sm {isOverdue() ? 'text-red-500' : ''}">
                <Calendar class="h-3.5 w-3.5" />
                <span>{formatDate(task.due_date)}</span>
              </div>
              <span class="text-xs {isOverdue() ? 'text-red-400' : 'text-muted-foreground'} mt-0.5 block">
                {formatRelativeDate(task.due_date)}
              </span>
            {:else}
              <span class="text-sm text-muted-foreground">—</span>
            {/if}
          </div>

          <!-- Difficulty -->
          {#if task.difficulty}
            <div>
              <h4 class="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                {t('task.difficulty', {}, 'Độ khó')}
              </h4>
              <Badge variant="secondary" class="capitalize">{task.difficulty}</Badge>
            </div>
          {/if}

          <!-- Estimated Time -->
          {#if task.estimated_time}
            <div>
              <h4 class="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                {t('task.estimated_time', {}, 'Thời gian ước tính')}
              </h4>
              <div class="flex items-center gap-1.5 text-sm">
                <Clock class="h-3.5 w-3.5 text-muted-foreground" />
                <span>{task.estimated_time}h</span>
              </div>
            </div>
          {/if}
        </div>

        <Separator />

        <!-- Description -->
        <div>
          <h4 class="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            {t('task.description', {}, 'Mô tả')}
          </h4>
          {#if task.description}
            <div class="text-sm leading-relaxed whitespace-pre-wrap rounded-md bg-muted/30 p-3">
              {task.description}
            </div>
          {:else}
            <p class="text-sm text-muted-foreground italic">
              {t('task.no_description', {}, 'Không có mô tả')}
            </p>
          {/if}
        </div>

        <Separator />

        <!-- Metadata -->
        <div class="space-y-2 text-xs text-muted-foreground">
          <div class="flex justify-between">
            <span>{t('task.created_at', {}, 'Ngày tạo')}</span>
            <span>{formatDate(task.created_at)}</span>
          </div>
          <div class="flex justify-between">
            <span>{t('task.updated_at', {}, 'Cập nhật')}</span>
            <span>{formatDate(task.updated_at)}</span>
          </div>
          {#if task.creator}
            <div class="flex justify-between">
              <span>{t('task.creator', {}, 'Người tạo')}</span>
              <span>{task.creator.username}</span>
            </div>
          {/if}
          {#if task.organization}
            <div class="flex justify-between">
              <span>{t('task.organization', {}, 'Tổ chức')}</span>
              <span>{task.organization.name}</span>
            </div>
          {/if}
        </div>

        <!-- Parent Task -->
        {#if task.parentTask}
          <div>
            <Separator />
            <h4 class="text-xs font-medium text-muted-foreground mb-2 mt-4 uppercase tracking-wider">
              {t('task.parent_task', {}, 'Task cha')}
            </h4>
            <div class="rounded-md border p-2.5 text-sm">
              <span class="font-medium">{task.parentTask.title}</span>
              <Badge variant="outline" class="ml-2 text-[10px]">{task.parentTask.status}</Badge>
            </div>
          </div>
        {/if}

        <!-- Child Tasks -->
        {#if task.childTasks && task.childTasks.length > 0}
          <div>
            <Separator />
            <h4 class="text-xs font-medium text-muted-foreground mb-2 mt-4 uppercase tracking-wider">
              {t('task.child_tasks', {}, 'Task con')} ({task.childTasks.length})
            </h4>
            <div class="space-y-1.5">
              {#each task.childTasks as child (child.id)}
                <div class="rounded-md border p-2 text-sm flex items-center justify-between">
                  <span class="truncate flex-1">{child.title}</span>
                  <Badge variant="outline" class="text-[10px] shrink-0 ml-2">{child.status}</Badge>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </SheetContent>
</Sheet>

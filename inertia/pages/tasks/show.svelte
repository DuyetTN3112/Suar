<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import AlertDialogRoot from '@/components/ui/alert_dialog.svelte'
  import AlertDialogContent from '@/components/ui/alert_dialog_content.svelte'
  import AlertDialogHeader from '@/components/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/components/ui/alert_dialog_title.svelte'
  import AlertDialogDescription from '@/components/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/components/ui/alert_dialog_footer.svelte'
  import AlertDialogCancel from '@/components/ui/alert_dialog_cancel.svelte'
  import AlertDialogAction from '@/components/ui/alert_dialog_action.svelte'
  import ArrowLeft from 'lucide-svelte/icons/arrow-left'
  import Edit from 'lucide-svelte/icons/pencil'
  import Trash2 from 'lucide-svelte/icons/trash-2'
  import Calendar from 'lucide-svelte/icons/calendar'
  import Clock from 'lucide-svelte/icons/clock'
  import User from 'lucide-svelte/icons/user'
  import Building from 'lucide-svelte/icons/building'
  import Eye from 'lucide-svelte/icons/eye'
  import LinkIcon from 'lucide-svelte/icons/link'
  import ListTodo from 'lucide-svelte/icons/list-todo'
  import History from 'lucide-svelte/icons/history'
  import DollarSign from 'lucide-svelte/icons/dollar-sign'
  import type { Task } from './types.svelte'
  import { formatDate, formatDateTime, formatEstimatedTime } from './utils/task_formatter.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    task: Task
    permissions: {
      canEdit: boolean
      canDelete: boolean
      canAssign: boolean
      canChangeStatus: boolean
      canApply: boolean
    }
    auditLogs: Array<{
      id: string
      action: string
      changes: Record<string, { old: unknown; new: unknown }>
      created_at: string
      user?: { id: string; username: string }
    }>
  }

  const { task, permissions, auditLogs }: Props = $props()
  const { t } = useTranslation()

  let deleteDialogOpen = $state(false)
  let deleting = $state(false)

  const statusColors: Record<string, string> = {
    todo: 'bg-slate-100 text-slate-800',
    in_progress: 'bg-blue-100 text-blue-800',
    in_review: 'bg-fuchsia-100 text-fuchsia-800',
    done: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  }

  const labelColors: Record<string, string> = {
    bug: 'bg-red-100 text-red-800',
    feature: 'bg-blue-100 text-blue-800',
    enhancement: 'bg-fuchsia-100 text-fuchsia-800',
    documentation: 'bg-orange-100 text-orange-800',
  }

  const statusLabel = $derived(t(`task.status_${task.status}`, {}, task.status))
  const priorityLabel = $derived(t(`task.priority_${task.priority}`, {}, task.priority))
  const labelLabel = $derived(t(`task.label_${task.label}`, {}, task.label))

  function handleBack() {
    router.visit('/tasks')
  }

  function handleEdit() {
    router.visit(`/tasks/${task.id}/edit`)
  }

  function handleApply() {
    router.post(`/tasks/${task.id}/apply`)
  }

  function confirmDelete() {
    deleting = true
    router.delete(`/tasks/${task.id}`, {
      onSuccess: () => {
        deleteDialogOpen = false
        deleting = false
      },
      onError: () => {
        deleting = false
      },
    })
  }

  function formatChangeValue(value: unknown): string {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint'
    ) {
      return String(value)
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.map((item) => formatChangeValue(item)).join(', ') : '[]'
    }
    if (typeof value === 'function' || typeof value === 'symbol') {
      return value.toString()
    }

    return JSON.stringify(value)
  }
</script>

<svelte:head>
  <title>{task.title}</title>
</svelte:head>

<AppLayout title={task.title}>
  <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex-1 space-y-3">
        <Button variant="ghost" size="sm" onclick={handleBack}>
          <ArrowLeft class="size-4 mr-1" />
          {t('common.back', {}, 'Quay lại')}
        </Button>

        <h1 class="text-3xl font-black tracking-tight">{task.title}</h1>

        <div class="flex flex-wrap items-center gap-2">
          <Badge class={statusColors[task.status] || ''}>
            {statusLabel}
          </Badge>
          <Badge class={priorityColors[task.priority] || ''}>
            {priorityLabel}
          </Badge>
          <Badge class={labelColors[task.label] || ''}>
            {labelLabel}
          </Badge>
          {#if task.difficulty}
            <Badge variant="outline">{task.difficulty}</Badge>
          {/if}
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if permissions.canApply}
          <Button onclick={handleApply}>
            {t('task.apply', {}, 'Ứng tuyển')}
          </Button>
        {/if}
        {#if permissions.canEdit}
          <Button variant="outline" onclick={handleEdit}>
            <Edit class="size-4 mr-1" />
            {t('common.edit', {}, 'Sửa')}
          </Button>
        {/if}
        {#if permissions.canDelete}
          <Button variant="destructive" onclick={() => { deleteDialogOpen = true }}>
            <Trash2 class="size-4 mr-1" />
            {t('common.delete', {}, 'Xóa')}
          </Button>
        {/if}
      </div>
    </div>

    <!-- Main 2-column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left column (wider) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Description -->
        <Card>
          <CardHeader>
            <CardTitle>{t('task.description', {}, 'Mô tả')}</CardTitle>
          </CardHeader>
          <CardContent>
            {#if task.description}
              <div class="prose prose-sm max-w-none whitespace-pre-wrap">
                {task.description}
              </div>
            {:else}
              <p class="text-muted-foreground italic">
                {t('task.no_description', {}, 'Chưa có mô tả.')}
              </p>
            {/if}
          </CardContent>
        </Card>

        <!-- Parent Task -->
        {#if task.parentTask}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <LinkIcon class="size-4" />
                {t('task.parent_task', {}, 'Nhiệm vụ cha')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href="/tasks/{task.parentTask.id}"
                class="inline-flex items-center gap-2 font-bold text-primary hover:underline"
              >
                {task.parentTask.title}
                <Badge variant="outline" class="text-xs">{task.parentTask.status}</Badge>
              </a>
            </CardContent>
          </Card>
        {/if}

        <!-- Child Tasks -->
        {#if task.childTasks && task.childTasks.length > 0}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <ListTodo class="size-4" />
                {t('task.child_tasks', {}, 'Nhiệm vụ con')} ({task.childTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                {#each task.childTasks as child (child.id)}
                  <a
                    href="/tasks/{child.id}"
                    class="flex items-center justify-between rounded-md border-2 border-border p-3 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                  >
                    <span class="font-bold">{child.title}</span>
                    <div class="flex items-center gap-2">
                      <Badge class={statusColors[child.status] || ''} >
                        {child.status}
                      </Badge>
                      <Badge class={priorityColors[child.priority] || ''} >
                        {child.priority}
                      </Badge>
                    </div>
                  </a>
                {/each}
              </div>
            </CardContent>
          </Card>
        {/if}

        <!-- Audit Log -->
        {#if auditLogs.length > 0}
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <History class="size-4" />
                {t('task.audit_log', {}, 'Lịch sử thay đổi')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                {#each auditLogs as log (log.id)}
                  <div class="relative pl-6 pb-4 border-l-2 border-border last:pb-0">
                    <div class="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary border-2 border-border"></div>
                    <div class="flex flex-col gap-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-sm">
                          {log.user?.username || t('task.system', {}, 'Hệ thống')}
                        </span>
                        <Badge variant="outline" class="text-xs">{log.action}</Badge>
                        <span class="text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                      {#if Object.keys(log.changes).length > 0}
                        <div class="mt-1 space-y-1">
                          {#each Object.entries(log.changes) as [field, change]}
                            <div class="text-xs text-muted-foreground">
                              <span class="font-bold">{field}:</span>
                              <span class="line-through text-red-500">{formatChangeValue(change.old)}</span>
                              →
                              <span class="text-blue-600 font-bold">{formatChangeValue(change.new)}</span>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </CardContent>
          </Card>
        {/if}
      </div>

      <!-- Right sidebar -->
      <div class="space-y-6">
        <!-- Details Card -->
        <Card>
          <CardHeader>
            <CardTitle>{t('task.details', {}, 'Chi tiết')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <!-- Assignee -->
              <div class="flex items-start gap-3">
                <User class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p class="text-xs font-bold uppercase text-muted-foreground">
                    {t('task.assigned_to', {}, 'Người thực hiện')}
                  </p>
                  <p class="font-bold">
                    {task.assignee?.username || t('task.unassigned', {}, 'Chưa phân công')}
                  </p>
                  {#if task.assignee?.email}
                    <p class="text-xs text-muted-foreground">{task.assignee.email}</p>
                  {/if}
                </div>
              </div>

              <Separator />

              <!-- Creator -->
              <div class="flex items-start gap-3">
                <User class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p class="text-xs font-bold uppercase text-muted-foreground">
                    {t('task.creator', {}, 'Người tạo')}
                  </p>
                  <p class="font-bold">
                    {task.creator?.username || '—'}
                  </p>
                  {#if task.creator?.email}
                    <p class="text-xs text-muted-foreground">{task.creator.email}</p>
                  {/if}
                </div>
              </div>

              <Separator />

              <!-- Organization -->
              {#if task.organization}
                <div class="flex items-start gap-3">
                  <Building class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p class="text-xs font-bold uppercase text-muted-foreground">
                      {t('task.organization', {}, 'Tổ chức')}
                    </p>
                    <p class="font-bold">{task.organization.name}</p>
                  </div>
                </div>
                <Separator />
              {/if}

              <!-- Due Date -->
              <div class="flex items-start gap-3">
                <Calendar class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p class="text-xs font-bold uppercase text-muted-foreground">
                    {t('task.due_date', {}, 'Hạn hoàn thành')}
                  </p>
                  <p class="font-bold">
                    {task.due_date ? formatDate(task.due_date) : '—'}
                  </p>
                </div>
              </div>

              <Separator />

              <!-- Estimated Time -->
              <div class="flex items-start gap-3">
                <Clock class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p class="text-xs font-bold uppercase text-muted-foreground">
                    {t('task.estimated_time', {}, 'Thời gian ước tính')}
                  </p>
                  <p class="font-bold">
                    {task.estimated_time ? formatEstimatedTime(task.estimated_time) : '—'}
                  </p>
                </div>
              </div>

              <Separator />

              <!-- Actual Time -->
              <div class="flex items-start gap-3">
                <Clock class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p class="text-xs font-bold uppercase text-muted-foreground">
                    {t('task.actual_time', {}, 'Thời gian thực tế')}
                  </p>
                  <p class="font-bold">
                    {task.actual_time ? formatEstimatedTime(task.actual_time) : '—'}
                  </p>
                </div>
              </div>

              <!-- Visibility -->
              {#if task.task_visibility}
                <Separator />
                <div class="flex items-start gap-3">
                  <Eye class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p class="text-xs font-bold uppercase text-muted-foreground">
                      {t('task.visibility', {}, 'Hiển thị')}
                    </p>
                    <p class="font-bold">{task.task_visibility}</p>
                  </div>
                </div>
              {/if}

              <!-- Estimated Budget -->
              {#if task.estimated_budget != null}
                <Separator />
                <div class="flex items-start gap-3">
                  <DollarSign class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p class="text-xs font-bold uppercase text-muted-foreground">
                      {t('task.estimated_budget', {}, 'Ngân sách ước tính')}
                    </p>
                    <p class="font-bold">
                      {task.estimated_budget.toLocaleString('vi-VN')} ₫
                    </p>
                  </div>
                </div>
              {/if}

              <!-- Application Deadline -->
              {#if task.application_deadline}
                <Separator />
                <div class="flex items-start gap-3">
                  <Calendar class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p class="text-xs font-bold uppercase text-muted-foreground">
                      {t('task.application_deadline', {}, 'Hạn ứng tuyển')}
                    </p>
                    <p class="font-bold">{formatDate(task.application_deadline)}</p>
                  </div>
                </div>
              {/if}

              <Separator />

              <!-- Created / Updated -->
              <div class="flex items-start gap-3">
                <Calendar class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p class="text-xs font-bold uppercase text-muted-foreground">
                    {t('common.created_at', {}, 'Ngày tạo')}
                  </p>
                  <p class="font-bold">{formatDateTime(task.created_at)}</p>
                  <p class="text-xs text-muted-foreground mt-1">
                    {t('common.updated_at', {}, 'Cập nhật')}: {formatDateTime(task.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Dialog -->
  <AlertDialogRoot bind:open={deleteDialogOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {t('task.confirm_delete', {}, 'Xác nhận xóa nhiệm vụ')}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {t('task.confirm_delete_description', {}, 'Bạn có chắc chắn muốn xóa nhiệm vụ')} "{task.title}"?
          {t('task.action_irreversible', {}, 'Hành động này không thể hoàn tác.')}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t('common.cancel', {}, 'Hủy')}</AlertDialogCancel>
        <AlertDialogAction class="bg-red-500 hover:bg-red-600">
          <button onclick={confirmDelete} disabled={deleting} class="w-full h-full">
            {deleting ? t('common.deleting', {}, 'Đang xóa...') : t('common.delete', {}, 'Xóa')}
          </button>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialogRoot>
</AppLayout>

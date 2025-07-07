<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import ArrowLeft from 'lucide-svelte/icons/arrow-left'
  import History from 'lucide-svelte/icons/history'
  import LinkIcon from 'lucide-svelte/icons/link'
  import ListTodo from 'lucide-svelte/icons/list-todo'
  import Edit from 'lucide-svelte/icons/pencil'
  import Trash2 from 'lucide-svelte/icons/trash-2'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import { FRONTEND_ROUTES, getTaskDetailRoute } from '@/constants'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import TaskDeleteDialog from './components/detail/task_delete_dialog.svelte'
  import TaskDetailsSidebar from './components/detail/task_details_sidebar.svelte'
  import {
    formatAuditChangeValue,
    labelColors,
    priorityColors,
    statusColors,
    type TaskShowProps,
  } from './show_helpers'
  import { formatDateTime } from './utils/task_formatter.svelte'


  const { task, permissions, auditLogs }: TaskShowProps = $props()
  const { t } = useTranslation()

  let deleteDialogOpen = $state(false)
  let deleting = $state(false)

  const statusLabel = $derived(t(`task.status_${task.status}`, {}, task.status))
  const priorityLabel = $derived(t(`task.priority_${task.priority}`, {}, task.priority))
  const labelLabel = $derived(t(`task.label_${task.label}`, {}, task.label))

  function handleBack() {
    router.visit(FRONTEND_ROUTES.TASKS)
  }

  function handleEdit() {
    router.visit(`${getTaskDetailRoute(task.id)}/edit`)
  }

  function handleApply() {
    router.post(
      `${getTaskDetailRoute(task.id)}/apply`,
      {},
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  function confirmDelete() {
    deleting = true
    router.delete(getTaskDetailRoute(task.id), {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        deleteDialogOpen = false
        deleting = false
      },
      onError: () => {
        deleting = false
      },
    })
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
                          {log.user?.username ?? t('task.system', {}, 'Hệ thống')}
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
                              <span class="line-through text-red-500">{formatAuditChangeValue(change.old)}</span>
                              →
                              <span class="text-blue-600 font-bold">{formatAuditChangeValue(change.new)}</span>
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

      <TaskDetailsSidebar {task} />
    </div>
  </div>
  <TaskDeleteDialog
    open={deleteDialogOpen}
    {deleting}
    taskTitle={task.title}
    onConfirmDelete={confirmDelete}
    onOpenChange={(open: boolean) => {
      deleteDialogOpen = open
    }}
  />
</AppLayout>

<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import axios from 'axios'
  import LinkIcon from 'lucide-svelte/icons/link'
  import ListTodo from 'lucide-svelte/icons/list-todo'
  import Edit from 'lucide-svelte/icons/pencil'
  import Trash2 from 'lucide-svelte/icons/trash-2'
  import { toast } from 'svelte-sonner'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Tabs from '@/apps/org/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/org/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/org/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/org/shared/ui/tabs_trigger.svelte'
  import { FRONTEND_ROUTES, getTaskApplyRoute, getTaskDetailRoute } from '@/apps/org/shared/constants'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import TaskDeleteDialog from '@/apps/org/modules/tasks/components/detail/task_delete_dialog.svelte'
  import TaskDetailsSidebar from '@/apps/org/modules/tasks/components/detail/task_details_sidebar.svelte'
  import TaskSubmissionPanel from '@/apps/org/modules/tasks/components/detail/task_submission_panel.svelte'
  import TaskReviewWorkflowPanel from '@/apps/org/modules/tasks/components/detail/task_review_workflow_panel.svelte'
  import SkillRequirementsTab from '@/apps/org/modules/tasks/components/skill_requirements_tab.svelte'
  
  import TaskContextCard from '@/apps/org/modules/tasks/components/detail/task_context_card.svelte'
  import TaskDiscussionTab from '@/apps/org/modules/tasks/components/detail/task_discussion_tab.svelte'
  import TaskFilesTab from '@/apps/org/modules/tasks/components/detail/task_files_tab.svelte'
  import TaskHistoryTab from '@/apps/org/modules/tasks/components/detail/task_history_tab.svelte'
  
  import {
    labelColors,
    priorityColors,
    statusColors,
    type TaskShowProps,
  } from '@/apps/org/modules/tasks/lib/helpers/show_helpers'

  const {
    task,
    permissions,
    auditLogs = [],
    baseRoute = FRONTEND_ROUTES.TASKS,
    taskReviewDetail = null,
    shellMode = 'organization',
  }: TaskShowProps = $props()
  const { t } = useTranslation()
  const currentUserId = $derived(
    (page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id ?? null
  )

  type TaskShowTab = 'overview' | 'skills' | 'review' | 'submission' | 'discussion' | 'files' | 'history'

  let deleteDialogOpen = $state(false)
  let deleting = $state(false)
  let applying = $state(false)
  let activeTab = $state<TaskShowTab>('overview')

  const statusLabel = $derived(t(`task.status_${task.status}`, {}, task.status))
  const priorityLabel = $derived(t(`task.priority_${task.priority}`, {}, task.priority))
  const labelLabel = $derived(t(`task.label_${task.label}`, {}, task.label))
  const isCurrentUserAssigned = $derived(
    currentUserId !== null && (task.assigned_to === currentUserId || task.assignee?.id === currentUserId)
  )
  const canOpenWorkTabs = $derived(
    Boolean(
      permissions.isCreator ||
        permissions.isAssignee ||
        permissions.canEdit ||
        permissions.canAssign ||
        permissions.canChangeStatus ||
        isCurrentUserAssigned
    )
  )
  const canOpenDiscussion = $derived(Boolean(canOpenWorkTabs && (permissions.canComment ?? true)))
  const taskDetailUrl = $derived(`/org/tasks/${task.id}`)
  const isTaskReviewMode = $derived(Boolean(taskReviewDetail))
  const sprintSurfaceUrl = $derived(
    task.project_id ? `${shellMode === 'organization' ? '/org/projects' : '/projects'}/${task.project_id}?tab=sprints` : ''
  )

  $effect(() => {
    if (taskReviewDetail && activeTab === 'overview') activeTab = 'review'
  })

  function handleEdit() {
    router.visit(`${getTaskDetailRoute(task.id)}/edit`)
  }

  async function handleApply() {
    if (applying) return
    applying = true

    try {
      await axios.post(
        getTaskApplyRoute(task.id),
        {
          application_source: 'public_listing',
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )
      toast.success(t('task.apply_success', {}, 'Application submitted'))
      router.reload({
        only: ['task', 'permissions', 'auditLogs', 'taskReviewDetail', 'flash'],
      })
    } catch (caughtError) {
      const responseData = (caughtError as {
        response?: {
          data?: {
            message?: string
            error?: {
              message?: string
            }
          }
        }
      }).response?.data
      toast.error(responseData?.error?.message ?? responseData?.message ?? t('task.apply_error', {}, 'Unable to submit application'))
    } finally {
      applying = false
    }
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

<OrganizationLayout title={task.title}>
  <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex-1 space-y-3">
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

      {#if !isTaskReviewMode}
        <div class="flex items-center gap-2 shrink-0">
          {#if permissions.canApply}
            <Button onclick={() => { void handleApply() }} disabled={applying}>
              {applying ? t('common.sending', {}, 'Sending...') : t('task.apply', {}, 'Apply')}
            </Button>
          {/if}
          {#if permissions.canReviewApplications}
            <Button variant="secondary" onclick={() => router.visit(`${getTaskDetailRoute(task.id)}/applications`)}>
              <ListTodo class="size-4 mr-1" />
              {t('task.view_applications', {}, 'View applications')}
            </Button>
          {/if}
          {#if permissions.canEdit}
            <Button variant="outline" onclick={handleEdit}>
              <Edit class="size-4 mr-1" />
              {t('common.edit', {}, 'Edit')}
            </Button>
          {/if}
          {#if permissions.canDelete}
            <Button variant="destructive" onclick={() => { deleteDialogOpen = true }}>
              <Trash2 class="size-4 mr-1" />
              {t('common.delete', {}, 'Delete')}
            </Button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Main 2-column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left column (wider) -->
      <div class="lg:col-span-2 space-y-6">
        <Tabs value={activeTab} onValueChange={(value) => { activeTab = value as TaskShowTab }}>
          <TabsList class="flex h-auto flex-wrap justify-start gap-2 rounded-2xl border border-border bg-background p-2">
            <TabsTrigger value="overview">{t('common.navigation.overview', {}, 'Overview')}</TabsTrigger>
            <TabsTrigger value="skills">
              {t('ui_misc.tasks.show.skills_tab', {}, 'Skills')}
            </TabsTrigger>
            {#if taskReviewDetail}
              <TabsTrigger value="review">{t('task.review_workflow.tab_title', {}, 'Reviews & disputes')}</TabsTrigger>
            {/if}
            {#if canOpenWorkTabs}
              <TabsTrigger value="submission">{t('task.tabs.governance', {}, 'Optional governance')}</TabsTrigger>
              <TabsTrigger value="files">{t('task.tabs.files', {}, 'Files')}</TabsTrigger>
            {/if}
            {#if canOpenDiscussion}
              <TabsTrigger value="discussion">{t('task.tabs.discussion', {}, 'Discussion')}</TabsTrigger>
            {/if}
            {#if auditLogs.length > 0}
              <TabsTrigger value="history">{t('task.history', {}, 'History')}</TabsTrigger>
            {/if}
          </TabsList>

          <TabsContent value="overview" class="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('task.description', {}, 'Description')}</CardTitle>
              </CardHeader>
              <CardContent>
                {#if task.description}
                  <div class="prose prose-sm max-w-none whitespace-pre-wrap">
                    {task.description}
                  </div>
                {:else}
                  <p class="text-muted-foreground italic">
                    {t('task.no_description', {}, 'No description')}
                  </p>
                {/if}
              </CardContent>
            </Card>

            <TaskContextCard {task} />

            <Card>
              <CardHeader>
                <CardTitle class="flex items-center gap-2">
                  <LinkIcon class="size-4" />
                  {t('task.detail_panel.sprint_label', {}, 'Sprint')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {#if task.projectSprintId && task.projectSprintName}
                  <a
                    href={sprintSurfaceUrl}
                    class="inline-flex items-center gap-2 font-bold text-primary hover:underline"
                  >
                    {task.projectSprintName}
                  </a>
                {:else}
                  <p class="text-sm text-muted-foreground">
                    {t('task.detail_panel.no_sprint', {}, 'No sprint')}
                  </p>
                {/if}
              </CardContent>
            </Card>

            {#if task.parentTask}
              <Card>
                <CardHeader>
                  <CardTitle class="flex items-center gap-2">
                    <LinkIcon class="size-4" />
                    {t('task.parent_task', {}, 'Parent task')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`${baseRoute}/${task.parentTask.id}`}
                    class="inline-flex items-center gap-2 font-bold text-primary hover:underline"
                  >
                    {task.parentTask.title}
                    <Badge variant="outline" class="text-xs">{task.parentTask.status}</Badge>
                  </a>
                </CardContent>
              </Card>
            {/if}

            {#if task.childTasks && task.childTasks.length > 0}
              <Card>
                <CardHeader>
                  <CardTitle class="flex items-center gap-2">
                    <ListTodo class="size-4" />
                    {t('task.child_tasks', {}, 'Child tasks')} ({task.childTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div class="space-y-2">
                    {#each task.childTasks as child (child.id)}
                      <a
                        href={`${baseRoute}/${child.id}`}
                        class="flex items-center justify-between rounded-md border-2 border-border p-3 shadow-xs transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                      >
                        <span class="font-bold">{child.title}</span>
                        <div class="flex items-center gap-2">
                          <Badge class={statusColors[child.status] || ''}>
                            {child.status}
                          </Badge>
                          <Badge class={priorityColors[child.priority] || ''}>
                            {child.priority}
                          </Badge>
                        </div>
                      </a>
                    {/each}
                  </div>
                </CardContent>
              </Card>
            {/if}
          </TabsContent>

          {#if taskReviewDetail}
            <TabsContent value="review" class="mt-4">
              <TaskReviewWorkflowPanel
                taskId={task.id}
                projectId={task.project_id}
                {currentUserId}
                {taskDetailUrl}
                detail={taskReviewDetail}
                translate={t}
              />
            </TabsContent>
          {/if}

          <TabsContent value="skills" class="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t('ui_misc.tasks.show.skill_requirements', {}, 'Skill requirements')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkillRequirementsTab
                  taskId={task.id}
                  projectId={task.project_id}
                  canEdit={permissions.canEdit}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {#if canOpenWorkTabs}
            <TabsContent value="submission" class="mt-4">
              <TaskSubmissionPanel
                taskId={task.id}
                isAssignee={isCurrentUserAssigned}
                task={{
                  verification_method: task.verification_method,
                  acceptance_criteria: task.acceptance_criteria,
                  assigneeId: task.assigned_to ?? task.assignee?.id ?? null,
                  resolved_brief: task.resolved_brief,
                }}
              />
            </TabsContent>

            <TabsContent value="files" class="mt-4">
              <TaskFilesTab taskId={task.id} {currentUserId} />
            </TabsContent>
          {/if}

          {#if canOpenDiscussion}
            <TabsContent value="discussion" class="mt-4">
              <TaskDiscussionTab taskId={task.id} {currentUserId} />
            </TabsContent>
          {/if}

          {#if auditLogs.length > 0}
            <TabsContent value="history" class="mt-4">
              <TaskHistoryTab {auditLogs} />
            </TabsContent>
          {/if}
        </Tabs>
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
</OrganizationLayout>

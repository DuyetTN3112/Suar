<script lang="ts">
  import { Circle, CircleCheck, CircleX, Clock, Eye } from 'lucide-svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { formatTaskVerificationMethodForDisplay } from '@/apps/user/modules/tasks/lib/rules/task_verification_methods'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { TaskDetail, TaskMetadata } from '@/apps/user/modules/tasks/types/index.svelte'
  import TaskDetailMetadataSidebar from '@/apps/user/modules/tasks/components/detail/task_detail_metadata_sidebar.svelte'
  import TaskDiscussionTab from '@/apps/user/modules/tasks/components/detail/task_discussion_tab.svelte'
  import TaskExecutionBrief from '@/apps/user/modules/tasks/components/detail/task_execution_brief.svelte'
  import TaskFilesTab from '@/apps/user/modules/tasks/components/detail/task_files_tab.svelte'

  interface CapabilityDecision { allowed: boolean; reason?: string | null }
  interface WorkSurfacePermissions {
    isCreator?: boolean; isAssignee?: boolean; canEdit?: boolean; canAssign?: boolean
    canChangeStatus?: boolean; canComment?: boolean; canOpenWorkTabs?: boolean
  }
  interface Props {
    task: TaskDetail
    metadata: Pick<TaskMetadata, 'statuses' | 'labels' | 'priorities' | 'users'>
    currentUserId: string | null
    workSurfacePermissions?: WorkSurfacePermissions | null
    actionLabel?: string
    onAction?: () => void
    onReloadBrief?: () => void | Promise<void>
    onChangeStatus?: (task: TaskDetail, toStatusId: string) => void
    getStatusChangeDecision?: (task: TaskDetail, toStatusId: string) => CapabilityDecision
    showDiscussion?: boolean
    showFiles?: boolean
  }

  const { task, metadata, currentUserId, workSurfacePermissions = null, onReloadBrief,
    actionLabel, onAction, onChangeStatus, getStatusChangeDecision, showDiscussion = true, showFiles = true }: Props = $props()
  const { t } = useTranslation()
  let activeTab = $state<'task' | 'acceptance' | 'skills' | 'assignment' | 'discussion' | 'files'>('task')
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const statusConfig = {
    todo: { icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-secondary' },
    in_progress: { icon: Clock, color: 'text-foreground', bgColor: 'bg-muted' },
    in_review: { icon: Eye, color: 'text-primary', bgColor: 'bg-accent border border-primary/10' },
    done: { icon: CircleCheck, color: 'text-primary', bgColor: 'bg-primary/10' },
    cancelled: { icon: CircleX, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  }
  const priorityConfig: Record<string, { color: string; bgColor: string }> = {
    urgent: { color: 'text-destructive', bgColor: 'bg-destructive/10' }, high: { color: 'text-primary', bgColor: 'bg-primary/10' },
    medium: { color: 'text-foreground', bgColor: 'bg-muted' }, low: { color: 'text-muted-foreground', bgColor: 'bg-secondary' },
  }
  const activeStatusId = $derived(task.task_status_id ?? task.status)
  const priorityLabel = $derived(metadata.priorities.find((item) => item.value === task.priority)?.label ?? task.priority)
  const labelLabel = $derived(metadata.labels.find((item) => item.value === task.label)?.label ?? task.label)
  const priorityClass = $derived(priorityConfig[task.priority])
  const isOverdue = $derived(task.due_date ? new Date(task.due_date).getTime() < Date.now() : false)
  const permissions = $derived(workSurfacePermissions ?? (task.permissions as WorkSurfacePermissions | undefined))
  const canOpenDiscussion = $derived(showDiscussion && permissions?.canComment !== false)
  const canOpenWorkTabs = $derived(showFiles && (permissions?.canOpenWorkTabs ?? Boolean(
    permissions?.isCreator || permissions?.isAssignee || permissions?.canEdit || permissions?.canAssign || permissions?.canChangeStatus ||
    (currentUserId && (task.creator_id === currentUserId || task.assigned_to === currentUserId || task.assignee?.id === currentUserId)))))
  const hasContextCard = $derived(Boolean(task.task_type ?? task.acceptance_criteria ?? task.verification_method ?? task.context_background ??
    task.tech_stack?.length ?? task.domain_tags?.length ?? task.environment ?? task.collaboration_type ?? task.complexity_notes ??
    task.role_in_task ?? task.autonomy_level ?? task.problem_category ?? task.business_domain ?? task.project_business_domains?.length ?? task.estimated_users_affected ??
    task.resolved_brief ?? task.expected_deliverables))
  const verificationMethods = $derived(formatTaskVerificationMethodForDisplay(task.verification_method, t))
  const requiredSkills = $derived(task.required_skills_rel ?? [])
  const assigneeLabel = $derived(task.assignee?.username ?? task.assignee_name ?? '—')
  const reviewerIds = $derived(
    task.resolved_brief?.resolvedContract?.evidence?.verifierPolicy?.reviewerIds ?? []
  )
  const reviewerRoleCodes = $derived(
    task.resolved_brief?.resolvedContract?.evidence?.verifierPolicy?.reviewerRoleCodes ?? []
  )
  const reviewerLabels = $derived(
    reviewerIds.map((id) => metadata.users.find((user) => user.id === id)?.username ?? id.slice(0, 8))
  )
  const reviewerVisibility = $derived(
    task.resolved_brief?.resolvedContract?.evidence?.reviewerVisibility ?? '—'
  )
  const evidenceCapabilities = $derived(
    task.resolved_brief?.resolvedContract?.evidence?.capabilities ?? []
  )
  const profileEligibility = $derived(
    task.resolved_brief?.resolvedContract?.evidence?.profileEligibility
  )
  const showLegacySummary = $derived(
    Boolean(task.description) &&
      !task.resolved_brief?.resolvedContract &&
      !task.resolved_brief?.authoring
  )
  const taskVisibilityLabel = $derived(formatVisibility(task.task_visibility ?? '—'))

  function formatVisibility(value: string): string {
    return ({
      project: 'Chỉ trong project',
      internal: 'Toàn tổ chức',
      external: 'Marketplace',
      all: 'Marketplace và tổ chức',
    } as Record<string, string>)[value] ?? value
  }

  function formatSkill(skill: (typeof requiredSkills)[number]): string {
    const name = skill.skill?.skill_name ?? skill.skill_id ?? skill.id
    const level = skill.required_public_proficiency_code ?? skill.level
    return level ? `${name} · ${level}` : name
  }

  function formatDate(value: string | null | undefined): string {
    if (!value) return '—'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return new Intl.DateTimeFormat(documentLocale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(parsed)
  }
  function formatRelativeDate(value: string | null): string {
    if (!value) return ''
    const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
    if (days < -1) return t('task.detail_panel.relative_overdue_days', { count: Math.abs(days) }, `${Math.abs(days)} days overdue`)
    if (days === -1) return t('task.detail_panel.relative_overdue_yesterday', {}, 'Overdue yesterday')
    if (days === 0) return t('task.detail_panel.relative_today', {}, 'Today')
    if (days === 1) return t('task.detail_panel.relative_tomorrow', {}, 'Tomorrow')
    return t('task.detail_panel.relative_days_remaining', { count: days }, `${days} days left`)
  }
  function changeStatus(status: string) {
    const decision = getStatusChangeDecision?.(task, status) ?? { allowed: true }
    if (decision.allowed) onChangeStatus?.(task, status)
  }
  function statusDecision(status: string): CapabilityDecision { return getStatusChangeDecision?.(task, status) ?? { allowed: true } }
</script>

<div class="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_280px]" data-testid="task-detail-read-surface">
  <section class="min-w-0 overflow-y-auto p-5">
    <div class="mb-6 flex min-w-0 items-end gap-1 border-b border-border" role="tablist" aria-label={t('task.detail_panel.workspace_tabs', {}, 'Nội dung Task')}>
      <div class="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button type="button" role="tab" aria-selected={activeTab === 'task'} class="shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors {activeTab === 'task' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}" onclick={() => { activeTab = 'task' }}>{t('task.detail_panel.task_content_tab', {}, 'Nội dung Task')}</button>
        <button type="button" role="tab" aria-selected={activeTab === 'acceptance'} class="shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors {activeTab === 'acceptance' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}" onclick={() => { activeTab = 'acceptance' }}>{t('task.detail_panel.acceptance_tab', {}, 'Nghiệm thu')}</button>
        <button type="button" role="tab" aria-selected={activeTab === 'skills'} class="shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors {activeTab === 'skills' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}" onclick={() => { activeTab = 'skills' }}>{t('task.detail_panel.skills_tab', {}, 'Kỹ năng')}</button>
        <button type="button" role="tab" aria-selected={activeTab === 'assignment'} class="shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors {activeTab === 'assignment' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}" onclick={() => { activeTab = 'assignment' }}>{t('task.detail_panel.assignment_tab', {}, 'Phân công')}</button>
        {#if task.id && canOpenDiscussion}
          <button type="button" role="tab" aria-selected={activeTab === 'discussion'} class="shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors {activeTab === 'discussion' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}" onclick={() => { activeTab = 'discussion' }}>{t('task.discussion_tab.title', {}, 'Thảo luận')}</button>
        {/if}
        {#if task.id && canOpenWorkTabs}
          <button type="button" role="tab" aria-selected={activeTab === 'files'} class="shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors {activeTab === 'files' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}" onclick={() => { activeTab = 'files' }}>{t('task.files_tab.title', {}, 'Tệp & bàn giao')}</button>
        {/if}
      </div>
      {#if actionLabel && onAction}
        <button type="button" role="tab" aria-selected="false" class="shrink-0 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground" onclick={onAction}>{actionLabel}</button>
      {/if}
    </div>

    {#if activeTab === 'task'}
      <div class="space-y-7" role="tabpanel">
        {#if showLegacySummary || (!task.resolved_brief?.resolvedContract && !task.resolved_brief?.authoring)}
          <section>
            <div class="mb-3 flex items-baseline justify-between gap-3"><h3 class="text-base font-bold">{t('task.detail_panel.task_summary', {}, 'Tóm tắt công việc')}</h3><span class="text-xs text-muted-foreground">{t('task.detail_panel.shared_contract', {}, 'Contract dùng chung ở Board và Review')}</span></div>
            {#if showLegacySummary}
              <div class="whitespace-pre-wrap rounded-xl border bg-muted/20 p-4 text-sm leading-6">{task.description}</div>
            {:else}
              <div class="rounded-xl border border-dashed p-4 text-sm italic text-muted-foreground">{t('task.no_description', {}, 'No description')}</div>
            {/if}
          </section>
        {/if}
        {#if task.parentTask}
          <section><h3 class="mb-2 text-sm font-bold">{t('task.parent_task', {}, 'Task cha')}</h3><div class="rounded-xl border bg-background p-3 text-sm"><span class="font-medium">{task.parentTask.title}</span></div></section>
        {/if}
        {#if task.childTasks?.length}
          <section><h3 class="mb-2 text-sm font-bold">{t('task.child_tasks', {}, 'Task con')} ({task.childTasks.length})</h3><div class="space-y-2">{#each task.childTasks as child (child.id)}<div class="flex items-center justify-between rounded-xl border bg-background p-3 text-sm"><span class="truncate pr-2">{child.title}</span><span class="text-xs text-muted-foreground">{child.status}</span></div>{/each}</div></section>
        {/if}
        {#if hasContextCard}<TaskExecutionBrief {task} resolvedBrief={task.resolved_brief} section="content" onReloadBrief={onReloadBrief} />{/if}
      </div>
    {:else if activeTab === 'acceptance'}
      <section role="tabpanel" class="space-y-7">
        <h3 class="text-base font-bold">{t('task.detail_panel.acceptance_title', {}, 'Nghiệm thu')}</h3>
        {#if hasContextCard}<TaskExecutionBrief {task} resolvedBrief={task.resolved_brief} section="acceptance" onReloadBrief={onReloadBrief} />{/if}
        <section class="space-y-3 border-t border-border pt-6">
          <h4 class="text-sm font-semibold">{t('task.verification_method', {}, 'Cách nghiệm thu')}</h4>
          {#if verificationMethods.length > 0}<div class="flex flex-wrap gap-2">{#each verificationMethods as method}<span class="rounded-full border bg-muted/30 px-3 py-1.5 text-sm">{method}</span>{/each}</div>{:else}<p class="text-sm text-muted-foreground">—</p>{/if}
        </section>
        {#if profileEligibility !== undefined}<section class="flex items-center justify-between gap-3 border-t border-border pt-6 text-sm"><span>Đánh giá năng lực hồ sơ</span><span class="font-semibold">{profileEligibility ? 'Có' : 'Không'}</span></section>{/if}
      </section>
    {:else if activeTab === 'skills'}
      <section role="tabpanel" class="space-y-7">
        <div class="flex items-center justify-between gap-3"><h3 class="text-base font-bold">{t('task.detail_panel.skills_tab', {}, 'Kỹ năng')}</h3><span class="text-xs text-muted-foreground">{requiredSkills.length} skill</span></div>
        {#if requiredSkills.length > 0}
          <section class="space-y-3"><h4 class="text-sm font-semibold">Kỹ năng tối thiểu để nhận task</h4><div class="space-y-2">{#each requiredSkills as skill (skill.id)}<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 text-sm"><span class="font-semibold">{formatSkill(skill)}</span><span class="text-xs text-muted-foreground">{skill.skill?.skill_code ?? skill.skill_id ?? '—'}</span></div>{/each}</div></section>
        {:else}<p class="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">Không yêu cầu skill.</p>{/if}
        {#if evidenceCapabilities.length > 0}
          <section class="space-y-3 border-t border-border pt-6"><h4 class="text-sm font-semibold">Rubric và mức đánh giá</h4><div class="space-y-2">{#each evidenceCapabilities as capability (capability.id)}<div class="rounded-xl border bg-background p-4 text-sm"><div class="flex flex-wrap items-center justify-between gap-2"><span class="font-semibold">{capability.capabilityName}</span><span>{capability.minimumLevel === null || capability.minimumLevel === undefined ? 'Chưa đặt mức tối thiểu' : `Tối thiểu L${capability.minimumLevel}`}</span></div><div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{#if capability.targetLevel !== null && capability.targetLevel !== undefined}<span>Mức mong muốn L{capability.targetLevel}</span>{/if}{#if capability.assessmentCeiling !== null && capability.assessmentCeiling !== undefined}<span>Trần đánh giá L{capability.assessmentCeiling}</span>{/if}<span class={capability.rubricVersionId ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>{capability.rubricVersionId ? 'Rubric đã publish' : 'Chưa có rubric publish'}</span></div></div>{/each}</div></section>
        {/if}
      </section>
    {:else if activeTab === 'assignment'}
      <section role="tabpanel" class="space-y-7">
        <h3 class="text-base font-bold">{t('task.detail_panel.assignment_tab', {}, 'Phân công')}</h3>
        <dl class="grid gap-x-8 gap-y-6 text-sm md:grid-cols-2">
          <div class="space-y-1 border-b border-border/70 pb-4"><dt class="text-xs text-muted-foreground">Phạm vi hiển thị task</dt><dd class="font-medium">{taskVisibilityLabel}</dd></div>
          <div class="space-y-1 border-b border-border/70 pb-4"><dt class="text-xs text-muted-foreground">Người thực hiện task</dt><dd class="font-medium">{assigneeLabel}</dd></div>
          <div class="space-y-1 border-b border-border/70 pb-4"><dt class="text-xs text-muted-foreground">Phạm vi hiển thị người nghiệm thu</dt><dd class="font-medium">{reviewerVisibility === '—' ? '—' : formatVisibility(reviewerVisibility)}</dd></div>
          <div class="space-y-1 border-b border-border/70 pb-4"><dt class="text-xs text-muted-foreground">Người nghiệm thu</dt><dd class="font-medium">{reviewerIds.length > 0 ? reviewerLabels.join(', ') : reviewerRoleCodes.length > 0 ? `Theo vai trò: ${reviewerRoleCodes.join(', ')}` : 'Chưa chỉ định'}</dd></div>
        </dl>
        <p class="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">Người thực hiện và người nghiệm thu có thể để trống khi tạo task. Chỉ thành viên project mới được giao trực tiếp; các phạm vi khác mở luồng ứng tuyển.</p>
      </section>
    {:else if activeTab === 'discussion' && task.id && canOpenDiscussion}
      <section role="tabpanel" data-testid="task-detail-discussion"><TaskDiscussionTab taskId={task.id} {currentUserId} /></section>
    {:else if activeTab === 'files' && task.id && canOpenWorkTabs}
      <section role="tabpanel" class="rounded-xl border bg-background p-4" data-testid="task-detail-files"><TaskFilesTab taskId={task.id} {currentUserId} /></section>
    {/if}
  </section>
  <TaskDetailMetadataSidebar {task} {metadata} {activeStatusId} {priorityLabel} {labelLabel} {isOverdue} {formatDate} {formatRelativeDate} onStatusChange={changeStatus} getStatusChangeDecision={statusDecision} {statusConfig} {priorityClass} />
</div>

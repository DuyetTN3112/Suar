<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import TaskAssignmentFields from './components/forms/task_assignment_fields.svelte'
  import TaskPriorityLabelFields from './components/forms/task_priority_label_fields.svelte'
  import type { Task } from './types.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    task: Task
    metadata: {
      statuses: { value: string; label: string }[]
      labels: { value: string; label: string }[]
      priorities: { value: string; label: string }[]
      users: { id: string; username: string; email: string }[]
      parentTasks?: { id: string; title: string; task_status_id: string | null }[]
      projects?: { id: string; name: string }[]
    }
    permissions: {
      canEdit: boolean
      canDelete: boolean
      canAssign: boolean
      canChangeStatus: boolean
    }
  }

  interface TaskEditFormData {
    title: string
    description: string
    priority: string
    label: string
    project_id: string
    assigned_to: string
    due_date: string
    estimated_time: string
    actual_time: string
    parent_task_id: string
    task_type: string
    verification_method: string
    acceptance_criteria: string
    context_background: string
    tech_stack_text: string
    learning_objectives_text: string
    domain_tags_text: string
    environment: string
    collaboration_type: string
    complexity_notes: string
    role_in_task: string
    autonomy_level: string
    problem_category: string
    business_domain: string
    estimated_users_affected: string
  }

  const { task, metadata, permissions }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const { t } = useTranslation()

  const buildInitialFormData = (): TaskEditFormData => ({
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    label: task.label,
    project_id: task.project_id,
    assigned_to: task.assigned_to ?? '',
    due_date: task.due_date ?? '',
    estimated_time: task.estimated_time != null ? String(task.estimated_time) : '',
    actual_time: task.actual_time != null ? String(task.actual_time) : '',
    parent_task_id: task.parent_task_id ?? '',
    task_type: task.task_type ?? '',
    verification_method: task.verification_method ?? '',
    acceptance_criteria: task.acceptance_criteria ?? '',
    context_background: task.context_background ?? '',
    tech_stack_text: task.tech_stack ? task.tech_stack.join(', ') : '',
    learning_objectives_text: task.learning_objectives ? task.learning_objectives.join('\n') : '',
    domain_tags_text: task.domain_tags ? task.domain_tags.join(', ') : '',
    environment: task.environment ?? '',
    collaboration_type: task.collaboration_type ?? '',
    complexity_notes: task.complexity_notes ?? '',
    role_in_task: task.role_in_task ?? '',
    autonomy_level: task.autonomy_level ?? '',
    problem_category: task.problem_category ?? '',
    business_domain: task.business_domain ?? '',
    estimated_users_affected: task.estimated_users_affected != null ? String(task.estimated_users_affected) : '',
  })

  let formData = $state(buildInitialFormData())

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)

  const pageTitle = $derived(t('task.edit_task', {}, 'Chỉnh sửa nhiệm vụ'))
  const currentStatusLabel = $derived(
    metadata.statuses.find((status) => status.value === task.task_status_id)?.label ?? task.status
  )

  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    formData = { ...formData, [target.name]: target.value }
  }

  const handleSelectChange = (name: string, value: string) => {
    formData = { ...formData, [name]: value }
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('task.title', {}, 'Tiêu đề') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Project là bắt buộc'
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    const parseListInput = (raw: string) =>
      raw
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

    const {
      tech_stack_text: techStackText,
      learning_objectives_text: learningObjectivesText,
      domain_tags_text: domainTagsText,
      ...payloadBase
    } = formData

    const payload = {
      ...payloadBase,
      tech_stack: parseListInput(techStackText),
      learning_objectives: parseListInput(learningObjectivesText),
      domain_tags: parseListInput(domainTagsText),
      estimated_users_affected: formData.estimated_users_affected ? Number(formData.estimated_users_affected) : undefined,
    }

    submitting = true

    router.put(`/tasks/${task.id}`, payload, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        submitting = false
      },
      onError: (errorResponse) => {
        submitting = false
        errors = errorResponse
      },
    })
  }

  const handleCancel = () => {
    router.visit(`/tasks/${task.id}`)
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <div class="mx-auto max-w-4xl p-4 sm:p-6">
    <Card class="border border-border shadow-xs">
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <div class="space-y-2 text-sm text-muted-foreground">
          <p>Cập nhật thông tin mô tả, phân công và timeline của task.</p>
          <div class="rounded-lg border bg-muted/20 p-3">
            <p class="font-medium text-foreground">
              Trạng thái hiện tại:
              <Badge variant="outline" class="ml-2">{currentStatusLabel}</Badge>
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              Trạng thái được đổi ở Kanban board hoặc task detail panel để giữ đúng workflow transition.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div class="grid gap-6">
          <div class="grid gap-2">
            <Label for="title" class="font-bold">
              {t('task.title', {}, 'Tiêu đề')} <span class="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onchange={handleChange}
              placeholder={t('task.enter_title', {}, 'Nhập tiêu đề nhiệm vụ')}
              class={errors.title ? 'border-destructive' : ''}
              autofocus
            />
            {#if errors.title}
              <p class="text-xs font-bold text-destructive">{errors.title}</p>
            {/if}
          </div>

          <div class="grid gap-2">
            <Label for="description" class="font-bold">{t('task.description', {}, 'Mô tả')}</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onchange={handleChange}
              placeholder={t('task.enter_description', {}, 'Nhập mô tả chi tiết cho nhiệm vụ này')}
              rows={8}
            />
          </div>

          <TaskPriorityLabelFields
            formData={{
              priority: formData.priority,
              label: formData.label,
            }}
            priorities={metadata.priorities}
            labels={metadata.labels}
            onSelectChange={handleSelectChange}
          />

          <TaskAssignmentFields
            formData={{
              project_id: formData.project_id,
              assigned_to: formData.assigned_to,
              parent_task_id: formData.parent_task_id,
            }}
            projects={metadata.projects ?? []}
            users={metadata.users}
            parentTasks={metadata.parentTasks ?? []}
            taskId={task.id}
            canAssign={permissions.canAssign}
            projectError={errors.project_id}
            onSelectChange={handleSelectChange}
          />

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="grid gap-2">
              <Label for="due_date" class="font-bold">{t('task.due_date', {}, 'Hạn hoàn thành')}</Label>
              <Input id="due_date" name="due_date" type="date" value={formData.due_date} onchange={handleChange} />
            </div>

            <div class="grid gap-2">
              <Label for="estimated_time" class="font-bold">{t('task.estimated_time', {}, 'Thời gian ước tính (giờ)')}</Label>
              <Input
                id="estimated_time"
                name="estimated_time"
                type="number"
                value={formData.estimated_time}
                onchange={handleChange}
                placeholder="0"
                min="0"
                step="0.5"
              />
            </div>

            <div class="grid gap-2">
              <Label for="actual_time" class="font-bold">{t('task.actual_time', {}, 'Thời gian thực tế (giờ)')}</Label>
              <Input
                id="actual_time"
                name="actual_time"
                type="number"
                value={formData.actual_time}
                onchange={handleChange}
                placeholder="0"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          <div class="grid gap-4 rounded-lg border bg-muted/10 p-4">
            <div class="space-y-1 col-span-full">
              <h3 class="text-sm font-semibold">Tiêu chí đánh giá và ngữ cảnh nâng cao</h3>
              <p class="text-xs text-muted-foreground">
                Các trường thông tin này phục vụ giải quyết tranh chấp (Dispute resolution) và đồng bộ Profile Snapshot.
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-2 col-span-full">
              <div class="grid gap-2">
                <Label for="task_type" class="font-bold">Loại Task</Label>
                <Input id="task_type" name="task_type" value={formData.task_type} onchange={handleChange} placeholder="vd: feature_development, bug_fixing..." />
              </div>
              <div class="grid gap-2">
                <Label for="verification_method" class="font-bold">Phương thức xác minh</Label>
                <Input id="verification_method" name="verification_method" value={formData.verification_method} onchange={handleChange} placeholder="vd: code_review, automated_tests..." />
              </div>
            </div>

            <div class="grid gap-2 col-span-full">
              <Label for="acceptance_criteria" class="font-bold">Acceptance Criteria</Label>
              <Textarea
                id="acceptance_criteria"
                name="acceptance_criteria"
                value={formData.acceptance_criteria}
                onchange={handleChange}
                rows={3}
                placeholder="Tiêu chí nghiệm thu của task..."
              />
            </div>

            <div class="grid gap-2 col-span-full">
              <Label for="context_background" class="font-bold">Bối cảnh nghiệp vụ</Label>
              <Textarea
                id="context_background"
                name="context_background"
                value={formData.context_background}
                onchange={handleChange}
                rows={3}
                placeholder="Tại sao task này xuất hiện..."
              />
            </div>

            <div class="grid gap-4 md:grid-cols-2 col-span-full">
              <div class="grid gap-2">
                <Label for="tech_stack_text" class="font-bold">Tech Stack</Label>
                <Input id="tech_stack_text" name="tech_stack_text" value={formData.tech_stack_text} onchange={handleChange} placeholder="vd: React, AdonisJS..." />
                <p class="text-[10px] text-muted-foreground">Ngăn cách bởi dấu phẩy.</p>
              </div>
              <div class="grid gap-2">
                <Label for="domain_tags_text" class="font-bold">Domain Tags</Label>
                <Input id="domain_tags_text" name="domain_tags_text" value={formData.domain_tags_text} onchange={handleChange} placeholder="vd: auth, payment..." />
                <p class="text-[10px] text-muted-foreground">Ngăn cách bởi dấu phẩy.</p>
              </div>
            </div>

            <div class="grid gap-2 col-span-full">
              <Label for="learning_objectives_text" class="font-bold">Learning Objectives</Label>
              <Textarea
                id="learning_objectives_text"
                name="learning_objectives_text"
                value={formData.learning_objectives_text}
                onchange={handleChange}
                rows={2}
                placeholder="Mỗi mục tiêu trên 1 dòng..."
              />
            </div>

            <div class="grid gap-4 md:grid-cols-3 col-span-full">
              <div class="grid gap-2">
                <Label for="environment" class="font-bold">Môi trường</Label>
                <Input id="environment" name="environment" value={formData.environment} onchange={handleChange} placeholder="vd: staging, production..." />
              </div>
              <div class="grid gap-2">
                <Label for="collaboration_type" class="font-bold">Hình thức cộng tác</Label>
                <Input id="collaboration_type" name="collaboration_type" value={formData.collaboration_type} onchange={handleChange} placeholder="vd: solo, pair..." />
              </div>
              <div class="grid gap-2">
                <Label for="complexity_notes" class="font-bold">Ghi chú độ phức tạp</Label>
                <Input id="complexity_notes" name="complexity_notes" value={formData.complexity_notes} onchange={handleChange} placeholder="Ghi chú thêm về độ phức tạp..." />
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-3 col-span-full">
              <div class="grid gap-2">
                <Label for="role_in_task" class="font-bold">Vai trò trong task</Label>
                <Input id="role_in_task" name="role_in_task" value={formData.role_in_task} onchange={handleChange} placeholder="vd: lead, contributor..." />
              </div>
              <div class="grid gap-2">
                <Label for="autonomy_level" class="font-bold">Mức độ tự chủ</Label>
                <Input id="autonomy_level" name="autonomy_level" value={formData.autonomy_level} onchange={handleChange} placeholder="vd: high, medium..." />
              </div>
              <div class="grid gap-2">
                <Label for="problem_category" class="font-bold">Loại vấn đề</Label>
                <Input id="problem_category" name="problem_category" value={formData.problem_category} onchange={handleChange} placeholder="vd: design_pattern, database_tuning..." />
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2 col-span-full">
              <div class="grid gap-2">
                <Label for="business_domain" class="font-bold">Nghiệp vụ kinh doanh</Label>
                <Input id="business_domain" name="business_domain" value={formData.business_domain} onchange={handleChange} placeholder="vd: fintech, ecommerce..." />
              </div>
              <div class="grid gap-2">
                <Label for="estimated_users_affected" class="font-bold">Số user ảnh hưởng ước tính</Label>
                <Input id="estimated_users_affected" name="estimated_users_affected" type="number" value={formData.estimated_users_affected} onchange={handleChange} placeholder="0" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter class="flex justify-end gap-3 border-t-2 border-border pt-6">
        <Button variant="outline" onclick={handleCancel} disabled={submitting}>
          {t('common.cancel', {}, 'Hủy')}
        </Button>
        <Button onclick={handleSubmit} disabled={submitting}>
          {submitting ? t('common.saving', {}, 'Đang lưu...') : t('common.save', {}, 'Lưu thay đổi')}
        </Button>
      </CardFooter>
    </Card>
  </div>
</Layout>

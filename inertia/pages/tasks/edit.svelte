<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { Task } from './types.svelte'

  interface Props {
    task: Task
    metadata: {
      statuses: Array<{ value: string; label: string }>
      labels: Array<{ value: string; label: string }>
      priorities: Array<{ value: string; label: string }>
      users: Array<{ id: string; username: string; email: string }>
      parentTasks?: Array<{ id: string; title: string; task_status_id: string | null }>
      projects?: Array<{ id: string; name: string }>
    }
    permissions: {
      canEdit: boolean
      canDelete: boolean
      canAssign: boolean
      canChangeStatus: boolean
    }
  }

  const { task, metadata, permissions }: Props = $props()
  const { t } = useTranslation()

  const buildInitialFormData = () => ({
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    label: task.label,
    project_id: task.project_id ?? metadata.projects?.[0]?.id ?? '',
    assigned_to: task.assigned_to ?? '',
    due_date: task.due_date ?? '',
    estimated_time: task.estimated_time != null ? String(task.estimated_time) : '',
    actual_time: task.actual_time != null ? String(task.actual_time) : '',
    parent_task_id: task.parent_task_id ?? '',
  })

  let formData = $state(buildInitialFormData())

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)

  const pageTitle = $derived(t('task.edit_task', {}, 'Chỉnh sửa nhiệm vụ'))
  const currentStatusLabel = $derived(
    metadata.statuses.find((status) => status.value === task.task_status_id)?.label || task.status
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

    submitting = true

    router.put(`/tasks/${task.id}`, formData, {
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

<AppLayout title={pageTitle}>
  <div class="mx-auto max-w-4xl p-4 sm:p-6">
    <Card class="border-2 shadow-neo">
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

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label for="priority" class="font-bold">{t('task.priority', {}, 'Mức độ ưu tiên')}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: string) => {
                  handleSelectChange('priority', value)
                }}
              >
                <SelectTrigger>
                  <span>{metadata.priorities.find((item) => item.value === formData.priority)?.label || t('task.select_priority', {}, 'Chọn mức độ ưu tiên')}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.priorities as priority (priority.value)}
                    <SelectItem value={priority.value} label={priority.label}>
                      {priority.label}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-2">
              <Label for="label" class="font-bold">{t('task.label', {}, 'Nhãn')}</Label>
              <Select
                value={formData.label}
                onValueChange={(value: string) => {
                  handleSelectChange('label', value)
                }}
              >
                <SelectTrigger>
                  <span>{metadata.labels.find((item) => item.value === formData.label)?.label || t('task.select_label', {}, 'Chọn nhãn')}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.labels as label (label.value)}
                    <SelectItem value={label.value} label={label.label}>
                      {label.label}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label for="project_id" class="font-bold">Project <span class="text-destructive">*</span></Label>
              <Select
                value={formData.project_id}
                onValueChange={(value: string) => {
                  handleSelectChange('project_id', value)
                }}
              >
                <SelectTrigger>
                  <span>{metadata.projects?.find((project) => project.id === formData.project_id)?.name || 'Chọn project'}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.projects || [] as project (project.id)}
                    <SelectItem value={project.id} label={project.name}>
                      {project.name}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
              {#if errors.project_id}
                <p class="text-xs font-bold text-destructive">{errors.project_id}</p>
              {/if}
            </div>

            <div class="grid gap-2">
              <Label for="assigned_to" class="font-bold">{t('task.assigned_to', {}, 'Người thực hiện')}</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value: string) => {
                  handleSelectChange('assigned_to', value)
                }}
                disabled={!permissions.canAssign}
              >
                <SelectTrigger disabled={!permissions.canAssign}>
                  <span>{metadata.users.find((user) => user.id === formData.assigned_to)?.username || metadata.users.find((user) => user.id === formData.assigned_to)?.email || t('task.select_assignee_short', {}, 'Phân công cho')}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.users as user (user.id)}
                    <SelectItem value={user.id} label={user.username || user.email}>
                      {user.username || user.email}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-2">
              <Label for="parent_task_id" class="font-bold">Task cha</Label>
              <Select
                value={formData.parent_task_id}
                onValueChange={(value: string) => {
                  handleSelectChange('parent_task_id', value)
                }}
              >
                <SelectTrigger>
                  <span>{metadata.parentTasks?.find((parent) => parent.id === formData.parent_task_id)?.title || 'Chọn task cha (tùy chọn)'}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each (metadata.parentTasks || []).filter((parent) => parent.id !== task.id) as parent (parent.id)}
                    <SelectItem value={parent.id} label={parent.title}>
                      {parent.title}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
            </div>
          </div>

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
</AppLayout>

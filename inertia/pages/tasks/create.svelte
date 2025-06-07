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
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    metadata: {
      statuses: Array<{ value: string; label: string; color: string }>
      labels: Array<{ value: string; label: string; color: string }>
      priorities: Array<{ value: string; label: string; color: string }>
      users: Array<{ id: string; username: string; email: string }>
    }
  }

  const { metadata }: Props = $props()
  const { t } = useTranslation()

  let formData = $state({
    title: '',
    description: '',
    status: '',
    priority: '',
    label: '',
    assigned_to: '',
    due_date: '',
    parent_task_id: '',
    estimated_time: '',
    actual_time: '',
    project_id: '',
  })

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)

  const pageTitle = $derived(t('task.new_task', {}, 'Tạo nhiệm vụ mới'))

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    const { name, value } = target
    formData = { ...formData, [name]: value }
  }

  const handleSelectChange = (name: string, value: string) => {
    formData = { ...formData, [name]: value }
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('task.title', {}, 'Tiêu đề') + ' ' + t('common.is_required', {}, 'là bắt buộc')
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    submitting = true

    router.post('/tasks', formData, {
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
    router.visit('/tasks')
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto">
    <Card>
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <p class="text-sm text-muted-foreground">
          {t('task.add_task_description', {}, 'Thêm nhiệm vụ mới bằng cách điền thông tin bên dưới.')}
        </p>
      </CardHeader>

      <CardContent>
        <div class="grid gap-6">
          <!-- Title -->
          <div class="grid gap-2">
            <Label for="title">{t('task.title', {}, 'Tiêu đề')} <span class="text-destructive">*</span></Label>
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

          <!-- Description -->
          <div class="grid gap-2">
            <Label for="description">{t('task.description', {}, 'Mô tả')}</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onchange={handleChange}
              placeholder={t('task.enter_description', {}, 'Nhập mô tả chi tiết cho nhiệm vụ này')}
              rows={4}
            />
            {#if errors.description}
              <p class="text-xs font-bold text-destructive">{errors.description}</p>
            {/if}
          </div>

          <!-- Status + Priority -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="status">{t('task.status', {}, 'Trạng thái')}</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => v && handleSelectChange('status', v)}
              >
                <SelectTrigger id="status">
                  <span>{metadata.statuses.find(s => s.value === formData.status)?.label || t('task.select_status', {}, 'Chọn trạng thái')}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.statuses as status (status.value)}
                    <SelectItem value={status.value} label={status.label}>
                      {status.label}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
              {#if errors.status}
                <p class="text-xs font-bold text-destructive">{errors.status}</p>
              {/if}
            </div>

            <div class="grid gap-2">
              <Label for="priority">{t('task.priority', {}, 'Mức độ ưu tiên')}</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => v && handleSelectChange('priority', v)}
              >
                <SelectTrigger id="priority">
                  <span>{metadata.priorities.find(p => p.value === formData.priority)?.label || t('task.select_priority', {}, 'Chọn mức độ ưu tiên')}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.priorities as priority (priority.value)}
                    <SelectItem value={priority.value} label={priority.label}>
                      {priority.label}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
              {#if errors.priority}
                <p class="text-xs font-bold text-destructive">{errors.priority}</p>
              {/if}
            </div>
          </div>

          <!-- Label + Assigned To -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="label">{t('task.label', {}, 'Nhãn')}</Label>
              <Select
                value={formData.label}
                onValueChange={(v) => v && handleSelectChange('label', v)}
              >
                <SelectTrigger id="label">
                  <span>{metadata.labels.find(l => l.value === formData.label)?.label || t('task.select_label', {}, 'Chọn nhãn')}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.labels as label (label.value)}
                    <SelectItem value={label.value} label={label.label}>
                      {label.label}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
              {#if errors.label}
                <p class="text-xs font-bold text-destructive">{errors.label}</p>
              {/if}
            </div>

            <div class="grid gap-2">
              <Label for="assigned_to">{t('task.assigned_to', {}, 'Người thực hiện')}</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(v) => v && handleSelectChange('assigned_to', v)}
              >
                <SelectTrigger id="assigned_to">
                  <span>{metadata.users.find(u => u.id === formData.assigned_to)?.username || metadata.users.find(u => u.id === formData.assigned_to)?.email || t('task.select_assignee_short', {}, 'Phân công cho')}</span>
                </SelectTrigger>
                <SelectContent>
                  {#each metadata.users as user (user.id)}
                    <SelectItem value={user.id} label={user.username || user.email}>
                      {user.username || user.email}
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
              {#if errors.assigned_to}
                <p class="text-xs font-bold text-destructive">{errors.assigned_to}</p>
              {/if}
            </div>
          </div>

          <!-- Due Date + Estimated Time -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="due_date">{t('task.due_date', {}, 'Hạn hoàn thành')}</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={formData.due_date}
                onchange={handleChange}
              />
              {#if errors.due_date}
                <p class="text-xs font-bold text-destructive">{errors.due_date}</p>
              {/if}
            </div>

            <div class="grid gap-2">
              <Label for="estimated_time">{t('task.estimated_time', {}, 'Thời gian ước tính (giờ)')}</Label>
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
              {#if errors.estimated_time}
                <p class="text-xs font-bold text-destructive">{errors.estimated_time}</p>
              {/if}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter class="flex justify-end gap-3 border-t-2 border-border pt-6">
        <Button
          variant="outline"
          onclick={handleCancel}
          disabled={submitting}
        >
          {t('common.cancel', {}, 'Hủy')}
        </Button>
        <Button
          onclick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? t('common.creating', {}, 'Đang tạo...') : t('task.add_task', {}, 'Tạo nhiệm vụ')}
        </Button>
      </CardFooter>
    </Card>
  </div>
</AppLayout>

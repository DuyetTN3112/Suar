<script lang="ts">
  import Input from '@/components/ui/input.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import Button from '@/components/ui/button.svelte'
  import * as Popover from '@/components/ui/popover'
  import Calendar from '@/components/ui/calendar.svelte'
  import { CalendarIcon } from 'lucide-svelte'
  import { cn } from '@/lib/utils'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { Task } from '../../../types.svelte'

  interface Props {
    task: Task
    formData: Partial<Task>
    isEditing: boolean
    errors: Record<string, string>
    statuses: Array<{ id: number; name: string; color: string }>
    priorities: Array<{ id: number; name: string; color: string; value: number }>
    labels: Array<{ id: number; name: string; color: string }>
    users: Array<{ id: number; username: string; email: string }>
    handleChange: (e: Event) => void
    handleSelectChange: (name: string, value: string) => void
    handleDateChange: (date: Date | undefined) => void
  }

  const {
    task,
    formData,
    isEditing,
    errors,
    statuses,
    priorities,
    labels,
    users,
    handleChange,
    handleSelectChange,
    handleDateChange
  }: Props = $props()

  const { t } = useTranslation()

  // Format lại ngày hạn để hiển thị trong DatePicker
  const dueDate = $derived(formData.due_date ? new Date(formData.due_date) : undefined)

  // Lấy ID từ các trường khác nhau (hỗ trợ nhiều định dạng backend)
  const statusId = $derived(formData.status_id || task.status?.id)
  const priorityId = $derived(formData.priority_id || task.priority?.id)
  const labelId = $derived(formData.label_id || task.label?.id)
  const assignedToId = $derived(formData.assigned_to)

  // Tìm các đối tượng hiện tại để hiển thị
  const currentStatus = $derived(statuses.find(s => s.id === statusId) || task.status)
  const currentPriority = $derived(priorities.find(p => p.id === priorityId) || task.priority)
  const currentLabel = $derived(labels.find(l => l.id === labelId) || task.label)
  const currentAssignee = $derived(users.find(u => u.id === assignedToId) || task.assignee)

  // Format ngày hạn để hiển thị khi không ở chế độ chỉnh sửa
  function formatDate(dateString?: string) {
    if (!dateString) return t('task.due_date_not_set', {}, 'Chưa thiết lập')
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('vi-VN')
    } catch (error) {
      return t('task.due_date_unknown', {}, 'Không xác định')
    }
  }

  // Xử lý giá trị mặc định cho các trường Select
  const statusIdValue = $derived((formData.status_id || task.status?.id || '').toString())
  const priorityIdValue = $derived((formData.priority_id || task.priority?.id || '').toString())
  const labelIdValue = $derived(String(formData.label_id || (task.label ? task.label.id : '')))
  const assignedToValue = $derived(String(formData.assigned_to || ''))

  let datePickerOpen = $state(false)
</script>

<div class="space-y-6">
  <!-- Tiêu đề và mô tả -->
  <section>
    <div class="space-y-2">
      <Label for="title">{t('task.title', {}, 'Tiêu đề')}</Label>
      {#if isEditing}
        <Input
          id="title"
          name="title"
          value={formData.title || ''}
          oninput={handleChange}
          placeholder={t('task.enter_title', {}, 'Nhập tiêu đề nhiệm vụ')}
          class={errors.title ? 'border-red-500' : ''}
        />
        {#if errors.title}
          <p class="text-xs text-red-500">{errors.title}</p>
        {/if}
      {:else}
        <p class="text-sm border px-3 py-2 rounded-md bg-muted/20">{formData.title}</p>
      {/if}
    </div>

    <div class="space-y-2 mt-4">
      <Label for="description">{t('task.description', {}, 'Mô tả')}</Label>
      {#if isEditing}
        <Textarea
          id="description"
          name="description"
          value={formData.description || ''}
          oninput={handleChange}
          placeholder={t('task.enter_description', {}, 'Mô tả chi tiết về nhiệm vụ')}
          rows={3}
        />
      {:else}
        <div class="text-sm border px-3 py-2 rounded-md bg-muted/20 whitespace-pre-wrap min-h-[60px]">
          {formData.description || t('task.no_description', {}, 'Không có mô tả')}
        </div>
      {/if}
    </div>
  </section>

  <!-- Các trường thông tin khác -->
  <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Cột trái -->
    <div class="space-y-4">
      <!-- Status -->
      <div class="space-y-2">
        <Label for="status_id">{t('task.status', {}, 'Trạng thái')}</Label>
        {#if isEditing}
          <Select
            value={statusIdValue}
            onValueChange={(value) => { handleSelectChange('status_id', value) }}
          >
            <SelectTrigger class={errors.status_id ? 'border-red-500' : ''}>
              <span>{currentStatus?.name || t('task.select_status', {}, 'Chọn trạng thái')}</span>
            </SelectTrigger>
            <SelectContent>
              {#each statuses as status (status.id)}
                <SelectItem value={String(status.id)}>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-3 w-3 rounded-full"
                      style:background-color={status.color || '#888'}
                    ></div>
                    {status.name}
                  </div>
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
          {#if errors.status_id}
            <p class="text-xs text-red-500">{errors.status_id}</p>
          {/if}
        {:else}
          <div class="flex items-center gap-2 border px-3 py-2 rounded-md bg-muted/20">
            {#if currentStatus}
              <div
                class="h-3 w-3 rounded-full"
                style:background-color={currentStatus.color || '#888'}
              ></div>
            {/if}
            <span>{currentStatus?.name || t('task.no_status', {}, 'Không có trạng thái')}</span>
          </div>
        {/if}
      </div>

      <!-- Priority -->
      <div class="space-y-2">
        <Label for="priority_id">{t('task.priority', {}, 'Độ ưu tiên')}</Label>
        {#if isEditing}
          <Select
            value={priorityIdValue}
            onValueChange={(value) => { handleSelectChange('priority_id', value) }}
          >
            <SelectTrigger>
              <span>{currentPriority?.name || t('task.select_priority', {}, 'Chọn độ ưu tiên')}</span>
            </SelectTrigger>
            <SelectContent>
              {#each priorities as priority (priority.id)}
                <SelectItem value={String(priority.id)}>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-3 w-3 rounded-full"
                      style:background-color={priority.color || '#888'}
                    ></div>
                    {priority.name}
                  </div>
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        {:else}
          <div class="flex items-center gap-2 border px-3 py-2 rounded-md bg-muted/20">
            {#if currentPriority}
              <div
                class="h-3 w-3 rounded-full"
                style:background-color={currentPriority.color || '#888'}
              ></div>
            {/if}
            <span>{currentPriority?.name || t('task.no_priority', {}, 'Không có độ ưu tiên')}</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Cột phải -->
    <div class="space-y-4">
      <!-- Label -->
      <div class="space-y-2">
        <Label for="label_id">{t('task.label', {}, 'Nhãn')}</Label>
        {#if isEditing}
          <Select
            value={labelIdValue}
            onValueChange={(value) => { handleSelectChange('label_id', value) }}
          >
            <SelectTrigger>
              <span>{currentLabel?.name || t('task.select_label', {}, 'Chọn nhãn')}</span>
            </SelectTrigger>
            <SelectContent>
              {#each labels as label (label.id)}
                <SelectItem value={String(label.id)}>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-3 w-3 rounded-full"
                      style:background-color={label.color || '#888'}
                    ></div>
                    {label.name}
                  </div>
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        {:else}
          <div class="flex items-center gap-2 border px-3 py-2 rounded-md bg-muted/20">
            {#if currentLabel}
              <div
                class="h-3 w-3 rounded-full"
                style:background-color={currentLabel.color || '#888'}
              ></div>
            {/if}
            <span>{currentLabel?.name || t('task.no_label', {}, 'Không có nhãn')}</span>
          </div>
        {/if}
      </div>

      <!-- Assigned To -->
      <div class="space-y-2">
        <Label for="assigned_to">{t('task.assigned_to', {}, 'Giao cho')}</Label>
        {#if isEditing}
          <Select
            value={assignedToValue}
            onValueChange={(value) => { handleSelectChange('assigned_to', value) }}
          >
            <SelectTrigger>
              <span>{currentAssignee ? (currentAssignee.username || currentAssignee.email) : t('task.select_assignee', {}, 'Chọn người thực hiện')}</span>
            </SelectTrigger>
            <SelectContent>
              {#each users as user (user.id)}
                <SelectItem value={String(user.id)}>
                  {user.username || user.email}
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        {:else}
          <div class="border px-3 py-2 rounded-md bg-muted/20">
            <span>
              {currentAssignee ?
                (currentAssignee.username || currentAssignee.email)
                : t('task.unassigned', {}, 'Chưa giao')}
            </span>
          </div>
        {/if}
      </div>
    </div>
  </section>

  <!-- Due Date -->
  <section>
    <div class="space-y-2">
      <Label for="due_date">{t('task.due_date', {}, 'Ngày hết hạn')}</Label>
      {#if isEditing}
        <Popover.Root bind:open={datePickerOpen}>
          <Popover.Trigger asChild let:builder>
            <Button
              variant="outline"
              class={cn(
                'w-full justify-start text-left font-normal',
                !dueDate && 'text-muted-foreground'
              )}
              builders={[builder]}
            >
              <CalendarIcon class="mr-2 h-4 w-4" />
              {dueDate ? formatDate(formData.due_date) : t('task.select_due_date', {}, 'Chọn ngày hết hạn')}
            </Button>
          </Popover.Trigger>
          <Popover.Content class="w-auto p-0">
            <Calendar
              value={dueDate}
              onValueChange={(v) => {
                handleDateChange(v?.value)
                datePickerOpen = false
              }}
            />
          </Popover.Content>
        </Popover.Root>
      {:else}
        <div class="border px-3 py-2 rounded-md bg-muted/20">
          {formData.due_date ? formatDate(formData.due_date) : t('task.due_date_not_set', {}, 'Chưa thiết lập')}
        </div>
      {/if}
    </div>
  </section>
</div>

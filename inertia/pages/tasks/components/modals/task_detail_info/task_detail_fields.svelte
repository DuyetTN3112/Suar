<script lang="ts">
  import Input from '@/components/ui/input.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import Popover from '@/components/ui/popover.svelte'
  import PopoverContent from '@/components/ui/popover_content.svelte'
  import PopoverTrigger from '@/components/ui/popover_trigger.svelte'
  import Calendar from '@/components/ui/calendar.svelte'
  import { CalendarIcon } from 'lucide-svelte'
  import { cn } from '@/lib/utils'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { Task } from '@/pages/tasks/types.svelte'

  interface Props {
    task: Task
    formData: Partial<Task>
    isEditing: boolean
    errors: Record<string, string>
    statuses: Array<{ value: string; label: string; color: string }>
    priorities: Array<{ value: string; label: string; color: string }>
    labels: Array<{ value: string; label: string; color: string }>
    users: Array<{ id: string; username: string; email: string }>
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

  // Lấy giá trị string từ các trường
  const activeStatusId = $derived(formData.task_status_id || task.task_status_id || '')
  const priorityValue = $derived(formData.priority ?? task.priority)
  const labelValue = $derived(formData.label ?? task.label)
  const assignedToId = $derived(formData.assigned_to)

  // Tìm các đối tượng hiện tại để hiển thị
  const currentStatus = $derived(statuses.find((status) => status.value === activeStatusId))
  const currentPriority = $derived(priorities.find((priority) => priority.value === priorityValue))
  const currentLabel = $derived(labels.find((label) => label.value === labelValue))
  const currentAssignee = $derived(
    (assignedToId ? users.find((user) => user.id === assignedToId) : undefined) || task.assignee
  )

  // Format ngày hạn để hiển thị khi không ở chế độ chỉnh sửa
  function formatDate(dateString?: string | null) {
    if (!dateString) return t('task.due_date_not_set', {}, 'Chưa thiết lập')
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('vi-VN')
    } catch (_error) {
      return t('task.due_date_unknown', {}, 'Không xác định')
    }
  }

  // Xử lý giá trị mặc định cho các trường Select
  const prioritySelectValue = $derived(formData.priority ?? task.priority)
  const labelSelectValue = $derived(formData.label ?? task.label)
  const assignedToValue = $derived(formData.assigned_to ?? '')

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
        <Label for="task_status_id">{t('task.status', {}, 'Trạng thái')}</Label>
        <div class="flex items-center gap-2 border px-3 py-2 rounded-md bg-muted/20">
          {#if currentStatus}
            <div
              class="h-3 w-3 rounded-full"
              style:background-color={currentStatus.color || '#888'}
            ></div>
          {/if}
          <span>{currentStatus?.label || t('task.no_status', {}, 'Không có trạng thái')}</span>
        </div>
        {#if isEditing}
          <p class="text-xs text-muted-foreground">
            Trạng thái được điều khiển bằng workflow. Hãy đổi ở board hoặc panel chi tiết.
          </p>
        {/if}
      </div>

      <!-- Priority -->
      <div class="space-y-2">
        <Label for="priority">{t('task.priority', {}, 'Độ ưu tiên')}</Label>
        {#if isEditing}
          <Select
            value={prioritySelectValue}
            onValueChange={(value: string) => { handleSelectChange('priority', value) }}
          >
            <SelectTrigger>
              <span>{currentPriority?.label || t('task.select_priority', {}, 'Chọn độ ưu tiên')}</span>
            </SelectTrigger>
            <SelectContent>
              {#each priorities as priority (priority.value)}
                <SelectItem value={priority.value}>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-3 w-3 rounded-full"
                      style:background-color={priority.color || '#888'}
                    ></div>
                    {priority.label}
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
            <span>{currentPriority?.label || t('task.no_priority', {}, 'Không có độ ưu tiên')}</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Cột phải -->
    <div class="space-y-4">
      <!-- Label -->
      <div class="space-y-2">
        <Label for="label">{t('task.label', {}, 'Nhãn')}</Label>
        {#if isEditing}
          <Select
            value={labelSelectValue}
            onValueChange={(value: string) => { handleSelectChange('label', value) }}
          >
            <SelectTrigger>
              <span>{currentLabel?.label || t('task.select_label', {}, 'Chọn nhãn')}</span>
            </SelectTrigger>
            <SelectContent>
              {#each labels as label (label.value)}
                <SelectItem value={label.value}>
                  <div class="flex items-center gap-2">
                    <div
                      class="h-3 w-3 rounded-full"
                      style:background-color={label.color || '#888'}
                    ></div>
                    {label.label}
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
            <span>{currentLabel?.label || t('task.no_label', {}, 'Không có nhãn')}</span>
          </div>
        {/if}
      </div>

      <!-- Assigned To -->
      <div class="space-y-2">
        <Label for="assigned_to">{t('task.assigned_to', {}, 'Giao cho')}</Label>
        {#if isEditing}
          <Select
            value={assignedToValue}
            onValueChange={(value: string) => { handleSelectChange('assigned_to', value) }}
          >
            <SelectTrigger>
              <span>{currentAssignee ? (currentAssignee.username || currentAssignee.email) : t('task.select_assignee', {}, 'Chọn người thực hiện')}</span>
            </SelectTrigger>
            <SelectContent>
              {#each users as user (user.id)}
                <SelectItem value={user.id}>
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
        <Popover open={datePickerOpen} onOpenChange={(open: boolean) => { datePickerOpen = open }}>
          <PopoverTrigger
            class={cn(
              'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring inline-flex h-10 w-full items-center justify-start rounded-md border px-3 py-2 text-left text-sm font-normal focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              !dueDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon class="mr-2 h-4 w-4" />
            {dueDate ? formatDate(formData.due_date) : t('task.select_due_date', {}, 'Chọn ngày hết hạn')}
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0">
            <Calendar
              selected={dueDate}
              onSelect={(selectedDate: Date | undefined) => {
                handleDateChange(selectedDate)
                datePickerOpen = false
              }}
            />
          </PopoverContent>
        </Popover>
      {:else}
        <div class="border px-3 py-2 rounded-md bg-muted/20">
          {formData.due_date ? formatDate(formData.due_date) : t('task.due_date_not_set', {}, 'Chưa thiết lập')}
        </div>
      {/if}
    </div>
  </section>
</div>

<script lang="ts">
  import Label from '@/components/ui/label.svelte'
  import Input from '@/components/ui/input.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    formData: {
      status: string
      priority: string
      label: string
      assigned_to: string
      parent_task_id: string
      estimated_time: string
    }
    handleSelectChange: (name: string, value: string) => void
    errors: Record<string, string>
    statuses: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    labels: Array<{ value: string; label: string }>
    users: Array<{ id: string; username: string; email: string }>
    parentTasks: Array<{ id: string; title: string; status: string }>
  }

  const { formData, handleSelectChange, errors, statuses, priorities, labels, users, parentTasks }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="grid grid-cols-2 gap-4">
  <div class="grid gap-2">
    <Label for="status">
      {t('task.status', {}, 'Trạng thái')}<span class="ml-1 text-red-500">*</span>
    </Label>
    <Select
      value={formData.status}
      onValueChange={(v) => v && handleSelectChange('status', v)}
    >
      <SelectTrigger>
        <span>{statuses.find(s => s.value === formData.status)?.label || t('task.select_status', {}, 'Chọn trạng thái')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each statuses as status (status.value)}
          <SelectItem value={status.value} label={status.label}>
            {status.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.status}
      <p class="text-xs text-red-500">{errors.status}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="priority">{t('task.priority', {}, 'Mức độ ưu tiên')}</Label>
    <Select
      value={formData.priority}
      onValueChange={(v) => v && handleSelectChange('priority', v)}
    >
      <SelectTrigger>
        <span>{priorities.find(p => p.value === formData.priority)?.label || t('task.select_priority', {}, 'Chọn mức độ ưu tiên')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each priorities as priority (priority.value)}
          <SelectItem value={priority.value} label={priority.label}>
            {priority.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.priority}
      <p class="text-xs text-red-500">{errors.priority}</p>
    {/if}
  </div>
</div>

<div class="grid grid-cols-1 gap-4">
  <div class="grid gap-2">
    <Label for="label">{t('task.label', {}, 'Nhãn')}</Label>
    <Select
      value={formData.label}
      onValueChange={(v) => v && handleSelectChange('label', v)}
    >
      <SelectTrigger>
        <span>{labels.find(l => l.value === formData.label)?.label || t('task.select_label', {}, 'Chọn nhãn')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each labels as label (label.value)}
          <SelectItem value={label.value} label={label.label}>
            {label.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.label}
      <p class="text-xs text-red-500">{errors.label}</p>
    {/if}
  </div>
</div>

<div class="grid gap-2">
  <Label for="assigned_to">{t('task.assigned_to', {}, 'Người thực hiện')}</Label>
  <Select
    value={formData.assigned_to}
    onValueChange={(v) => v && handleSelectChange('assigned_to', v)}
  >
    <SelectTrigger>
      <span>{users.find(u => u.id === formData.assigned_to)?.username || users.find(u => u.id === formData.assigned_to)?.email || t('task.select_assignee_short', {}, 'Phân công cho')}</span>
    </SelectTrigger>
    <SelectContent>
      {#each users as user (user.id)}
        <SelectItem value={user.id} label={user.username || user.email}>
          {user.username || user.email}
        </SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>

<div class="grid grid-cols-2 gap-4">
  <div class="grid gap-2">
    <Label for="parent_task_id">Task cha</Label>
    <Select
      value={formData.parent_task_id}
      onValueChange={(v) => v && handleSelectChange('parent_task_id', v)}
    >
      <SelectTrigger>
        <span>{parentTasks.find((task) => task.id === formData.parent_task_id)?.title || 'Chọn task cha (tuỳ chọn)'}</span>
      </SelectTrigger>
      <SelectContent>
        {#each parentTasks as task (task.id)}
          <SelectItem value={task.id} label={task.title}>
            {task.title}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  <div class="grid gap-2">
    <Label for="estimated_time">Ước tính (giờ)</Label>
    <Input
      id="estimated_time"
      type="number"
      min="0"
      step="0.5"
      value={formData.estimated_time}
      oninput={(e) => {
        const target = e.target as HTMLInputElement
        handleSelectChange('estimated_time', target.value)
      }}
      placeholder="0"
    />
    {#if errors.estimated_time}
      <p class="text-xs text-red-500">{errors.estimated_time}</p>
    {/if}
  </div>
</div>

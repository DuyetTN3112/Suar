<script lang="ts">
  import Label from '@/components/ui/label.svelte'
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
    }
    handleSelectChange: (name: string, value: string) => void
    errors: Record<string, string>
    statuses: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    labels: Array<{ value: string; label: string }>
    users: Array<{ id: string; username: string; email: string }>
  }

  const { formData, handleSelectChange, errors, statuses, priorities, labels, users }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="grid grid-cols-2 gap-4">
  <div class="grid gap-2">
    <Label for="status">{t('task.status', {}, 'Trạng thái')}</Label>
    <Select
      value={formData.status}
      onValueChange={(v) => v && handleSelectChange('status', v)}
    >
      <SelectTrigger id="status">
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
      <SelectTrigger id="priority">
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
      <SelectTrigger id="label">
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
    <SelectTrigger id="assigned_to">
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

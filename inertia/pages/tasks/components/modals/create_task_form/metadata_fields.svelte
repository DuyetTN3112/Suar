<script lang="ts">
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    formData: {
      status_id: string
      priority_id: string
      label_id: string
      assigned_to: string
    }
    handleSelectChange: (name: string, value: string) => void
    errors: Record<string, string>
    statuses: Array<{ id: number; name: string }>
    priorities: Array<{ id: number; name: string }>
    labels: Array<{ id: number; name: string }>
    users: Array<{ id: number; username: string; email: string }>
  }

  const { formData, handleSelectChange, errors, statuses, priorities, labels, users }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="grid grid-cols-2 gap-4">
  <div class="grid gap-2">
    <Label for="status_id">{t('task.status', {}, 'Trạng thái')}</Label>
    <Select
      value={formData.status_id}
      onValueChange={(v) => v && handleSelectChange('status_id', v)}
    >
      <SelectTrigger id="status_id">
        <span>{statuses.find(s => String(s.id) === formData.status_id)?.name || t('task.select_status', {}, 'Chọn trạng thái')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each statuses as status (status.id)}
          <SelectItem value={String(status.id)} label={status.name}>
            {status.name}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.status_id}
      <p class="text-xs text-red-500">{errors.status_id}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="priority_id">{t('task.priority', {}, 'Mức độ ưu tiên')}</Label>
    <Select
      value={formData.priority_id}
      onValueChange={(v) => v && handleSelectChange('priority_id', v)}
    >
      <SelectTrigger id="priority_id">
        <span>{priorities.find(p => String(p.id) === formData.priority_id)?.name || t('task.select_priority', {}, 'Chọn mức độ ưu tiên')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each priorities as priority (priority.id)}
          <SelectItem value={String(priority.id)} label={priority.name}>
            {priority.name}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.priority_id}
      <p class="text-xs text-red-500">{errors.priority_id}</p>
    {/if}
  </div>
</div>

<div class="grid grid-cols-1 gap-4">
  <div class="grid gap-2">
    <Label for="label_id">{t('task.label', {}, 'Nhãn')}</Label>
    <Select
      value={formData.label_id}
      onValueChange={(v) => v && handleSelectChange('label_id', v)}
    >
      <SelectTrigger id="label_id">
        <span>{labels.find(l => String(l.id) === formData.label_id)?.name || t('task.select_label', {}, 'Chọn nhãn')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each labels as label (label.id)}
          <SelectItem value={String(label.id)} label={label.name}>
            {label.name}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.label_id}
      <p class="text-xs text-red-500">{errors.label_id}</p>
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
      <span>{users.find(u => String(u.id) === formData.assigned_to)?.username || users.find(u => String(u.id) === formData.assigned_to)?.email || t('task.select_assignee_short', {}, 'Phân công cho')}</span>
    </SelectTrigger>
    <SelectContent>
      {#each users as user (user.id)}
        <SelectItem value={String(user.id)} label={user.username || user.email}>
          {user.username || user.email}
        </SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div>

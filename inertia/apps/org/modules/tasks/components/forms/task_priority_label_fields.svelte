<script lang="ts">
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface OptionItem {
    value: string
    label: string
  }

  interface Props {
    formData: {
      priority: string
      label: string
    }
    priorities: OptionItem[]
    labels: OptionItem[]
    onSelectChange: (name: string, value: string) => void
  }

  const { formData, priorities, labels, onSelectChange }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div class="grid gap-2">
    <Label for="priority" class="font-bold">{t('task.priority', {}, 'Priority')}</Label>
    <Select
      value={formData.priority}
      onValueChange={(value: string) => {
        onSelectChange('priority', value)
      }}
    >
      <SelectTrigger>
        <span>{priorities.find((item) => item.value === formData.priority)?.label ?? t('task.select_priority', {}, 'Select priority')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each priorities as priority (priority.value)}
          <SelectItem value={priority.value} label={priority.label}>
            {priority.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  <div class="grid gap-2">
    <Label for="label" class="font-bold">{t('task.label', {}, 'Label')}</Label>
    <Select
      value={formData.label}
      onValueChange={(value: string) => {
        onSelectChange('label', value)
      }}
    >
      <SelectTrigger>
        <span>{labels.find((item) => item.value === formData.label)?.label ?? t('task.select_label', {}, 'Select label')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each labels as label (label.value)}
          <SelectItem value={label.value} label={label.label}>
            {label.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>
</div>

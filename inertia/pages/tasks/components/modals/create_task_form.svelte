<script lang="ts">
  import BasicFields from './create_task_form/basic_fields.svelte'
  import MetadataFields from './create_task_form/metadata_fields.svelte'
  import DueDateField from './create_task_form/due_date_field.svelte'

  interface Props {
    formData: {
      title: string
      description: string
      status_id: string
      priority_id: string
      label_id: string
      assigned_to: string
      due_date: string
    }
    setFormData: (updater: (prev: typeof formData) => typeof formData) => void
    errors: Record<string, string>
    statuses: Array<{ id: number; name: string }>
    priorities: Array<{ id: number; name: string }>
    labels: Array<{ id: number; name: string }>
    users: Array<{ id: number; username: string; email: string }>
  }

  const { formData, setFormData, errors, statuses, priorities, labels, users }: Props = $props()

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    const { name, value } = target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        due_date: date.toISOString().split('T')[0]
      }))
    } else {
      setFormData(prev => ({ ...prev, due_date: '' }))
    }
  }
</script>

<div class="grid gap-4 py-4">
  <BasicFields
    {formData}
    {handleChange}
    {errors}
  />

  <MetadataFields
    {formData}
    {handleSelectChange}
    {errors}
    {statuses}
    {priorities}
    {labels}
    {users}
  />

  <DueDateField
    dueDate={formData.due_date ? new Date(formData.due_date) : undefined}
    onDateChange={handleDateChange}
    error={errors.due_date}
  />
</div>

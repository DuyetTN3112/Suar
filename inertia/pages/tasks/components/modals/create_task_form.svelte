<script lang="ts">
  import BasicFields from './create_task_form/basic_fields.svelte'
  import MetadataFields from './create_task_form/metadata_fields.svelte'
  import DueDateField from './create_task_form/due_date_field.svelte'
  import TaskSkillsField from './create_task_form/task_skills_field.svelte'

  interface Skill {
    id: string
    name: string
    level: string
  }

  interface Props {
    formData: {
      title: string
      description: string
      status: string
      priority: string
      label: string
      assigned_to: string
      due_date: string
      parent_task_id: string
      estimated_time: string
      required_skills: Skill[]
    }
    setFormData: (updater: (prev: typeof formData) => typeof formData) => void
    errors: Record<string, string>
    statuses: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    labels: Array<{ value: string; label: string }>
    users: Array<{ id: string; username: string; email: string }>
    parentTasks: Array<{ id: string; title: string; status: string }>
    availableSkills?: Array<{ id: string; name: string }>
  }

  const { formData, setFormData, errors, statuses, priorities, labels, users, parentTasks, availableSkills }: Props = $props()

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

  function handleAddSkill(skill: Skill) {
    setFormData(prev => ({
      ...prev,
      required_skills: [...prev.required_skills, skill]
    }))
  }

  function handleRemoveSkill(skillId: string) {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(s => s.id !== skillId)
    }))
  }
</script>

<div class="space-y-4 py-4">
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
    {parentTasks}
  />

  <TaskSkillsField
    requiredSkills={formData.required_skills}
    onAddSkill={handleAddSkill}
    onRemoveSkill={handleRemoveSkill}
    availableSkills={availableSkills || []}
    error={errors.required_skills}
  />

  <DueDateField
    dueDate={formData.due_date ? new Date(formData.due_date) : undefined}
    onDateChange={handleDateChange}
    error={errors.due_date}
  />
</div>

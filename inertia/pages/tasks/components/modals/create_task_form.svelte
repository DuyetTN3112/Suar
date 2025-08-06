<script lang="ts">
  import BasicFields from './create_task_form/basic_fields.svelte'
  import MetadataFields from './create_task_form/metadata_fields.svelte'
  import DueDateField from './create_task_form/due_date_field.svelte'
  import TaskSkillsField from './create_task_form/task_skills_field.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Input from '@/components/ui/input.svelte'

  interface Skill {
    id: string
    name: string
    level: string
  }

  interface Props {
    formData: {
      title: string
      description: string
      task_status_id: string
      task_type: string
      verification_method: string
      project_id: string
      priority: string
      label: string
      assigned_to: string
      due_date: string
      parent_task_id: string
      estimated_time: string
      required_skills: Skill[]
      acceptance_criteria: string
      context_background: string
      tech_stack_text: string
      learning_objectives_text: string
      domain_tags_text: string
    }
    setFormData: (updater: (prev: typeof formData) => typeof formData) => void
    errors: Record<string, string>
    statuses: Array<{ value: string; label: string }>
    priorities: Array<{ value: string; label: string }>
    labels: Array<{ value: string; label: string }>
    users: Array<{ id: string; username: string; email: string }>
    parentTasks: Array<{ id: string; title: string; task_status_id: string | null }>
    availableSkills?: Array<{ id: string; name: string }>
    projects?: Array<{ id: string; name: string }>
  }

  const { formData, setFormData, errors, statuses, priorities, labels, users, parentTasks, availableSkills, projects }: Props = $props()

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

  const handleTextareaInput = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
    projects={projects || []}
  />

  <TaskSkillsField
    requiredSkills={formData.required_skills}
    onAddSkill={handleAddSkill}
    onRemoveSkill={handleRemoveSkill}
    availableSkills={availableSkills || []}
    error={errors.required_skills}
  />

  <div class="grid gap-4 rounded-lg border bg-muted/10 p-4">
    <div class="space-y-1">
      <h3 class="text-sm font-semibold">Tiêu chí đánh giá và ngữ cảnh</h3>
      <p class="text-xs text-muted-foreground">
        Phần này sẽ đi thẳng vào review, profile snapshot và cách hệ thống hiểu đầu ra của task.
      </p>
    </div>

    <div class="grid gap-2">
      <Label for="acceptance_criteria">
        Acceptance criteria<span class="ml-1 text-red-500">*</span>
      </Label>
      <Textarea
        id="acceptance_criteria"
        value={formData.acceptance_criteria}
        rows={4}
        placeholder="Done nghĩa là gì, reviewer cần kiểm tra gì, output cuối cùng trông như thế nào..."
        oninput={(event: Event) => {
          handleTextareaInput(
            'acceptance_criteria',
            (event.target as HTMLTextAreaElement).value
          )
        }}
      />
      {#if errors.acceptance_criteria}
        <p class="text-xs text-red-500">{errors.acceptance_criteria}</p>
      {/if}
    </div>

    <div class="grid gap-2">
      <Label for="context_background">Bối cảnh bổ sung</Label>
      <Textarea
        id="context_background"
        value={formData.context_background}
        rows={3}
        placeholder="Vì sao task này xuất hiện, các ràng buộc kỹ thuật hoặc nghiệp vụ cần biết..."
        oninput={(event: Event) => {
          handleTextareaInput(
            'context_background',
            (event.target as HTMLTextAreaElement).value
          )
        }}
      />
      {#if errors.context_background}
        <p class="text-xs text-red-500">{errors.context_background}</p>
      {/if}
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="grid gap-2">
        <Label for="tech_stack_text">Tech stack</Label>
        <Input
          id="tech_stack_text"
          value={formData.tech_stack_text}
          placeholder="React, AdonisJS, PostgreSQL, Docker"
          oninput={(event: Event) => {
            handleTextareaInput(
              'tech_stack_text',
              (event.target as HTMLInputElement).value
            )
          }}
        />
        <p class="text-[11px] text-muted-foreground">Ngăn cách bằng dấu phẩy hoặc xuống dòng.</p>
      </div>

      <div class="grid gap-2">
        <Label for="domain_tags_text">Domain tags</Label>
        <Input
          id="domain_tags_text"
          value={formData.domain_tags_text}
          placeholder="marketplace, auth, billing"
          oninput={(event: Event) => {
            handleTextareaInput(
              'domain_tags_text',
              (event.target as HTMLInputElement).value
            )
          }}
        />
        <p class="text-[11px] text-muted-foreground">Giúp nhóm lọc task và đọc profile sau này.</p>
      </div>
    </div>

    <div class="grid gap-2">
      <Label for="learning_objectives_text">Learning objectives</Label>
      <Textarea
        id="learning_objectives_text"
        value={formData.learning_objectives_text}
        rows={3}
        placeholder="Mỗi dòng là một mục tiêu học tập hoặc năng lực muốn quan sát."
        oninput={(event: Event) => {
          handleTextareaInput(
            'learning_objectives_text',
            (event.target as HTMLTextAreaElement).value
          )
        }}
      />
    </div>
  </div>

  <DueDateField
    dueDate={formData.due_date ? new Date(formData.due_date) : undefined}
    onDateChange={handleDateChange}
    error={errors.due_date}
  />
</div>

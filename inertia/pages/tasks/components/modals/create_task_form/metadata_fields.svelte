<script lang="ts">
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    formData: {
      task_status_id: string
      task_type: string
      verification_method: string
      project_id: string
      priority: string
      label: string
      assigned_to: string
      parent_task_id: string
      estimated_time: string
    }
    handleSelectChange: (name: string, value: string) => void
    errors: Record<string, string>
    statuses: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    projects: { id: string; name: string }[]
  }

  const { formData, handleSelectChange, errors, statuses, priorities, labels, users, parentTasks, projects }: Props = $props()
  const { t } = useTranslation()

  const taskTypeOptions = [
    { value: 'feature_development', label: 'Feature development' },
    { value: 'bug_fix', label: 'Bug fix' },
    { value: 'refactoring', label: 'Refactoring' },
    { value: 'architecture_design', label: 'Architecture design' },
    { value: 'code_review', label: 'Code review' },
    { value: 'system_integration', label: 'System integration' },
    { value: 'ui_ux_design', label: 'UI/UX design' },
    { value: 'prototype', label: 'Prototype' },
    { value: 'api_design', label: 'API design' },
    { value: 'qa_testing', label: 'QA testing' },
    { value: 'test_automation', label: 'Test automation' },
    { value: 'performance_testing', label: 'Performance testing' },
    { value: 'devops_deployment', label: 'DevOps / Deployment' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'monitoring_setup', label: 'Monitoring setup' },
    { value: 'data_analysis', label: 'Data analysis' },
    { value: 'data_pipeline', label: 'Data pipeline' },
    { value: 'reporting', label: 'Reporting' },
    { value: 'technical_writing', label: 'Technical writing' },
    { value: 'documentation', label: 'Documentation' },
    { value: 'knowledge_transfer', label: 'Knowledge transfer' },
    { value: 'research_spike', label: 'Research spike' },
    { value: 'poc', label: 'POC' },
    { value: 'product_management', label: 'Product management' },
    { value: 'mentoring', label: 'Mentoring' },
  ]

  const verificationOptions = [
    { value: 'code_review', label: 'Code review' },
    { value: 'automated_test', label: 'Automated test' },
    { value: 'manual_qa', label: 'Manual QA' },
    { value: 'demo_presentation', label: 'Demo / Presentation' },
    { value: 'manager_approval', label: 'Manager approval' },
    { value: 'peer_review', label: 'Peer review' },
    { value: 'user_acceptance_test', label: 'User acceptance test' },
    { value: 'a_b_test', label: 'A/B test' },
    { value: 'load_test', label: 'Load test' },
    { value: 'security_audit', label: 'Security audit' },
    { value: 'documentation_review', label: 'Documentation review' },
    { value: 'multi_step', label: 'Multi-step verification' },
  ]
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
  <div class="grid gap-2">
    <Label for="project_id">
      Project<span class="ml-1 text-red-500">*</span>
    </Label>
    <Select
      value={formData.project_id}
      onValueChange={(value: string) => {
        handleSelectChange('project_id', value)
      }}
    >
      <SelectTrigger>
        <span>{projects.find((project) => project.id === formData.project_id)?.name ?? 'Chọn project'}</span>
      </SelectTrigger>
      <SelectContent>
        {#each projects as project (project.id)}
          <SelectItem value={project.id} label={project.name}>
            {project.name}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.project_id}
      <p class="text-xs text-red-500">{errors.project_id}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="task_status_id">
      {t('task.status', {}, 'Trạng thái')}<span class="ml-1 text-red-500">*</span>
    </Label>
    <Select
      value={formData.task_status_id}
      onValueChange={(value: string) => {
        handleSelectChange('task_status_id', value)
      }}
    >
      <SelectTrigger>
        <span>{statuses.find(s => s.value === formData.task_status_id)?.label ?? t('task.select_status', {}, 'Chọn trạng thái')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each statuses as status (status.value)}
          <SelectItem value={status.value} label={status.label}>
            {status.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.task_status_id}
      <p class="text-xs text-red-500">{errors.task_status_id}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="task_type">Loại task</Label>
    <Select
      value={formData.task_type}
      onValueChange={(value: string) => {
        handleSelectChange('task_type', value)
      }}
    >
      <SelectTrigger>
        <span>{taskTypeOptions.find((option) => option.value === formData.task_type)?.label ?? 'Chọn loại task'}</span>
      </SelectTrigger>
      <SelectContent>
        {#each taskTypeOptions as option (option.value)}
          <SelectItem value={option.value} label={option.label}>
            {option.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.task_type}
      <p class="text-xs text-red-500">{errors.task_type}</p>
    {/if}
  </div>
</div>

<div class="grid grid-cols-2 gap-4">
  <div class="grid gap-2">
    <Label for="priority">{t('task.priority', {}, 'Mức độ ưu tiên')}</Label>
    <Select
      value={formData.priority}
      onValueChange={(value: string) => {
        handleSelectChange('priority', value)
      }}
    >
      <SelectTrigger>
        <span>{priorities.find(p => p.value === formData.priority)?.label ?? t('task.select_priority', {}, 'Chọn mức độ ưu tiên')}</span>
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

  <div class="grid gap-2">
    <Label for="verification_method">Cách nghiệm thu</Label>
    <Select
      value={formData.verification_method}
      onValueChange={(value: string) => {
        handleSelectChange('verification_method', value)
      }}
    >
      <SelectTrigger>
        <span>{verificationOptions.find((option) => option.value === formData.verification_method)?.label ?? 'Chọn cách nghiệm thu'}</span>
      </SelectTrigger>
      <SelectContent>
        {#each verificationOptions as option (option.value)}
          <SelectItem value={option.value} label={option.label}>
            {option.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.verification_method}
      <p class="text-xs text-red-500">{errors.verification_method}</p>
    {/if}
  </div>
</div>

<div class="grid grid-cols-1 gap-4">
  <div class="grid gap-2">
    <Label for="label">{t('task.label', {}, 'Nhãn')}</Label>
    <Select
      value={formData.label}
      onValueChange={(value: string) => {
        handleSelectChange('label', value)
      }}
    >
      <SelectTrigger>
        <span>{labels.find(l => l.value === formData.label)?.label ?? t('task.select_label', {}, 'Chọn nhãn')}</span>
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
    onValueChange={(value: string) => {
      handleSelectChange('assigned_to', value)
    }}
  >
    <SelectTrigger>
      <span>{(users.find(u => u.id === formData.assigned_to)?.username ?? users.find(u => u.id === formData.assigned_to)?.email) ?? t('task.select_assignee_short', {}, 'Phân công cho')}</span>
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
      onValueChange={(value: string) => {
        handleSelectChange('parent_task_id', value)
      }}
    >
      <SelectTrigger>
        <span>{parentTasks.find((task) => task.id === formData.parent_task_id)?.title ?? 'Chọn task cha (tuỳ chọn)'}</span>
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
      oninput={(event: Event) => {
        const target = event.target as HTMLInputElement
        handleSelectChange('estimated_time', target.value)
      }}
      placeholder="0"
    />
    {#if errors.estimated_time}
      <p class="text-xs text-red-500">{errors.estimated_time}</p>
    {/if}
  </div>
</div>

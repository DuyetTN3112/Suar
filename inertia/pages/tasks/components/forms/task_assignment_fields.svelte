<script lang="ts">
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface ProjectOption {
    id: string
    name: string
  }

  interface UserOption {
    id: string
    username: string
    email: string
  }

  interface ParentTaskOption {
    id: string
    title: string
    task_status_id: string | null
  }

  interface Props {
    formData: {
      project_id: string
      assigned_to: string
      parent_task_id: string
    }
    projects?: ProjectOption[]
    users: UserOption[]
    parentTasks?: ParentTaskOption[]
    taskId: string
    canAssign: boolean
    projectError?: string
    onSelectChange: (name: string, value: string) => void
  }

  const {
    formData,
    projects = [],
    users,
    parentTasks = [],
    taskId,
    canAssign,
    projectError,
    onSelectChange,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div class="grid gap-2">
    <Label for="project_id" class="font-bold">Project <span class="text-destructive">*</span></Label>
    <Select
      value={formData.project_id}
      onValueChange={(value: string) => {
        onSelectChange('project_id', value)
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
    {#if projectError}
      <p class="text-xs font-bold text-destructive">{projectError}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="assigned_to" class="font-bold">{t('task.assigned_to', {}, 'Người thực hiện')}</Label>
    <Select
      value={formData.assigned_to}
      onValueChange={(value: string) => {
        onSelectChange('assigned_to', value)
      }}
      disabled={!canAssign}
    >
      <SelectTrigger disabled={!canAssign}>
        <span>{(users.find((user) => user.id === formData.assigned_to)?.username ?? users.find((user) => user.id === formData.assigned_to)?.email) ?? t('task.select_assignee_short', {}, 'Phân công cho')}</span>
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

  <div class="grid gap-2">
    <Label for="parent_task_id" class="font-bold">Task cha</Label>
    <Select
      value={formData.parent_task_id}
      onValueChange={(value: string) => {
        onSelectChange('parent_task_id', value)
      }}
    >
      <SelectTrigger>
        <span>{parentTasks.find((parent) => parent.id === formData.parent_task_id)?.title ?? 'Chọn task cha (tùy chọn)'}</span>
      </SelectTrigger>
      <SelectContent>
        {#each parentTasks.filter((parent) => parent.id !== taskId) as parent (parent.id)}
          <SelectItem value={parent.id} label={parent.title}>
            {parent.title}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>
</div>

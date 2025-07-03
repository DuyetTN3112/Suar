<script lang="ts">
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'

  interface ProjectOption {
    id: string
    name: string
  }

  interface ProjectContext {
    selectedProject?: {
      id: string
      name: string
    } | null
  }

  interface CreateTaskPermission {
    allowed: boolean
    reason: string | null
  }

  interface Props {
    filters: {
      project_id?: string
    }
    projectContext?: ProjectContext | null
    projectOptions: ProjectOption[]
    createTaskPermission: CreateTaskPermission
    onProjectScopeChange: (projectId: string) => void
  }

  const {
    filters,
    projectContext,
    projectOptions,
    createTaskPermission,
    onProjectScopeChange,
  }: Props = $props()
</script>

<div class="rounded-lg border bg-card p-3">
  <div class="w-full sm:w-[320px]">
    <Select
      value={filters.project_id || projectContext?.selectedProject?.id || '__all__'}
      onValueChange={(value: string) => {
        onProjectScopeChange(value)
      }}
    >
      <SelectTrigger>
        <span>
          {projectContext?.selectedProject?.name || 'Tất cả project'}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__" label="Tất cả project">
          Tất cả project
        </SelectItem>
        {#each projectOptions as project (project.id)}
          <SelectItem value={project.id} label={project.name}>
            {project.name}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  {#if projectOptions.length === 0}
    <p class="mt-2 text-sm text-muted-foreground">
      Chưa có project trong tổ chức hiện tại để hiển thị task.
    </p>
  {/if}
</div>

{#if !createTaskPermission.allowed}
  <div class="rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100">
    <p class="font-semibold">Bạn chưa thể tạo nhiệm vụ ở màn này.</p>
    <p class="mt-1">
      {createTaskPermission.reason ||
        'Chỉ org_owner, org_admin hoặc project_manager của project đã chọn mới được tạo nhiệm vụ.'}
    </p>
  </div>
{/if}

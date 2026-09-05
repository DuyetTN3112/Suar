<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { findRoleMatchedProjectMembers } from '@/apps/user/modules/tasks/lib/create_prefill'
  import type { TaskCreateAssigneeGroups, TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'

  interface ProjectProfessionalRoleOption {
    id: string
    name: string
    code: string
  }

  interface ProjectProfessionalRolesResponse {
    data?: ProjectProfessionalRoleOption[]
  }

  interface Props {
    projectId: string
    assignedTo: string
    requestedRoleId: string
    assigneeGroups: TaskCreateAssigneeGroups
    setFormData: (updater: (prev: TaskCreateFormData) => TaskCreateFormData) => void
    projectProfessionalRoleId: string
  }

  let {
    projectId,
    assignedTo,
    requestedRoleId,
    assigneeGroups,
    setFormData,
    projectProfessionalRoleId = $bindable(),
  }: Props = $props()

  let selectedRoleId = $state('')
  let availableRoles = $state<ProjectProfessionalRoleOption[]>([])
  let didAutoPrefillFromQuery = $state(false)
  let prefilledSkillCount = $state(0)
  const { t } = useTranslation()

  const selectedRole = $derived(
    availableRoles.find((role) => role.id === selectedRoleId) ?? null
  )
  const roleMatchedProjectMembers = $derived(
    findRoleMatchedProjectMembers(selectedRoleId, assigneeGroups.projectMembers)
  )

  $effect(() => {
    if (projectId) {
      fetch(`/api/v1/projects/${projectId}/professional-roles`)
        .then((r) => r.json())
        .then((payload) => {
          const data = payload as ProjectProfessionalRolesResponse
          availableRoles = data.data ?? []
          if (selectedRoleId && !availableRoles.some((role) => role.id === selectedRoleId)) {
            selectedRoleId = ''
            projectProfessionalRoleId = ''
            prefilledSkillCount = 0
          }
        })
        .catch(() => {
          availableRoles = []
          projectProfessionalRoleId = ''
          prefilledSkillCount = 0
        })
    } else {
      availableRoles = []
      selectedRoleId = ''
      prefilledSkillCount = 0
    }
  })

  function selectRoleForAssigneeFilter(roleId: string) {
    if (!projectId) return
    if (!roleId) {
      projectProfessionalRoleId = ''
      prefilledSkillCount = 0
      return
    }
    projectProfessionalRoleId = roleId
    prefilledSkillCount = 0
  }

  function handleRoleChange(nextRoleId: string) {
    selectedRoleId = nextRoleId
    selectRoleForAssigneeFilter(nextRoleId)
  }

  $effect(() => {
    if (
      !didAutoPrefillFromQuery &&
      requestedRoleId &&
      projectId &&
      availableRoles.some((role) => role.id === requestedRoleId)
    ) {
      selectedRoleId = requestedRoleId
      didAutoPrefillFromQuery = true
      selectRoleForAssigneeFilter(requestedRoleId)
    }
  })

  function handleAssignRoleMatchedMember(userId: string) {
    setFormData((prev) => ({ ...prev, assigned_to: userId }))
  }
</script>

{#if projectId && availableRoles.length > 0}
  <div class="mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3" data-demo-section="task-role-prefill">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0 flex-1">
        <label
          for="professional-role-prefill"
          class="block text-sm font-bold text-foreground"
        >
          Lọc người thực hiện theo vai trò
        </label>
        {#if selectedRole}
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span class="rounded-full border border-border bg-background px-2 py-0.5 font-semibold text-foreground">{selectedRole.name}</span>
            <span>Chỉ lọc người thực hiện; kỹ năng yêu cầu được chọn riêng tại task.</span>
          </div>
        {/if}
        {#if selectedRoleId}
          <div class="mt-3 rounded-xl border border-border bg-background p-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase text-muted-foreground">
                {t('task.role_prefill.suggested_assignee', {}, 'Suggested assignee')}
              </p>
              <span class="text-xs font-semibold text-foreground">
                {t('task.role_prefill.match_count', { count: roleMatchedProjectMembers.length }, ':count matches')}
              </span>
            </div>
            {#if roleMatchedProjectMembers.length > 0}
              <div class="mt-3 grid gap-2 md:grid-cols-2">
                {#each roleMatchedProjectMembers as member (member.id)}
                  <div class="min-w-0 rounded-xl border border-border bg-secondary/20 px-3 py-2">
                    <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                          {member.username}
                        </p>
                        <p class="mt-1 text-xs text-muted-foreground">
                          {member.deliveryRoleName ?? t('task.role_prefill.current_role_fallback', {}, 'Currently holds this role')} · {member.governanceRole ?? 'project_member'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={assignedTo === member.id ? 'default' : 'outline'}
                        class="shrink-0 self-start sm:self-auto"
                        onclick={() => {
                          handleAssignRoleMatchedMember(member.id)
                        }}
                      >
                        {assignedTo === member.id ? t('task.role_prefill.selected', {}, 'Selected') : t('task.role_prefill.quick_assign', {}, 'Quick assign')}
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="mt-3 text-xs text-muted-foreground">{t('task.role_prefill.no_matching_assignee', {}, 'No matching assignee yet.')}</p>
            {/if}
          </div>
        {/if}
      </div>
      <div class="flex min-w-0 items-center gap-2 lg:w-64">
        <select
          id="professional-role-prefill"
          bind:value={selectedRoleId}
          onchange={(event) => {
            void handleRoleChange((event.currentTarget as HTMLSelectElement).value)
          }}
          class="h-9 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">{t('task.role_prefill.select_role', {}, 'Select role')}</option>
          {#each availableRoles as role}
            <option value={role.id}>{role.name} ({role.code})</option>
          {/each}
        </select>
      </div>
    </div>
  </div>
{:else if projectId}
  <div class="mb-4 rounded-lg border border-dashed border-border bg-secondary/10 px-4 py-3">
    <p class="text-sm font-medium text-foreground">{t('task.role_prefill.no_project_roles', {}, 'This project has no roles yet.')}</p>
  </div>
{/if}

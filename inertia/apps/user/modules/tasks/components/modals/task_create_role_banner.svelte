<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface ProjectProfessionalRoleOption {
    id: string
    name: string
    code: string
  }

  interface Props {
    projectId: string
    selectedRoleId: string
    availableRoles: ProjectProfessionalRoleOption[]
    roleMatchedProjectMembers: Array<{
      id: string
      username: string
      email: string
      governanceRole?: string | null
      deliveryRoleName?: string | null
    }>
    assignedTo: string
    prefilling: boolean
    prefilledSkillCount?: number
    onRoleChange: (roleId: string) => void
    onAssignMember: (userId: string) => void
  }

  let {
    projectId,
    selectedRoleId = $bindable(),
    availableRoles,
    roleMatchedProjectMembers,
    assignedTo = $bindable(),
    prefilling,
    prefilledSkillCount = 0,
    onRoleChange,
    onAssignMember,
  }: Props = $props()
  const { t } = useTranslation()
</script>

{#if projectId && availableRoles.length > 0}
  <div class="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0 flex-1">
        <label
          for="modal-professional-role-prefill"
          class="block text-sm font-bold text-foreground"
        >
          {t('task.role_prefill.apply_by_role', {}, 'Apply by role')}
        </label>
        {#if selectedRoleId}
          <p class="mt-2 text-xs text-muted-foreground">
            {#if prefilledSkillCount > 0}
              {t('task.role_prefill.prefilled_skill_count', { count: prefilledSkillCount }, ':count skills loaded from the selected role')}
            {:else if prefilling}
              {t('task.role_prefill.loading', {}, 'Loading...')}
            {:else}
              {t('ui_misc.tasks.role_prefill.baseline', {}, 'Role baseline')}
            {/if}
          </p>
          <div class="mt-3 min-w-0 rounded-xl border border-border bg-background p-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase text-muted-foreground">
                {t('task.role_prefill.suggested_assignee', {}, 'Suggested assignee')}
              </p>
              <span class="text-xs font-semibold text-foreground">
                {t('task.role_prefill.match_count', { count: roleMatchedProjectMembers.length }, ':count matches')}
              </span>
            </div>
            {#if roleMatchedProjectMembers.length > 0}
              <div class="mt-3 grid gap-2 lg:grid-cols-2">
                {#each roleMatchedProjectMembers as member (member.id)}
                  <div class="min-w-0 rounded-xl border border-border bg-secondary/20 px-3 py-2">
                    <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div class="min-w-0">
                        <p class="break-words text-sm font-semibold text-foreground">{member.username}</p>
                        <p class="mt-1 break-words font-sans text-xs text-muted-foreground">
                          {member.deliveryRoleName ?? t('task.role_prefill.current_role_fallback', {}, 'Currently holds this role')} · {member.governanceRole ?? 'project_member'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={assignedTo === member.id ? 'default' : 'outline'}
                        class="shrink-0 self-start sm:self-auto"
                        onclick={() => onAssignMember(member.id)}
                      >
                        {assignedTo === member.id ? t('task.role_prefill.selected', {}, 'Selected') : t('task.role_prefill.quick_assign', {}, 'Quick assign')}
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="mt-3 text-xs text-muted-foreground">
                {t('task.role_prefill.no_matching_assignee', {}, 'No matching assignee yet.')}
              </p>
            {/if}
          </div>
        {/if}
      </div>
      <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <select
          id="modal-professional-role-prefill"
          bind:value={selectedRoleId}
          onchange={(event) => onRoleChange((event.currentTarget as HTMLSelectElement).value)}
          class="h-9 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">{t('task.role_prefill.select_role', {}, 'Select role')}</option>
          {#each availableRoles as role}
            <option value={role.id}>{role.name} ({role.code})</option>
          {/each}
        </select>
        {#if prefilling}
          <span class="text-xs text-muted-foreground">{t('task.role_prefill.loading', {}, 'Loading...')}</span>
        {/if}
      </div>
    </div>
  </div>
{/if}

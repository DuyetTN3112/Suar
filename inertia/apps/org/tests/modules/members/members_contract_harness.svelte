<script lang="ts">
  type Member = {
    user_id: string
    username: string
    email: string
    org_role: string
    status: string
    created_at: string
    invited_by?: string | null
  }

  type RoleOption = {
    value: string
    label: string
  }

  interface Props {
    members: Member[]
    roleOptions: RoleOption[]
    currentUserId: string
    currentUserRole: 'org_owner' | 'org_admin' | 'org_member'
  }

  const { members, roleOptions, currentUserId, currentUserRole }: Props = $props()
  const canManageMembers = $derived(currentUserRole === 'org_owner' || currentUserRole === 'org_admin')
  const firstRoleValue = $derived(roleOptions[0]?.value ?? '')
  let selectedRole = $state('')

  $effect(() => {
    if (!selectedRole && firstRoleValue) {
      selectedRole = firstRoleValue
    }
  })

  function selectedRoleLabel(): string {
    return roleOptions.find((option) => option.value === selectedRole)?.label ?? ''
  }
</script>

<div>
  <label class="block space-y-1 text-sm font-medium">
    <span>Role</span>
    <select aria-label="Role" bind:value={selectedRole}>
      {#each roleOptions as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </label>

  <p data-testid="selected-role-label">{selectedRoleLabel()}</p>

  <div class="space-y-3">
    {#each members as member (member.user_id)}
      <article data-testid={`member-${member.user_id}`}>
        <p>{member.username}</p>
        {#if member.user_id !== currentUserId && canManageMembers}
          {#if member.status === 'pending' && !member.invited_by}
            <button type="button">Approve</button>
          {/if}
          <button type="button">Change role</button>
          <a href={`/org/members/${member.user_id}`}>Remove</a>
        {/if}
      </article>
    {/each}
  </div>
</div>

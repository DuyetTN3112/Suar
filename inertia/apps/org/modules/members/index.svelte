<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  import AddMemberModal from './components/add_member_modal.svelte'
  import DeleteMemberModal from './components/delete_member_modal.svelte'
  import EditMemberRoleModal from './components/edit_member_role_modal.svelte'
  import { createAddMembers } from './hooks/use_add_members.svelte'
  import type { OrganizationMemberIdentity } from './types'

  interface Member {
    user_id: string
    username: string
    email: string
    org_role: string
    status: string
    created_at: string
    invited_by?: string | null
  }

  interface Props {
    members: Member[]
    pagination: OffsetPagePagination
    filters: {
      search?: string | null
      orgRole?: string | null
      status?: string | null
    }
    roleOptions?: Array<{ value: string; label: string }>
    auth?: {
      user?: {
        id?: string | null
        current_organization_role?: string | null
      }
    }
  }

  const { members, pagination, filters, roleOptions = [], auth }: Props = $props()
  const { t } = $derived(useTranslation())
  const currentUser = $derived(auth?.user ?? {})
  const currentUserId = $derived(currentUser.id ?? '')
  const currentUserRole = $derived(currentUser.current_organization_role ?? null)
  const canManageMembers = $derived(currentUserRole === 'org_owner' || currentUserRole === 'org_admin')
  let selectedMemberForRole = $state<Member | null>(null)
  let selectedMemberForDelete = $state<Member | null>(null)
  let selectedRoleId = $state('')
  let isSubmitting = $state(false)
  let isDeleting = $state(false)
  let isApproving = $state(false)
  let actionError = $state<string | null>(null)
  const {
    addMemberModalOpen,
    setAddMemberModalOpen,
    candidates,
    selectedUserIds,
    searchUserTerm,
    setSearchUserTerm,
    isLoadingCandidates,
    isAddingMembers,
    pagination: addUserPagination,
    loadMemberCandidates,
    openAddMemberModal,
    handleSearchUsers,
    toggleUserSelection,
    handleAddMembersToOrganization,
  } = createAddMembers()
  const paginationQuery = $derived({
    status: filters.status,
    org_role: filters.orgRole,
  })

  const roleOptionList = $derived(
    roleOptions.length > 0
      ? roleOptions
      : [
          { value: 'org_owner', label: t('organization.role_owner', {}, 'Owner') },
          { value: 'org_admin', label: t('organization.role_admin', {}, 'Admin') },
          { value: 'org_member', label: t('organization.role_member', {}, 'Member') },
        ]
  )

  function getStatusLabel(status: string): string {
    return t(`user.status_${status.toLowerCase()}`, {}, status || t('common.unknown', {}, 'Unknown'))
  }

  function getRoleLabel(role: string): string {
    return roleOptionList.find((option) => option.value === role)?.label ?? role
  }

  function asMemberIdentity(member: Member): OrganizationMemberIdentity {
    return {
      id: member.user_id,
      username: member.username,
      email: member.email,
      status: member.status,
      created_at: member.created_at,
      organization_users: [
        {
          organization_id: '',
          org_role: member.org_role,
        },
      ],
    }
  }

  function getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) {
        return message
      }
    }
    return fallback
  }

  function openEditRole(member: Member) {
    selectedMemberForRole = member
    selectedRoleId = member.org_role
    actionError = null
  }

  function openDeleteUser(member: Member) {
    selectedMemberForDelete = member
    actionError = null
  }

  function closeEditRole() {
    selectedMemberForRole = null
    selectedRoleId = ''
    isSubmitting = false
  }

  function closeDeleteUser() {
    selectedMemberForDelete = null
    isDeleting = false
  }

  function handleUpdateRole(event: Event) {
    event.preventDefault()
    if (!selectedMemberForRole || !selectedRoleId) {
      actionError = t('user.error.select_role', {}, 'Please select a role')
      return
    }
    isSubmitting = true
    actionError = null

    router.put(
      `/org/members/${selectedMemberForRole.user_id}/role`,
      {
        roleId: selectedRoleId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          selectedMemberForRole = null
          selectedRoleId = ''
          router.reload({ only: ['members', 'pagination', 'flash'] })
        },
        onError: (errors: unknown) => {
          actionError = getErrorMessage(errors, t('user.error.update_failed', {}, 'Failed to update role'))
        },
        onFinish: () => {
          isSubmitting = false
        },
      }
    )
  }

  function handleDeleteUser() {
    if (!selectedMemberForDelete) {
      return
    }
    isDeleting = true
    actionError = null

    router.delete(`/org/members/${selectedMemberForDelete.user_id}`, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        selectedMemberForDelete = null
        router.reload({ only: ['members', 'pagination', 'flash'] })
      },
      onError: (errors: unknown) => {
        actionError = getErrorMessage(errors, t('user.error.remove_failed', {}, 'Failed to remove user'))
      },
      onFinish: () => {
        isDeleting = false
      },
    })
  }

  function handleApproveUser(member: Member) {
    if (!member) {
      return
    }
    isApproving = true
    actionError = null

    router.put(
      `/org/invitations/requests/${member.user_id}/approve`,
      {},
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          router.reload({ only: ['members', 'pagination', 'flash'] })
        },
        onError: (errors: unknown) => {
          actionError = getErrorMessage(errors, t('user.error.approve_failed', {}, 'Failed to approve member'))
        },
        onFinish: () => {
          isApproving = false
        },
      }
    )
  }
</script>

<OrganizationLayout title={t('organization.members.page_title', {}, 'Organization members')}>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('organization.members.eyebrow', {}, 'Organization access')}</p>
        <h1 class="mt-1 text-3xl font-black text-foreground">{t('organization.members.title', {}, 'Organization members')}</h1>
      </div>
      {#if canManageMembers}
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" onclick={() => { openAddMemberModal() }}>
            {t('user.add_users_to_org', {}, 'Add members')}
          </Button>
        </div>
      {/if}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{t('organization.members.list_title', {}, 'Member list')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if actionError}
          <p role="alert" class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {actionError}
          </p>
        {/if}
        {#if members.length === 0}
          <p class="text-sm text-muted-foreground">{t('organization.members.empty', {}, 'No matching members.')}</p>
        {:else}
          {#each members as member (member.user_id)}
            <article class="rounded-xl border border-border bg-background p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-bold text-foreground">{member.username}</p>
                  <p class="mt-1 text-sm text-muted-foreground">{member.email}</p>
                  <p class="mt-2 text-xs font-medium text-muted-foreground">{getStatusLabel(member.status)}</p>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <span class="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                    {getRoleLabel(member.org_role)}
                  </span>
                  {#if canManageMembers && member.user_id !== currentUserId}
                    <div class="flex flex-wrap justify-end gap-2">
                      {#if member.status === 'pending' && !member.invited_by}
                        <Button variant="secondary" size="sm" disabled={isApproving} onclick={() => { handleApproveUser(member) }}>
                          {t('user.approve', {}, 'Approve')}
                        </Button>
                      {/if}
                      <Button variant="outline" size="sm" onclick={() => { openEditRole(member) }}>
                        {t('user.edit_role', {}, 'Change role')}
                      </Button>
                      <Button variant="destructive" size="sm" onclick={() => { openDeleteUser(member) }}>
                        {t('user.remove_from_org', {}, 'Remove')}
                      </Button>
                    </div>
                  {/if}
                </div>
              </div>
            </article>
          {/each}
        {/if}

        <UnifiedOffsetPagination {pagination} baseUrl="/org/members" queryParams={paginationQuery} />
      </CardContent>
    </Card>

    <EditMemberRoleModal
      open={selectedMemberForRole !== null}
      onClose={closeEditRole}
      selectedUser={selectedMemberForRole ? asMemberIdentity(selectedMemberForRole) : null}
      {selectedRoleId}
      setSelectedRoleId={(value: string) => { selectedRoleId = value }}
      isSubmitting={isSubmitting}
      onSubmit={handleUpdateRole}
      roleOptions={roleOptionList}
    />

    <DeleteMemberModal
      open={selectedMemberForDelete !== null}
      onClose={closeDeleteUser}
      user={selectedMemberForDelete ? asMemberIdentity(selectedMemberForDelete) : null}
      isDeleting={isDeleting}
      onConfirm={handleDeleteUser}
    />

    <AddMemberModal
      open={$addMemberModalOpen}
      onClose={() => { setAddMemberModalOpen(false) }}
      candidates={$candidates}
      selectedUserIds={$selectedUserIds}
      searchUserTerm={$searchUserTerm}
      {setSearchUserTerm}
      isLoadingCandidates={$isLoadingCandidates}
      isAddingUsers={$isAddingMembers}
      pagination={$addUserPagination}
      onSearch={handleSearchUsers}
      onToggleUserSelection={toggleUserSelection}
      onAddUsers={handleAddMembersToOrganization}
      onChangePage={(page: number) => loadMemberCandidates(page, $searchUserTerm)}
    />
  </div>
</OrganizationLayout>

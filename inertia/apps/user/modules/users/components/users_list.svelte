<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Table from '@/apps/user/shared/ui/table.svelte'
  import TableBody from '@/apps/user/shared/ui/table_body.svelte'
  import TableCell from '@/apps/user/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/user/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/user/shared/ui/table_header.svelte'
  import TableRow from '@/apps/user/shared/ui/table_row.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { UserDirectoryRecord, UsersProps } from '../types'
  import { getUserDisplayName, getUserOrganizationRole } from '../utils/user_utils'

  interface Props {
    users: UsersProps['users']
    pagination: UsersProps['pagination']
    filters: UsersProps['filters']
    currentUserId: string
    isSuperAdmin: boolean
    onEditPermissions: (user: UserDirectoryRecord) => void
    onDeleteUser: (user: UserDirectoryRecord) => void
  }

  const {
    users,
    pagination,
    filters,
    currentUserId,
    isSuperAdmin,
    onEditPermissions,
    onDeleteUser
  }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>{t('user.name', {}, 'Name')}</TableHead>
        <TableHead>{t('user.email', {}, 'Email')}</TableHead>
        <TableHead>{t('user.role', {}, 'Role')}</TableHead>
        <TableHead>{t('user.status', {}, 'Status')}</TableHead>
        <TableHead class="text-right">{t('common.actions', {}, 'Actions')}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each users as user (user.id)}
        <TableRow>
          <TableCell>{getUserDisplayName(user)}</TableCell>
          <TableCell>{user.email}</TableCell>
          <TableCell>{getUserOrganizationRole(user)}</TableCell>
          <TableCell>{t(`user.status_${(user.status || '').toLowerCase()}`, {}, user.status || '')}</TableCell>
          <TableCell class="text-right">
            {#if user.id !== currentUserId}
              {#if isSuperAdmin}
                <Button
                  variant="outline"
                  size="sm"
                  class="mr-2"
                  onclick={() => { onEditPermissions(user) }}
                >
                  {t('user.edit_role', {}, 'Edit role')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onclick={() => { onDeleteUser(user) }}
                >
                  {t('user.remove_from_org', {}, 'Remove from organization')}
                </Button>
              {/if}
            {:else}
              <Link href={`/users/${user.id}/edit`}>
                <Button variant="outline" size="sm" class="mr-2">
                  {t('user.my_account', {}, 'My account')}
                </Button>
              </Link>
            {/if}
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</div>

{#if true}
  <div class="mt-4">
    <UnifiedOffsetPagination
      {pagination}
      baseUrl="/users"
      queryParams={filters}
    />
  </div>
{/if}

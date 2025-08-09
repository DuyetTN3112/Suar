<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import Pagination from '@/components/ui/pagination.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { User, UsersProps } from '../types'
  import { getUserDisplayName, getUserOrganizationRole } from '../utils/user_utils'

  interface Props {
    users: UsersProps['users']
    filters: UsersProps['filters']
    currentUserId: string
    isSuperAdmin: boolean
    onEditPermissions: (user: User) => void
    onDeleteUser: (user: User) => void
  }

  const {
    users,
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
        <TableHead>{t('user.name', {}, "Tên")}</TableHead>
        <TableHead>{t('user.email', {}, "Email")}</TableHead>
        <TableHead>{t('user.role', {}, "Vai trò")}</TableHead>
        <TableHead>{t('user.status', {}, "Trạng thái")}</TableHead>
        <TableHead class="text-right">{t('common.actions', {}, "Thao tác")}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#each users.data as user (user.id)}
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
                  {t('user.edit_role', {}, "Sửa vai trò")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onclick={() => { onDeleteUser(user) }}
                >
                  {t('user.remove_from_org', {}, "Xóa khỏi tổ chức")}
                </Button>
              {/if}
            {:else}
              <Link href={`/users/${user.id}/edit`}>
                <Button variant="outline" size="sm" class="mr-2">
                  {t('user.my_account', {}, "Tài khoản của tôi")}
                </Button>
              </Link>
            {/if}
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</div>

{#if users.meta.last_page > 1}
  <div class="mt-4">
    <Pagination
      currentPage={users.meta.current_page}
      totalPages={users.meta.last_page}
      baseUrl="/users"
      queryParams={filters}
    />
  </div>
{/if}

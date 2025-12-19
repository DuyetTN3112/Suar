<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Table from '@/apps/user/shared/ui/table.svelte'
  import TableBody from '@/apps/user/shared/ui/table_body.svelte'
  import TableCell from '@/apps/user/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/user/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/user/shared/ui/table_header.svelte'
  import TableRow from '@/apps/user/shared/ui/table_row.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import { createPendingApproval } from '../hooks/use_pending_approval.svelte'
  import type { UserDirectoryRecord } from '../types'

  interface Props {
    users: UserDirectoryRecord[]
    pagination: OffsetPagePagination
    filters: {
      search?: string
      status?: string
    }
  }

  const { users, pagination, filters }: Props = $props()
  const { isSubmitting, getUserDisplayName, approveUser } = createPendingApproval(() => users)
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const createdAtFormatter = $derived(new Intl.DateTimeFormat(documentLocale, { dateStyle: 'medium' }))

  function formatCreatedAt(value?: string | null): string {
    if (!value) return t('common.unknown_time', {}, 'Unknown time')

    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? t('common.invalid_date', {}, 'Invalid date')
      : createdAtFormatter.format(date)
  }
</script>

<div class="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>{t('user.name', {}, 'Name')}</TableHead>
        <TableHead>{t('user.email', {}, 'Email')}</TableHead>
        <TableHead>{t('user.created_at', {}, 'Created at')}</TableHead>
        <TableHead class="text-right">{t('common.actions', {}, 'Actions')}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#if users.length === 0}
        <TableRow>
          <TableCell colspan={4} class="text-center py-8">
            {t('user.no_pending_users', {}, 'No users pending approval')}
          </TableCell>
        </TableRow>
      {:else}
        {#each users as user (user.id)}
          <TableRow>
            <TableCell>{getUserDisplayName(user)}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              {formatCreatedAt(user.created_at)}
            </TableCell>
            <TableCell class="text-right">
              <Button
                onclick={() => { approveUser(user); }}
                disabled={$isSubmitting[user.id]}
              >
                {$isSubmitting[user.id]
                  ? t('common.loading', {}, 'Loading...')
                  : t('user.approve', {}, 'Approve')}
              </Button>
            </TableCell>
          </TableRow>
        {/each}
      {/if}
    </TableBody>
  </Table>
</div>

{#if true}
  <div class="mt-4">
    <UnifiedOffsetPagination
      {pagination}
      baseUrl="/users/pending-approval"
      queryParams={filters}
    />
  </div>
{/if}

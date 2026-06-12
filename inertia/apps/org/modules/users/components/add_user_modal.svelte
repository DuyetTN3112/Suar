<script lang="ts">
  import { LoaderCircle } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/org/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Table from '@/apps/org/shared/ui/table.svelte'
  import TableBody from '@/apps/org/shared/ui/table_body.svelte'
  import TableCell from '@/apps/org/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/org/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/org/shared/ui/table_header.svelte'
  import TableRow from '@/apps/org/shared/ui/table_row.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import type { UserDirectoryRecord } from '../types'
  import { getUserDisplayName } from '../utils/user_utils'

  interface Props {
    open: boolean
    onClose: () => void
    allSystemUsers: UserDirectoryRecord[]
    selectedUserIds: string[]
    searchUserTerm: string
    setSearchUserTerm: (value: string) => void
    isLoadingSystemUsers: boolean
    isAddingUsers: boolean
    pagination: OffsetPagePagination
    onSearch: (e: Event, searchTerm: string) => void
    onToggleUserSelection: (userId: string) => void
    onAddUsers: (userIds: string[]) => void
    onChangePage: (page: number) => void
  }

  const props: Props = $props()
  const allSystemUsers = $derived(props.allSystemUsers)
  const selectedUserIds = $derived(props.selectedUserIds)
  const searchUserTerm = $derived(props.searchUserTerm)
  const isLoadingSystemUsers = $derived(props.isLoadingSystemUsers)
  const isAddingUsers = $derived(props.isAddingUsers)
  const pagination = $derived(props.pagination)

  function handleSearchInput(event: Event) {
    const target = event.currentTarget
    if (!(target instanceof HTMLInputElement)) return
    props.setSearchUserTerm(target.value)
  }
  const { t } = useTranslation()
</script>

<Dialog bind:open={props.open} onOpenChange={props.onClose}>
  <DialogContent class="sm:max-w-200">
    <DialogHeader>
      <DialogTitle>{t('user.add_users_to_org', {}, 'Add users to organization')}</DialogTitle>
      <DialogDescription>
        {t('user.add_users_description', {}, 'Select users from the list to add to the current organization')}
      </DialogDescription>
    </DialogHeader>

      <div class="py-4">
      <form onsubmit={(event) => { props.onSearch(event, searchUserTerm) }} class="flex items-center gap-2 mb-4">
        <Input
          placeholder={t('user.search_users', {}, 'Search users...')}
          value={searchUserTerm}
          oninput={handleSearchInput}
          class="flex-1"
        />
        <Button type="submit" variant="outline">
          {t('common.search', {}, 'Search')}
        </Button>
      </form>

      <div class="border rounded-md overflow-hidden">
        {#if isLoadingSystemUsers}
          <div class="flex justify-center py-8">
            <LoaderCircle class="h-8 w-8 animate-spin text-primary" />
          </div>
        {:else if allSystemUsers.length === 0}
          <div class="text-center py-6">
            <p class="text-muted-foreground">{t('user.no_users_found', {}, 'No users found')}</p>
          </div>
        {:else}
          <div class="overflow-y-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[50px]">
                    {t('common.select', {}, 'Select')}
                  </TableHead>
                  <TableHead>{t('user.name', {}, 'Name')}</TableHead>
                  <TableHead>{t('user.email', {}, 'Email')}</TableHead>
                  <TableHead>{t('user.role', {}, 'Role')}</TableHead>
                  <TableHead>{t('user.status', {}, 'Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each allSystemUsers as user (user.id)}
                  <TableRow class={selectedUserIds.includes(user.id) ? 'bg-primary/10' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onchange={() => { props.onToggleUserSelection(user.id) }}
                        class="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                      />
                    </TableCell>
                    <TableCell>{getUserDisplayName(user)}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.system_role || ''}</TableCell>
                    <TableCell>{t(`user.status_${(user.status || '').toLowerCase()}`, {}, user.status || '')}</TableCell>
                  </TableRow>
                {/each}
              </TableBody>
            </Table>
          </div>
        {/if}
      </div>

      {#if true}
        <div class="mt-4 space-y-2">
          <p class="text-center text-sm text-muted-foreground">
            {t('common.page_of', { current: pagination.page, total: pagination.lastPage }, `Page ${pagination.page} / ${pagination.lastPage}`)}
          </p>
          <UnifiedOffsetPagination
            {pagination}
            onPageChange={props.onChangePage}
          />
        </div>
      {/if}

      <div class="mt-4">
        <p class="text-sm text-muted-foreground">
          {t('user.selected_users', { count: selectedUserIds.length }, `${selectedUserIds.length} users selected`)}
        </p>
      </div>
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onclick={props.onClose}
        disabled={isAddingUsers}
      >
        {t('common.cancel', {}, 'Cancel')}
      </Button>
      <Button
        onclick={() => { props.onAddUsers(selectedUserIds) }}
        disabled={selectedUserIds.length === 0 || isAddingUsers}
      >
        {isAddingUsers ? t('common.processing', {}, 'Processing...') : t('user.add_to_organization', {}, 'Add to organization')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

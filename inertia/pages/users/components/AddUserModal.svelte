<script lang="ts">
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Table from '@/components/ui/table.svelte'
  import TableBody from '@/components/ui/table_body.svelte'
  import TableCell from '@/components/ui/table_cell.svelte'
  import TableHead from '@/components/ui/table_head.svelte'
  import TableHeader from '@/components/ui/table_header.svelte'
  import TableRow from '@/components/ui/table_row.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { User } from '../types'
  import { getUserDisplayName } from '../utils/user_utils'

  interface Props {
    open: boolean
    onClose: () => void
    allSystemUsers: User[]
    selectedUserIds: string[]
    searchUserTerm: string
    setSearchUserTerm: (value: string) => void
    isLoadingSystemUsers: boolean
    isAddingUsers: boolean
    currentPage: number
    totalPages: number
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
  const currentPage = $derived(props.currentPage)
  const totalPages = $derived(props.totalPages)

  function handleSearchInput(event: Event) {
    const target = event.currentTarget
    if (!(target instanceof HTMLInputElement)) return
    props.setSearchUserTerm(target.value)
  }

  function handlePageChange(page: number) {
    props.onChangePage(page)
  }

  const { t } = useTranslation()
</script>

<Dialog bind:open={props.open} onOpenChange={props.onClose}>
  <DialogContent class="sm:max-w-200">
    <DialogHeader>
      <DialogTitle>{t('user.add_users_to_org', {}, "Thêm người dùng vào tổ chức")}</DialogTitle>
      <DialogDescription>
        {t('user.add_users_description', {}, "Chọn người dùng từ danh sách để thêm vào tổ chức hiện tại")}
      </DialogDescription>
    </DialogHeader>

      <div class="py-4">
      <form onsubmit={(event) => { props.onSearch(event, searchUserTerm) }} class="flex items-center gap-2 mb-4">
        <Input
          placeholder={t('user.search_users', {}, "Tìm kiếm người dùng...")}
          value={searchUserTerm}
          oninput={handleSearchInput}
          class="flex-1"
        />
        <Button type="submit" variant="outline">
          {t('common.search', {}, "Tìm kiếm")}
        </Button>
      </form>

      <div class="border rounded-md overflow-hidden">
        {#if isLoadingSystemUsers}
          <div class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        {:else if allSystemUsers.length === 0}
          <div class="text-center py-6">
            <p class="text-gray-500">{t('user.no_users_found', {}, "Không tìm thấy người dùng nào")}</p>
          </div>
        {:else}
          <div class="overflow-y-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[50px]">
                    {t('common.select', {}, "Chọn")}
                  </TableHead>
                  <TableHead>{t('user.name', {}, "Tên")}</TableHead>
                  <TableHead>{t('user.email', {}, "Email")}</TableHead>
                  <TableHead>{t('user.role', {}, "Vai trò")}</TableHead>
                  <TableHead>{t('user.status', {}, "Trạng thái")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {#each allSystemUsers as user (user.id)}
                  <TableRow class={selectedUserIds.includes(user.id) ? "bg-blue-50" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onchange={() => { props.onToggleUserSelection(user.id) }}
                        class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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

      {#if totalPages > 1}
        <div class="flex justify-center mt-4">
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onclick={() => { handlePageChange(Math.max(1, currentPage - 1)) }}
              disabled={currentPage === 1}
            >
              {t('common.previous', {}, "Trước")}
            </Button>
            <span class="text-sm">
              {t('common.page_of', { current: currentPage, total: totalPages }, `Trang ${currentPage} / ${totalPages}`)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onclick={() => { handlePageChange(Math.min(totalPages, currentPage + 1)) }}
              disabled={currentPage === totalPages}
            >
              {t('common.next', {}, "Sau")}
            </Button>
          </div>
        </div>
      {/if}

      <div class="mt-4">
        <p class="text-sm text-gray-500">
          {t('user.selected_users', { count: selectedUserIds.length }, `Đã chọn ${selectedUserIds.length} người dùng`)}
        </p>
      </div>
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onclick={props.onClose}
        disabled={isAddingUsers}
      >
        {t('common.cancel', {}, "Hủy")}
      </Button>
      <Button
        onclick={() => { props.onAddUsers(selectedUserIds) }}
        disabled={selectedUserIds.length === 0 || isAddingUsers}
      >
        {isAddingUsers ? t('common.processing', {}, 'Đang xử lý...') : t('user.add_to_organization', {}, 'Thêm vào tổ chức')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<script lang="ts">
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import Button from '@/components/ui/button.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { User } from '../types'
  import { getUserDisplayName } from '../utils/user_utils'

  interface Props {
    open: boolean
    onClose: () => void
    selectedUser: User | null
    selectedRoleId: string
    setSelectedRoleId: (value: string) => void
    isSubmitting: boolean
    onSubmit: (e: Event) => void
  }

  export let open = false
  export let onClose: Props['onClose']
  export let selectedUser: Props['selectedUser']
  export let selectedRoleId: Props['selectedRoleId']
  export let setSelectedRoleId: Props['setSelectedRoleId']
  export let isSubmitting: Props['isSubmitting']
  export let onSubmit: Props['onSubmit']

  const { t } = useTranslation()

  function getRoleLabel(role: string) {
    switch (role) {
      case 'org_owner':
        return t('organization.role_owner', {}, 'Owner')
      case 'org_admin':
        return t('organization.role_admin', {}, 'Admin')
      case 'org_member':
        return t('organization.role_member', {}, 'Member')
      default:
        return t('user.select_role', {}, 'Chọn vai trò')
    }
  }
</script>

<Dialog bind:open onOpenChange={onClose}>
  <DialogContent class="sm:max-w-106.25">
    <DialogHeader>
      <DialogTitle>{t('user.edit_permissions', {}, "Chỉnh sửa quyền hạn trong tổ chức")}</DialogTitle>
      <DialogDescription>
        {#if selectedUser}
          {t('user.change_role_for', { name: getUserDisplayName(selectedUser) }, `Thay đổi vai trò của ${getUserDisplayName(selectedUser)} trong tổ chức hiện tại`)}
        {/if}
      </DialogDescription>
    </DialogHeader>
    <form onsubmit={onSubmit}>
      <div class="grid gap-4 py-4">
        <div class="flex flex-col gap-2">
          <label for="role" class="font-medium">
            {t('user.role_in_org', {}, "Vai trò trong tổ chức")}
          </label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId} required>
            <SelectTrigger>
              <span>{getRoleLabel(selectedRoleId)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="org_owner">{t('organization.role_owner', {}, "Owner")}</SelectItem>
              <SelectItem value="org_admin">{t('organization.role_admin', {}, "Admin")}</SelectItem>
              <SelectItem value="org_member">{t('organization.role_member', {}, "Member")}</SelectItem>
            </SelectContent>
          </Select>
          <p class="text-sm text-gray-500 mt-1">
            {t('user.role_description', {}, "Vai trò quyết định các quyền mà người dùng có trong tổ chức.")}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onclick={onClose}
          disabled={isSubmitting}
        >
          {t('common.cancel', {}, "Hủy")}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.processing', {}, 'Đang xử lý...') : t('common.save', {}, 'Lưu thay đổi')}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

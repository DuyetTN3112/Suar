<script lang="ts">
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/org/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import type { UserDirectoryRecord } from '../types'
  import { getUserDisplayName } from '../utils/user_utils'

  interface Props {
    open: boolean
    onClose: () => void
    selectedUser: UserDirectoryRecord | null
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
        return t('user.select_role', {}, 'Select role')
    }
  }
</script>

<Dialog bind:open onOpenChange={onClose}>
  <DialogContent class="sm:max-w-106.25">
    <DialogHeader>
      <DialogTitle>{t('user.edit_permissions', {}, 'Edit permissions in organization')}</DialogTitle>
      <DialogDescription>
        {#if selectedUser}
          {t('user.change_role_for', { name: getUserDisplayName(selectedUser) }, `Change role for ${getUserDisplayName(selectedUser)} in current organization`)}
        {/if}
      </DialogDescription>
    </DialogHeader>
    <form onsubmit={onSubmit}>
      <div class="grid gap-4 py-4">
        <div class="flex flex-col gap-2">
          <label for="role" class="font-medium">
            {t('user.role_in_org', {}, 'Role in organization')}
          </label>
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId} required>
            <SelectTrigger>
              <span>{getRoleLabel(selectedRoleId)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="org_owner">{t('organization.role_owner', {}, 'Owner')}</SelectItem>
              <SelectItem value="org_admin">{t('organization.role_admin', {}, 'Admin')}</SelectItem>
              <SelectItem value="org_member">{t('organization.role_member', {}, 'Member')}</SelectItem>
            </SelectContent>
          </Select>
          <p class="mt-1 text-sm text-muted-foreground">
            {t('user.role_description', {}, 'The role determines what permissions the user has in the organization.')}
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
          {t('common.cancel', {}, 'Cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('common.processing', {}, 'Processing...') : t('common.save', {}, 'Save')}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

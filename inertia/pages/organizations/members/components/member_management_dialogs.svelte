<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'

  interface RoleOption {
    value: string
    label: string
  }

  interface Props {
    organizationName: string
    roles: RoleOption[]

    showAddMemberDialog: boolean
    addMemberForm: {
      email: string
      roleId: string
    }
    addMemberErrors: {
      email?: string
      roleId?: string
    }
    addMemberProcessing: boolean
    onAddMemberSubmit: (event: Event) => void
    onAddMemberFormEmailChange: (value: string) => void
    onAddMemberFormRoleChange: (value: string) => void
    onShowAddMemberDialogChange: (open: boolean) => void

    showInviteDialog: boolean
    inviteUserForm: {
      email: string
      roleId: string
    }
    inviteUserErrors: {
      email?: string
      roleId?: string
    }
    inviteUserProcessing: boolean
    onInviteUserSubmit: (event: Event) => void
    onInviteUserFormEmailChange: (value: string) => void
    onInviteUserFormRoleChange: (value: string) => void
    onShowInviteDialogChange: (open: boolean) => void
  }

  const {
    organizationName,
    roles,
    showAddMemberDialog,
    addMemberForm,
    addMemberErrors,
    addMemberProcessing,
    onAddMemberSubmit,
    onAddMemberFormEmailChange,
    onAddMemberFormRoleChange,
    onShowAddMemberDialogChange,
    showInviteDialog,
    inviteUserForm,
    inviteUserErrors,
    inviteUserProcessing,
    onInviteUserSubmit,
    onInviteUserFormEmailChange,
    onInviteUserFormRoleChange,
    onShowInviteDialogChange,
  }: Props = $props()
</script>

<Dialog open={showAddMemberDialog} onOpenChange={onShowAddMemberDialogChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Them thanh vien moi</DialogTitle>
      <DialogDescription>
        Them thanh vien vao to chuc {organizationName}
      </DialogDescription>
    </DialogHeader>
    <form onsubmit={onAddMemberSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label for="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Email nguoi dung can them"
          value={addMemberForm.email}
          oninput={(event: Event) => {
            onAddMemberFormEmailChange((event.currentTarget as HTMLInputElement).value)
          }}
          required
        />
        {#if addMemberErrors.email}
          <div class="text-red-500 text-sm">{addMemberErrors.email}</div>
        {/if}
      </div>

      <div class="space-y-2">
        <Label for="roleId">Vai tro</Label>
        <Select
          value={addMemberForm.roleId}
          onValueChange={(value: string) => { onAddMemberFormRoleChange(value) }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chon vai tro" />
          </SelectTrigger>
          <SelectContent>
            {#each roles as role (role.value)}
              <SelectItem value={role.value}>
                {role.label}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
        {#if addMemberErrors.roleId}
          <div class="text-red-500 text-sm">{addMemberErrors.roleId}</div>
        {/if}
      </div>

      <Button type="submit" disabled={addMemberProcessing} class="w-full">
        Them thanh vien
      </Button>
    </form>
  </DialogContent>
</Dialog>

<Dialog open={showInviteDialog} onOpenChange={onShowInviteDialogChange}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Moi nguoi dung</DialogTitle>
      <DialogDescription>
        Gui loi moi tham gia to chuc {organizationName}
      </DialogDescription>
    </DialogHeader>
    <form onsubmit={onInviteUserSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label for="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="Email nguoi dung can moi"
          value={inviteUserForm.email}
          oninput={(event: Event) => {
            onInviteUserFormEmailChange((event.currentTarget as HTMLInputElement).value)
          }}
          required
        />
        {#if inviteUserErrors.email}
          <div class="text-red-500 text-sm">{inviteUserErrors.email}</div>
        {/if}
      </div>

      <div class="space-y-2">
        <Label for="invite-roleId">Vai tro</Label>
        <Select
          value={inviteUserForm.roleId}
          onValueChange={(value: string) => { onInviteUserFormRoleChange(value) }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chon vai tro" />
          </SelectTrigger>
          <SelectContent>
            {#each roles as role (role.value)}
              <SelectItem value={role.value}>
                {role.label}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
        {#if inviteUserErrors.roleId}
          <div class="text-red-500 text-sm">{inviteUserErrors.roleId}</div>
        {/if}
      </div>

      <Button type="submit" disabled={inviteUserProcessing} class="w-full">
        Gui loi moi
      </Button>
    </form>
  </DialogContent>
</Dialog>

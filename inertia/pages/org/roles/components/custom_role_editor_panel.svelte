<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Checkbox from '@/components/ui/checkbox.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import { formatRoleLabel } from '@/lib/access_ui'
  import type { CustomRoleDraft } from '../roles_helpers'

  interface PermissionItem {
    key: string
    label: string
    description: string
  }

  interface PermissionGroup {
    category: string
    items: PermissionItem[]
  }

  interface Props {
    customRoles: CustomRoleDraft[]
    selectedRoleName: string
    selectedRole: CustomRoleDraft | null
    permissionGroups: PermissionGroup[]
    isSaving: boolean
    errorMessage: string
    successMessage: string
    onSelectRole: (roleName: string) => void
    onRemoveSelectedRole: () => void
    onSaveRoles: () => void
    onUpdateSelectedRole: (partial: Partial<CustomRoleDraft>) => void
    onTogglePermission: (permissionKey: string, checked: boolean) => void
  }

  const {
    customRoles,
    selectedRoleName,
    selectedRole,
    permissionGroups,
    isSaving,
    errorMessage,
    successMessage,
    onSelectRole,
    onRemoveSelectedRole,
    onSaveRoles,
    onUpdateSelectedRole,
    onTogglePermission,
  }: Props = $props()
</script>

<Card>
  <CardHeader>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <CardTitle>Custom role editor</CardTitle>
        <CardDescription>
          Chọn một role để chỉnh tên, mô tả và tập quyền. Sau khi lưu, màn thành viên và lời mời sẽ dùng được ngay.
        </CardDescription>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" disabled={!selectedRole} onclick={onRemoveSelectedRole}>
          Xóa role
        </Button>
        <Button disabled={isSaving} onclick={onSaveRoles}>
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>
    </div>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="flex flex-wrap gap-2">
      {#if customRoles.length === 0}
        <p class="text-sm text-muted-foreground">Chưa có custom role nào. Hãy thêm mới hoặc áp preset.</p>
      {:else}
        {#each customRoles as role}
          <button
            type="button"
            class={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
              selectedRoleName === role.name
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted/30'
            }`}
            onclick={() => {
              onSelectRole(role.name)
            }}
          >
            {formatRoleLabel(role.name)}
          </button>
        {/each}
      {/if}
    </div>

    {#if selectedRole}
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="selected_role_name">Role code</Label>
          <Input
            id="selected_role_name"
            value={selectedRole.name}
            oninput={(event: Event) => {
              onUpdateSelectedRole({
                name: (event.currentTarget as HTMLInputElement).value,
              })
            }}
          />
        </div>
        <div class="space-y-2">
          <Label>Label preview</Label>
          <div class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-semibold">
            {formatRoleLabel(selectedRole.name)}
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <Label for="selected_role_description">Mô tả</Label>
        <Textarea
          id="selected_role_description"
          value={selectedRole.description}
          rows={3}
          oninput={(event: Event) => {
            onUpdateSelectedRole({
              description: (event.currentTarget as HTMLTextAreaElement).value,
            })
          }}
        />
      </div>

      <div class="space-y-4">
        <div>
          <p class="text-sm font-semibold">Permission catalog</p>
          <p class="text-sm text-muted-foreground">
            Chọn chính xác các quyền cần cấp cho vai trò này.
          </p>
        </div>

        {#each permissionGroups as group}
          <div class="rounded-xl border border-border p-4">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-bold">{group.category}</h3>
              <Badge variant="outline">{group.items.length} quyền</Badge>
            </div>
            <div class="mt-4 grid gap-3 md:grid-cols-2">
              {#each group.items as permission}
                <label class="flex items-start gap-3 rounded-lg border border-border p-3 transition hover:bg-muted/20">
                  <Checkbox
                    checked={selectedRole.permissions.includes(permission.key)}
                    onCheckedChange={(checked) => {
                      onTogglePermission(permission.key, checked === true)
                    }}
                  />
                  <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium">{permission.label}</span>
                      <Badge variant="outline">{permission.key}</Badge>
                    </div>
                    <p class="text-xs text-muted-foreground">{permission.description}</p>
                  </div>
                </label>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if errorMessage}
      <p class="text-sm text-destructive">{errorMessage}</p>
    {/if}
    {#if successMessage}
      <p class="text-sm text-emerald-700">{successMessage}</p>
    {/if}
  </CardContent>
</Card>

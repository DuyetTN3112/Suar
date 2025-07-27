<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import { formatRoleLabel } from '@/lib/access_ui'

  import type { RolePreset } from '../roles_helpers'

  interface Props {
    rolePresets: RolePreset[]
    newRoleName: string
    newRoleDescription: string
    onApplyPreset: (preset: RolePreset) => void
    onCreateRole: (name: string, description: string) => void
    onNewRoleNameChange: (value: string) => void
    onNewRoleDescriptionChange: (value: string) => void
  }

  const {
    rolePresets,
    newRoleName,
    newRoleDescription,
    onApplyPreset,
    onCreateRole,
    onNewRoleNameChange,
    onNewRoleDescriptionChange,
  }: Props = $props()
</script>

<div class="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>Preset role</CardTitle>
      <CardDescription>Thêm nhanh các vai trò phổ biến cho mô hình owner org, HR, CTO, PM.</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-3 md:grid-cols-2">
      {#each rolePresets as preset}
        <button
          type="button"
          class="rounded-xl border border-border p-4 text-left transition hover:bg-muted/30"
          onclick={() => {
            onApplyPreset(preset)
          }}
        >
          <div class="flex items-center justify-between gap-2">
            <p class="font-bold">{formatRoleLabel(preset.name)}</p>
            <Badge variant="outline">{preset.permissions.length} quyền</Badge>
          </div>
          <p class="mt-2 text-sm text-muted-foreground">{preset.description ?? 'Preset vai trò'}</p>
        </button>
      {/each}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Tạo role mới</CardTitle>
      <CardDescription>Tên role sẽ được chuẩn hóa thành `snake_case` để đồng bộ với backend.</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4 md:grid-cols-[0.8fr_1.2fr_auto] md:items-end">
      <div class="space-y-2">
        <Label for="new_role_name">Tên vai trò</Label>
        <Input
          id="new_role_name"
          value={newRoleName}
          placeholder="project_manager"
          oninput={(event: Event) => {
            onNewRoleNameChange((event.currentTarget as HTMLInputElement).value)
          }}
        />
      </div>
      <div class="space-y-2">
        <Label for="new_role_description">Mô tả</Label>
        <Input
          id="new_role_description"
          value={newRoleDescription}
          placeholder="Điều phối danh mục dự án và nhịp bàn giao"
          oninput={(event: Event) => {
            onNewRoleDescriptionChange((event.currentTarget as HTMLInputElement).value)
          }}
        />
      </div>
      <Button
        onclick={() => {
          onCreateRole(newRoleName, newRoleDescription)
        }}
      >
        Thêm role
      </Button>
    </CardContent>
  </Card>
</div>

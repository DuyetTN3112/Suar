<script lang="ts">
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
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
  import { formatRoleLabel, groupByCategory, normalizeRoleCode } from '@/lib/access_ui'

  interface PermissionPresentation {
    key: string
    label: string
    description: string
    category: string
  }

  interface RoleEntry {
    code: string
    label: string
    description: string
    permissions: PermissionPresentation[]
    permissionCount: number
    isBuiltIn: boolean
    memberCount: number
  }

  interface RolePreset {
    name: string
    description?: string
    permissions: string[]
  }

  interface Props {
    organization: {
      id: string
      name: string
      slug: string
      description: string | null
    }
    summary: {
      approvedMembers: number
      pendingInvitations: number
      builtInRoleCount: number
      customRoleCount: number
    }
    organizationRoles: RoleEntry[]
    permissionCatalog: PermissionPresentation[]
    rolePresets: RolePreset[]
  }

  interface CustomRoleDraft {
    name: string
    description: string
    permissions: string[]
  }

  const { organization, summary, organizationRoles, permissionCatalog, rolePresets }: Props = $props()

  const builtInRoles = $derived(organizationRoles.filter((role) => role.isBuiltIn))
  const builtInRoleCodes = $derived(new Set(builtInRoles.map((role) => role.code)))
  const permissionGroups = $derived(groupByCategory(permissionCatalog))

  let customRoles = $state<CustomRoleDraft[]>([])
  let selectedRoleName = $state('')
  let newRoleName = $state('')
  let newRoleDescription = $state('')
  let isSaving = $state(false)
  let errorMessage = $state('')
  let successMessage = $state('')

  const selectedRole = $derived(customRoles.find((role) => role.name === selectedRoleName) ?? null)

  $effect(() => {
    if (customRoles.length > 0) {
      return
    }

    const seededRoles = organizationRoles
      .filter((role) => !role.isBuiltIn)
      .map((role) => ({
        name: role.code,
        description: role.description,
        permissions: role.permissions.map((permission) => permission.key),
      }))

    if (seededRoles.length === 0) {
      return
    }

    customRoles = seededRoles
    selectedRoleName = seededRoles[0]?.name ?? ''
  })

  function getCsrfToken(): string {
    return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  function ensureSelectedRole() {
    if (selectedRoleName && customRoles.some((role) => role.name === selectedRoleName)) {
      return
    }

    selectedRoleName = customRoles[0]?.name ?? ''
  }

  function addRole(name: string, description: string, permissions: string[] = []) {
    const normalizedName = normalizeRoleCode(name)

    if (!normalizedName) {
      errorMessage = 'Tên vai trò không hợp lệ.'
      return
    }

    if (builtInRoleCodes.has(normalizedName)) {
      errorMessage = 'Vai trò này đã là built-in của hệ thống.'
      return
    }

    if (customRoles.some((role) => role.name === normalizedName)) {
      errorMessage = 'Vai trò tùy chỉnh đã tồn tại.'
      return
    }

    customRoles = [
      ...customRoles,
      {
        name: normalizedName,
        description: description.trim(),
        permissions: [...new Set(permissions)].sort(),
      },
    ]
    selectedRoleName = normalizedName
    newRoleName = ''
    newRoleDescription = ''
    successMessage = ''
    errorMessage = ''
  }

  function applyPreset(preset: RolePreset) {
    if (customRoles.some((role) => role.name === preset.name)) {
      selectedRoleName = preset.name
      errorMessage = 'Preset này đã có trong organization.'
      return
    }

    addRole(preset.name, preset.description ?? '', preset.permissions)
  }

  function updateSelectedRole(partial: Partial<CustomRoleDraft>) {
    if (!selectedRole) {
      return
    }

    const nextName = partial.name ? normalizeRoleCode(partial.name) : selectedRole.name
    if (!nextName) {
      errorMessage = 'Tên vai trò không được để trống.'
      return
    }

    if (builtInRoleCodes.has(nextName)) {
      errorMessage = 'Không thể đổi thành tên trùng role built-in.'
      return
    }

    if (
      nextName !== selectedRole.name &&
      customRoles.some((role) => role.name === nextName)
    ) {
      errorMessage = 'Tên vai trò đã tồn tại.'
      return
    }

    customRoles = customRoles.map((role) => {
      if (role.name !== selectedRole.name) {
        return role
      }

      return {
        name: nextName,
        description: partial.description ?? role.description,
        permissions: partial.permissions ?? role.permissions,
      }
    })

    selectedRoleName = nextName
    successMessage = ''
    errorMessage = ''
  }

  function togglePermission(permissionKey: string, checked: boolean) {
    if (!selectedRole) {
      return
    }

    const permissionSet = new Set(selectedRole.permissions)
    if (checked) {
      permissionSet.add(permissionKey)
    } else {
      permissionSet.delete(permissionKey)
    }

    updateSelectedRole({ permissions: [...permissionSet].sort() })
  }

  function removeSelectedRole() {
    if (!selectedRole) {
      return
    }

    customRoles = customRoles.filter((role) => role.name !== selectedRole.name)
    ensureSelectedRole()
    successMessage = ''
    errorMessage = ''
  }

  async function saveRoles() {
    isSaving = true
    errorMessage = ''
    successMessage = ''

    try {
      const response = await fetch('/org/roles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          custom_roles: customRoles.map((role) => ({
            name: normalizeRoleCode(role.name),
            description: role.description.trim(),
            permissions: [...new Set(role.permissions)].sort(),
          })),
        }),
      })

      const payload = (await response.json()) as {
        success?: boolean
        message?: string
      }

      if (!response.ok || !payload.success) {
        errorMessage = payload.message || 'Không thể cập nhật vai trò.'
        return
      }

      successMessage = payload.message || 'Đã cập nhật vai trò tùy chỉnh.'
    } catch (error) {
      console.error('Failed to save custom roles', error)
      errorMessage = 'Không thể cập nhật vai trò.'
    } finally {
      isSaving = false
    }
  }
</script>

<OrganizationLayout title="Vai trò tổ chức">
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="neo-kicker">Organization / Roles</p>
        <h1 class="text-4xl font-bold tracking-tight">Vai trò tổ chức</h1>
        <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
          Tạo các role như HR, CTO, Project Manager, PM và gắn permission thực tế cho từng vai trò trong organization hiện tại.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a href="/org/members" class="neo-surface-soft px-3 py-2 text-sm font-bold">Thành viên</a>
        <a href="/org/permissions" class="neo-surface-soft px-3 py-2 text-sm font-bold">Quyền hạn</a>
        <a href="/org/departments" class="neo-surface-soft px-3 py-2 text-sm font-bold">Phòng ban</a>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-xl font-bold">{organization.name}</div>
          <p class="mt-1 text-xs text-muted-foreground">{organization.slug}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Thành viên duyệt</CardTitle>
        </CardHeader>
        <CardContent><div class="text-3xl font-bold">{summary.approvedMembers}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Built-in roles</CardTitle>
        </CardHeader>
        <CardContent><div class="text-3xl font-bold">{summary.builtInRoleCount}</div></CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-sm font-medium">Custom roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-3xl font-bold">{customRoles.length}</div>
          <p class="mt-1 text-xs text-muted-foreground">{summary.pendingInvitations} lời mời đang chờ</p>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Vai trò hệ thống sẵn có</CardTitle>
          <CardDescription>Built-in role là read-only, dùng để làm baseline trước khi tạo role riêng.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          {#each builtInRoles as role}
            <div class="rounded-xl border border-border p-4">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-bold">{role.label}</p>
                    <Badge variant="secondary">{role.memberCount} member</Badge>
                  </div>
                  <p class="mt-1 text-sm text-muted-foreground">{role.description}</p>
                </div>
                <Badge variant="outline">{role.permissionCount} quyền</Badge>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                {#each role.permissions as permission}
                  <Badge variant="outline">{permission.label}</Badge>
                {/each}
              </div>
            </div>
          {/each}
        </CardContent>
      </Card>

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
                  applyPreset(preset)
                }}
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="font-bold">{formatRoleLabel(preset.name)}</p>
                  <Badge variant="outline">{preset.permissions.length} quyền</Badge>
                </div>
                <p class="mt-2 text-sm text-muted-foreground">{preset.description || 'Preset vai trò'}</p>
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
              <Input id="new_role_name" bind:value={newRoleName} placeholder="project_manager" />
            </div>
            <div class="space-y-2">
              <Label for="new_role_description">Mô tả</Label>
              <Input
                id="new_role_description"
                bind:value={newRoleDescription}
                placeholder="Điều phối danh mục dự án và nhịp bàn giao"
              />
            </div>
            <Button
              onclick={() => {
                addRole(newRoleName, newRoleDescription)
              }}
            >
              Thêm role
            </Button>
          </CardContent>
        </Card>

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
                <Button variant="outline" disabled={!selectedRole} onclick={removeSelectedRole}>
                  Xóa role
                </Button>
                <Button disabled={isSaving} onclick={() => { void saveRoles() }}>
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
                      selectedRoleName = role.name
                      errorMessage = ''
                      successMessage = ''
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
                      updateSelectedRole({
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
                    updateSelectedRole({
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
                              togglePermission(permission.key, checked === true)
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
      </div>
    </div>
  </div>
</OrganizationLayout>

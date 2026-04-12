<script lang="ts">
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { groupByCategory, normalizeRoleCode } from '@/lib/access_ui'

  import BuiltInRolesPanel from './components/built_in_roles_panel.svelte'
  import CustomRoleEditorPanel from './components/custom_role_editor_panel.svelte'
  import RolePresetCreatePanel from './components/role_preset_create_panel.svelte'
  import RoleSummaryCards from './components/role_summary_cards.svelte'
  import RolesPageHeader from './components/roles_page_header.svelte'
  import RolesQuickLinks from './components/roles_quick_links.svelte'
  import {
    saveOrganizationRoles,
    type CustomRoleDraft,
    type OrganizationRolesPageProps,
    type RolePreset,
  } from './roles_helpers'

  const { organization, summary, organizationRoles, permissionCatalog, rolePresets }: OrganizationRolesPageProps = $props()

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
      successMessage = await saveOrganizationRoles(customRoles)
    } catch (error) {
      console.error('Failed to save custom roles', error)
      errorMessage = error instanceof Error ? error.message : 'Không thể cập nhật vai trò.'
    } finally {
      isSaving = false
    }
  }
</script>

<OrganizationLayout title="Vai trò tổ chức">
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <RolesPageHeader />
      <RolesQuickLinks />
    </div>

    <RoleSummaryCards organization={organization} summary={summary} customRoleCount={customRoles.length} />

    <div class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <BuiltInRolesPanel {builtInRoles} />

      <div class="space-y-4">
        <RolePresetCreatePanel
          {rolePresets}
          {newRoleName}
          {newRoleDescription}
          onApplyPreset={applyPreset}
          onCreateRole={addRole}
          onNewRoleNameChange={(value: string) => {
            newRoleName = value
          }}
          onNewRoleDescriptionChange={(value: string) => {
            newRoleDescription = value
          }}
        />

        <CustomRoleEditorPanel
          {customRoles}
          {selectedRoleName}
          {selectedRole}
          {permissionGroups}
          {isSaving}
          {errorMessage}
          {successMessage}
          onSelectRole={(roleName: string) => {
            selectedRoleName = roleName
            errorMessage = ''
            successMessage = ''
          }}
          onRemoveSelectedRole={removeSelectedRole}
          onSaveRoles={() => {
            void saveRoles()
          }}
          onUpdateSelectedRole={updateSelectedRole}
          onTogglePermission={togglePermission}
        />
      </div>
    </div>
  </div>
</OrganizationLayout>

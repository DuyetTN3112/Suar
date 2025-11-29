<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'

  interface Permission {
    key: string
    label: string
    description: string
  }

  interface RoleEntry {
    code: string
    label: string
    description: string
    permissions: Permission[]
    permissionCount: number
    isBuiltIn: boolean
    memberCount: number
  }

  interface Props {
    organizationRoles: RoleEntry[]
    projectRoles: RoleEntry[]
    summary: {
      builtInRoleCount: number
      customRoleCount: number
    }
  }

  const { organizationRoles, projectRoles, summary }: Props = $props()

  type RoleForm = {
    name: string
    description: string
    permissions: string[]
  }

  let editingRoleCode = $state<string | null>(null)
  let form = $state<RoleForm>({
    name: '',
    description: '',
    permissions: [],
  })

  const customRoles = $derived(organizationRoles.filter((role) => !role.isBuiltIn))
  const permissionOptions = $derived.by(() => {
    const permissions = new Map<string, Permission>()
    for (const role of organizationRoles) {
      for (const permission of role.permissions) {
        permissions.set(permission.key, permission)
      }
    }
    return [...permissions.values()]
  })

  function roleToPayload(role: RoleEntry) {
    return {
      name: role.code,
      description: role.description,
      permissions: role.permissions.map((permission) => permission.key),
    }
  }

  function normalizeRoleCode(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  function openCreateForm() {
    editingRoleCode = ''
    form = {
      name: '',
      description: '',
      permissions: [],
    }
  }

  function openEditForm(role: RoleEntry) {
    if (role.isBuiltIn) return
    editingRoleCode = role.code
    form = {
      name: role.code,
      description: role.description,
      permissions: role.permissions.map((permission) => permission.key),
    }
  }

  function closeForm() {
    editingRoleCode = null
  }

  function togglePermission(permissionKey: string) {
    form = {
      ...form,
      permissions: form.permissions.includes(permissionKey)
        ? form.permissions.filter((key) => key !== permissionKey)
        : [...form.permissions, permissionKey],
    }
  }

  function saveRoles(nextRoles: RoleForm[]) {
    router.put(
      '/org/roles',
      {
        custom_roles: nextRoles.map((role) => ({
          name: normalizeRoleCode(role.name),
          description: role.description.trim(),
          permissions: role.permissions,
        })),
      },
      {
        preserveScroll: true,
      }
    )
  }

  function submitRole() {
    const normalizedName = normalizeRoleCode(form.name)
    if (!normalizedName || form.permissions.length === 0) return

    const existingRoles = customRoles.map(roleToPayload)
    const nextRole = {
      name: normalizedName,
      description: form.description,
      permissions: form.permissions,
    }

    const nextRoles =
      editingRoleCode === ''
        ? [...existingRoles, nextRole]
        : existingRoles.map((role) => (role.name === editingRoleCode ? nextRole : role))

    saveRoles(nextRoles)
  }

  function deleteRole(role: RoleEntry) {
    if (role.isBuiltIn) return
    saveRoles(customRoles.filter((customRole) => customRole.code !== role.code).map(roleToPayload))
  }
</script>

<svelte:head>
  <title>Vai tro</title>
</svelte:head>

<OrganizationLayout title="Vai tro">
  <div class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Cau truc to chuc</p>
        <h1 class="mt-1 text-3xl font-black text-foreground">Vai tro</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          {summary.builtInRoleCount} vai tro mac dinh va {summary.customRoleCount} vai tro tuy bien.
        </p>
      </div>
      <Button type="button" onclick={openCreateForm}>Them vai tro</Button>
    </header>

    {#if editingRoleCode !== null}
      <section class="rounded-lg border border-border bg-card p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-foreground">
              {editingRoleCode === '' ? 'Them vai tro tuy bien' : `Sua ${form.name.toUpperCase()}`}
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Vai tro tuy bien luu trong cau hinh organization va duoc gan cho thanh vien.
            </p>
          </div>
          <Button type="button" variant="outline" onclick={closeForm}>Huy</Button>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label for="role-name">Ma vai tro</Label>
            <Input id="role-name" bind:value={form.name} placeholder="vd: hr, cto, pm" />
          </div>
          <div class="space-y-2">
            <Label for="role-description">Mo ta vai tro</Label>
            <Textarea
              id="role-description"
              bind:value={form.description}
              placeholder="Mo ta pham vi va trach nhiem"
            />
          </div>
        </div>

        <div class="mt-5 space-y-3">
          <p class="text-sm font-bold text-foreground">Quyen han</p>
          <div class="grid gap-3 md:grid-cols-2">
            {#each permissionOptions as permission (permission.key)}
              <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3">
                <input
                  type="checkbox"
                  class="mt-1 h-4 w-4"
                  checked={form.permissions.includes(permission.key)}
                  onchange={() => togglePermission(permission.key)}
                />
                <span>
                  <span class="block text-sm font-semibold text-foreground">{permission.label}</span>
                  <span class="block text-xs text-muted-foreground">{permission.description}</span>
                </span>
              </label>
            {/each}
          </div>
        </div>

        <div class="mt-5 flex justify-end">
          <Button type="button" onclick={submitRole}>Luu thay doi</Button>
        </div>
      </section>
    {/if}

    <section class="space-y-4">
      <h2 class="text-lg font-bold text-foreground">Vai tro to chuc</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        {#each organizationRoles as role (role.code)}
          <article class="rounded-lg border border-border bg-card p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-bold text-foreground">{role.label}</h3>
                <p class="mt-1 text-sm text-muted-foreground">{role.description}</p>
              </div>
              <span class="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                {role.memberCount} thanh vien
              </span>
            </div>
            <p class="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {role.permissionCount} quyen
            </p>
            {#if !role.isBuiltIn}
              <div class="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onclick={() => openEditForm(role)}>
                  Sua {role.label}
                </Button>
                <Button type="button" variant="outline" size="sm" onclick={() => deleteRole(role)}>
                  Xoa {role.label}
                </Button>
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-lg font-bold text-foreground">Vai tro du an</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        {#each projectRoles as role (role.code)}
          <article class="rounded-lg border border-border bg-card p-5">
            <h3 class="font-bold text-foreground">{role.label}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{role.description}</p>
            <p class="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {role.permissionCount} quyen
            </p>
          </article>
        {/each}
      </div>
    </section>
  </div>
</OrganizationLayout>

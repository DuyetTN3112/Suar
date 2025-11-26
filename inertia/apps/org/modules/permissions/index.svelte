<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'

  interface Permission {
    key: string
    label: string
    description: string
  }

  interface Props {
    permissionCatalog: Permission[]
    projectPermissionCatalog: Permission[]
    organizationRoles: { code: string; label: string; permissionCount: number }[]
    projectRoles: { code: string; label: string; permissionCount: number }[]
  }

  const { permissionCatalog, projectPermissionCatalog, organizationRoles, projectRoles }: Props = $props()

  function editRoles() {
    router.visit('/org/roles')
  }
</script>

<svelte:head>
  <title>Quyen han</title>
</svelte:head>

<OrganizationLayout title="Quyen han">
  <div class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Cau truc to chuc</p>
        <h1 class="mt-1 text-3xl font-black text-foreground">Quyen han</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Ma tran quyen cho {organizationRoles.length} vai tro to chuc va {projectRoles.length} vai tro du an.
        </p>
      </div>
      <Button type="button" onclick={editRoles}>Chinh sua vai tro</Button>
    </header>

    <section class="rounded-lg border border-border bg-card p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-foreground">Ma tran quyen</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Quyen duoc cap thong qua vai tro. Muon them, sua, xoa quyen cua nhom nguoi dung thi chinh sua vai tro.
          </p>
        </div>
        <span class="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground">
          {permissionCatalog.length + projectPermissionCatalog.length} ma quyen
        </span>
      </div>

      <div class="mt-4 grid gap-3 lg:grid-cols-2">
        {#each organizationRoles as role (role.code)}
          <div class="rounded-lg border border-border bg-background p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-bold text-foreground">{role.label}</p>
                <p class="mt-1 font-mono text-xs text-muted-foreground">{role.code}</p>
              </div>
              <span class="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                {role.permissionCount} quyen
              </span>
            </div>
          </div>
        {/each}

        {#each projectRoles as role (role.code)}
          <div class="rounded-lg border border-border bg-background p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-bold text-foreground">{role.label}</p>
                <p class="mt-1 font-mono text-xs text-muted-foreground">{role.code}</p>
              </div>
              <span class="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                {role.permissionCount} quyen
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-lg border border-border bg-card p-5">
        <h2 class="text-lg font-bold text-foreground">Quyen to chuc</h2>
        <div class="mt-4 space-y-3">
          {#each permissionCatalog as permission (permission.key)}
            <div class="rounded-lg border border-border bg-background p-3">
              <p class="font-mono text-xs font-bold text-foreground">{permission.key}</p>
              <p class="mt-1 text-sm font-semibold text-foreground">{permission.label}</p>
              <p class="mt-1 text-sm text-muted-foreground">{permission.description}</p>
            </div>
          {/each}
        </div>
      </article>

      <article class="rounded-lg border border-border bg-card p-5">
        <h2 class="text-lg font-bold text-foreground">Quyen du an</h2>
        <div class="mt-4 space-y-3">
          {#each projectPermissionCatalog as permission (permission.key)}
            <div class="rounded-lg border border-border bg-background p-3">
              <p class="font-mono text-xs font-bold text-foreground">{permission.key}</p>
              <p class="mt-1 text-sm font-semibold text-foreground">{permission.label}</p>
              <p class="mt-1 text-sm text-muted-foreground">{permission.description}</p>
            </div>
          {/each}
        </div>
      </article>
    </section>
  </div>
</OrganizationLayout>

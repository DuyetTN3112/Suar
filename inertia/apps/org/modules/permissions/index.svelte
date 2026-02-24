<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
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
  const { t } = useTranslation()

  function editRoles() {
    router.visit('/org/roles')
  }
</script>

<svelte:head>
  <title>{t('workspace.permissions.page_title', {}, 'Permissions')}</title>
</svelte:head>

<OrganizationLayout title={t('workspace.permissions.page_title', {}, 'Permissions')}>
  <div class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {t('workspace.permissions.eyebrow', {}, 'Organization structure')}
        </p>
        <h1 class="mt-1 text-3xl font-black text-foreground">
          {t('workspace.permissions.title', {}, 'Permissions')}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          {t(
            'workspace.permissions.summary',
            { organizationRoles: organizationRoles.length, projectRoles: projectRoles.length },
            'Permission matrix for :organizationRoles organization roles and :projectRoles project roles.'
          )}
        </p>
      </div>
      <Button type="button" onclick={editRoles}>
        {t('workspace.permissions.edit_roles', {}, 'Edit roles')}
      </Button>
    </header>

    <section class="rounded-lg border border-border bg-card p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-foreground">
            {t('workspace.permissions.matrix_title', {}, 'Permission matrix')}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {t(
              'workspace.permissions.matrix_description',
              {},
              'Permissions are granted through roles. Edit a role to change access for a user group.'
            )}
          </p>
        </div>
        <span class="rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground">
          {t(
            'workspace.permissions.permission_codes',
            { count: permissionCatalog.length + projectPermissionCatalog.length },
            ':count permission codes'
          )}
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
                {t(
                  'workspace.permissions.permission_count',
                  { count: role.permissionCount },
                  ':count permissions'
                )}
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
                {t(
                  'workspace.permissions.permission_count',
                  { count: role.permissionCount },
                  ':count permissions'
                )}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-lg border border-border bg-card p-5">
        <h2 class="text-lg font-bold text-foreground">
          {t('workspace.permissions.organization_permissions', {}, 'Organization permissions')}
        </h2>
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
        <h2 class="text-lg font-bold text-foreground">
          {t('workspace.permissions.project_permissions', {}, 'Project permissions')}
        </h2>
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

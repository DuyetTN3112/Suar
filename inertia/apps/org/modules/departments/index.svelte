<script lang="ts">
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Department {
    id: string
    name: string
    description: string
    focus: string
    suggestedRoles: string[]
    matchedRoles: string[]
    estimatedHeadcount: number
  }

  interface Props {
    organization: {
      name: string
      description: string | null
    }
    summary: {
      approvedMembers: number
      builtInRoleCount: number
      customRoleCount: number
    }
    departments: Department[]
  }

  const { organization, summary, departments }: Props = $props()
  const { t } = useTranslation()
</script>

<svelte:head>
  <title>{t('workspace.departments.page_title', {}, 'Departments')}</title>
</svelte:head>

<OrganizationLayout title={t('workspace.departments.page_title', {}, 'Departments')}>
  <div class="space-y-6">
    <header class="border-b border-border pb-5">
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {t('workspace.departments.eyebrow', {}, 'Organization structure')}
      </p>
      <h1 class="mt-1 text-3xl font-black text-foreground">
        {t('workspace.departments.title', {}, 'Departments')}
      </h1>
      <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
        {organization.description ??
          t(
            'workspace.departments.fallback_description',
            { organization: organization.name },
            'Department map and suggested roles for :organization.'
          )}
      </p>
    </header>

    <section class="grid gap-3 md:grid-cols-3">
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t('workspace.departments.members', {}, 'Members')}
        </p>
        <p class="mt-2 text-2xl font-black text-foreground">{summary.approvedMembers}</p>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t('workspace.departments.built_in_roles', {}, 'Built-in roles')}
        </p>
        <p class="mt-2 text-2xl font-black text-foreground">{summary.builtInRoleCount}</p>
      </div>
      <div class="rounded-lg border border-border bg-card p-4">
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t('workspace.departments.custom_roles', {}, 'Custom roles')}
        </p>
        <p class="mt-2 text-2xl font-black text-foreground">{summary.customRoleCount}</p>
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      {#each departments as department (department.id)}
        <article class="rounded-lg border border-border bg-card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-foreground">{department.name}</h2>
              <p class="mt-1 text-sm text-muted-foreground">{department.description}</p>
            </div>
            <span class="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
              {t(
                'workspace.departments.people_count',
                { count: department.estimatedHeadcount },
                ':count people'
              )}
            </span>
          </div>
          <p class="mt-4 text-sm font-semibold text-foreground">{department.focus}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            {#each department.suggestedRoles as role}
              <span class="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">{role}</span>
            {/each}
          </div>
        </article>
      {/each}
    </section>
  </div>
</OrganizationLayout>

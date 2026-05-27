<script lang="ts">
  import { Link, page } from '@inertiajs/svelte'
  import { Briefcase, ClipboardList, Settings, ShieldCheck, Users } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface OrgDashboardStats {
    members?: {
      total?: number
      by_role?: {
        org_owner?: number
        org_admin?: number
        org_member?: number
      }
      pending_invitations?: number
      reviewed_members?: number
      imported_only_members?: number
      under_dispute_members?: number
    }
    projects?: {
      total?: number
      active?: number
      completed?: number
    }
    tasks?: {
      total?: number
      in_progress?: number
      completed?: number
      overdue?: number
    }
  }

  interface PageProps {
    stats?: OrgDashboardStats
    auth?: {
      user?: {
        current_organization_role?: string | null
        organizations?: { id: string; name: string }[]
        current_organization_id?: string | null
      } | null
    }
  }

  const { t } = useTranslation()
  const props = $derived(page.props as unknown as PageProps)
  const stats = $derived(props.stats ?? {})
  const currentOrganization = $derived(
    props.auth?.user?.organizations?.find(
      (organization) => organization.id === props.auth?.user?.current_organization_id
    ) ?? null
  )
  const pageTitle = $derived(t('organization.dashboard.page_title', {}, 'Organization overview'))

  const metricCards = $derived([
    {
      label: t('organization.dashboard.metrics.members.label', {}, 'Members'),
      value: stats.members?.total ?? 0,
      detail: t(
        'organization.dashboard.metrics.members.detail',
        { count: stats.members?.pending_invitations ?? 0 },
        ':count pending invitations'
      ),
      href: FRONTEND_ROUTES.ORG_MEMBERS,
      icon: Users,
    },
    {
      label: t('organization.dashboard.metrics.projects.label', {}, 'Projects'),
      value: stats.projects?.total ?? 0,
      detail: t(
        'organization.dashboard.metrics.projects.detail',
        { count: stats.projects?.active ?? 0 },
        ':count active'
      ),
      href: FRONTEND_ROUTES.ORG_PROJECTS,
      icon: Briefcase,
    },
    {
      label: t('organization.dashboard.metrics.tasks.label', {}, 'Tasks'),
      value: stats.tasks?.total ?? 0,
      detail: t(
        'organization.dashboard.metrics.tasks.detail',
        { count: stats.tasks?.in_progress ?? 0 },
        ':count in progress'
      ),
      href: FRONTEND_ROUTES.ORG_TASKS_LIST,
      icon: ClipboardList,
    },
    {
      label: t('organization.dashboard.metrics.risks.label', {}, 'Risks'),
      value: stats.tasks?.overdue ?? 0,
      detail: t(
        'organization.dashboard.metrics.risks.detail',
        { count: stats.members?.under_dispute_members ?? 0 },
        ':count members with disputes'
      ),
      href: FRONTEND_ROUTES.ORG_TASK_REVIEW_BOARD,
      icon: ShieldCheck,
    },
  ])
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<OrganizationLayout title={pageTitle}>
  <div class="space-y-8">
    <section class="rounded-xl border border-border bg-secondary/40 p-6 shadow-suar-xs">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {currentOrganization?.name ?? t('organization.dashboard.current_org_fallback', {}, 'Current organization')}
          </p>
          <h1 class="mt-2 text-3xl font-black tracking-tight text-foreground">
            {pageTitle}
          </h1>
          <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t(
              'organization.dashboard.subtitle',
              {},
              'Track members, projects, tasks, and quality signals across the organization workspace.'
            )}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <Link href={FRONTEND_ROUTES.ORG_TASKS_BOARD}>
            <Button variant="primary" class="gap-2">
              <ClipboardList class="h-4 w-4" />
              {t('organization.dashboard.actions.task_board', {}, 'Task board')}
            </Button>
          </Link>
          <Link href={FRONTEND_ROUTES.ORG_SETTINGS}>
            <Button variant="outline" class="gap-2">
              <Settings class="h-4 w-4" />
              {t('organization.dashboard.actions.settings', {}, 'Settings')}
            </Button>
          </Link>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Org dashboard metrics">
      {#each metricCards as metric (metric.label)}
        {@const Icon = metric.icon}
        <Link href={metric.href} class="block">
          <Card class="h-full border-border bg-card shadow-suar-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-suar-sm">
            <CardContent class="p-5">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {metric.label}
                  </p>
                  <p class="mt-2 text-3xl font-black text-foreground">{metric.value}</p>
                  <p class="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                </div>
                <span class="grid h-11 w-11 place-items-center rounded-lg border border-border bg-secondary">
                  <Icon class="h-5 w-5 text-primary" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      {/each}
    </section>

    <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card class="border-border bg-card shadow-suar-xs">
        <CardHeader>
          <CardTitle class="text-lg font-bold">
            {t('organization.dashboard.roles_title', {}, 'Organization roles')}
          </CardTitle>
        </CardHeader>
        <CardContent class="grid grid-cols-3 gap-3">
          <div class="rounded-lg border border-border bg-secondary/40 p-4">
            <p class="text-xs text-muted-foreground">
              {t('organization.dashboard.roles.owner', {}, 'Owner')}
            </p>
            <strong class="mt-1 block text-2xl">{stats.members?.by_role?.org_owner ?? 0}</strong>
          </div>
          <div class="rounded-lg border border-border bg-secondary/40 p-4">
            <p class="text-xs text-muted-foreground">
              {t('organization.dashboard.roles.admin', {}, 'Admin')}
            </p>
            <strong class="mt-1 block text-2xl">{stats.members?.by_role?.org_admin ?? 0}</strong>
          </div>
          <div class="rounded-lg border border-border bg-secondary/40 p-4">
            <p class="text-xs text-muted-foreground">
              {t('organization.dashboard.roles.member', {}, 'Member')}
            </p>
            <strong class="mt-1 block text-2xl">{stats.members?.by_role?.org_member ?? 0}</strong>
          </div>
        </CardContent>
      </Card>

      <Card class="border-border bg-card shadow-suar-xs">
        <CardHeader>
          <CardTitle class="text-lg font-bold">
            {t('organization.dashboard.quick_title', {}, 'Quick coordination')}
          </CardTitle>
        </CardHeader>
        <CardContent class="grid gap-3">
          <Link href={FRONTEND_ROUTES.ORG_PROJECTS} class="rounded-lg border border-border bg-secondary/30 p-4 text-sm font-bold hover:border-primary/40">
            {t('organization.dashboard.quick.projects', {}, 'Project catalog')}
          </Link>
          <Link href={FRONTEND_ROUTES.ORG_MEMBERS} class="rounded-lg border border-border bg-secondary/30 p-4 text-sm font-bold hover:border-primary/40">
            {t('organization.dashboard.quick.members', {}, 'Organization members')}
          </Link>
          <Link href={FRONTEND_ROUTES.ORG_AUDIT_LOGS} class="rounded-lg border border-border bg-secondary/30 p-4 text-sm font-bold hover:border-primary/40">
            {t('organization.dashboard.quick.audit_logs', {}, 'Organization audit log')}
          </Link>
        </CardContent>
      </Card>
    </section>
  </div>
</OrganizationLayout>

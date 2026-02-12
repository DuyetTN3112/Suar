<script lang="ts">
  import { page, Link } from '@inertiajs/svelte'
  import {
    ArrowRight,
    Bell,
    FolderKanban,
    LayoutDashboard,
    Send,
    SquareCheckBig,
    Store,
    UserCircle,
  } from 'lucide-svelte'

  import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface AuthUser {
    username?: string
    email?: string
    current_organization_id?: string | null
    current_organization_role?: string | null
    current_project?: {
      id: string
      name?: string | null
    } | null
    organizations?: { id: string; name: string }[]
  }

  interface PageProps {
    auth?: { user?: AuthUser | null }
    [key: string]: unknown
  }

  const { t } = useTranslation()
  const pageProps = $derived(page.props as unknown as PageProps)
  const user = $derived(pageProps.auth?.user ?? null)
  const userName = $derived(user?.username ?? user?.email ?? 'User')
  const currentProjectName = $derived(
    user?.current_project?.name ?? t('user.dashboard.no_project', {}, 'No project selected')
  )
  const currentProjectBase = $derived(
    user?.current_project?.id ? `/projects/${user.current_project.id}` : '/projects'
  )
  const organizationCount = $derived(user?.organizations?.length ?? 0)
  const pageTitle = $derived(t('user.dashboard.page_title', {}, 'Personal overview'))

  const attentionLinks = $derived([
    {
      title: t('user.dashboard.links.task_review_board.title', {}, 'Task review board'),
      description: t(
        'user.dashboard.links.task_review_board.description',
        {},
        'Handle task reviews by status column.'
      ),
      href: user?.current_project?.id ? `${currentProjectBase}/reviews/tasks` : currentProjectBase,
      icon: FolderKanban,
    },
    {
      title: t('user.dashboard.links.manager_review.title', {}, 'Manager review'),
      description: t(
        'user.dashboard.links.manager_review.description',
        {},
        'Opens automatically after the previous sprint closes.'
      ),
      href: user?.current_project?.id
        ? `${currentProjectBase}/reviews/assigners`
        : currentProjectBase,
      icon: UserCircle,
    },
    {
      title: t('user.dashboard.links.environment_review.title', {}, 'Environment review'),
      description: t(
        'user.dashboard.links.environment_review.description',
        {},
        'Rate the project, organization, and collaboration after a sprint.'
      ),
      href: user?.current_project?.id
        ? `${currentProjectBase}/reviews/environment`
        : currentProjectBase,
      icon: LayoutDashboard,
    },
  ])

  const workLinks = $derived([
    {
      title: t('user.dashboard.links.task_board.title', {}, 'Task board'),
      description: t(
        'user.dashboard.links.task_board.description',
        {},
        'Track tasks you are working on and tasks awaiting review.'
      ),
      href: user?.current_project?.id ? `${currentProjectBase}/tasks` : currentProjectBase,
      icon: SquareCheckBig,
    },
    {
      title: t('user.dashboard.links.open_tasks.title', {}, 'Open tasks'),
      description: t(
        'user.dashboard.links.open_tasks.description',
        {},
        'Find work that matches your skills and submit proposals.'
      ),
      href: FRONTEND_ROUTES.MARKETPLACE_TASKS,
      icon: Store,
    },
    {
      title: t('user.dashboard.links.my_applications.title', {}, 'My applications'),
      description: t(
        'user.dashboard.links.my_applications.description',
        {},
        'Check the status of tasks you have applied to.'
      ),
      href: FRONTEND_ROUTES.MY_APPLICATIONS,
      icon: Send,
    },
  ])

  const profileLinks = $derived([
    {
      title: t('user.dashboard.links.capability_profile.title', {}, 'Capability profile'),
      description: t(
        'user.dashboard.links.capability_profile.description',
        {},
        'Review trust, skills, and profile snapshots.'
      ),
      href: FRONTEND_ROUTES.PROFILE,
      icon: UserCircle,
    },
    {
      title: t('user.dashboard.links.review_history.title', {}, 'Project review boards'),
      description: t(
        'user.dashboard.links.review_history.description',
        {},
        'Open the shared review boards for the selected project.'
      ),
      href: user?.current_project?.id ? `${currentProjectBase}/reviews/tasks` : currentProjectBase,
      icon: FolderKanban,
    },
    {
      title: t('user.dashboard.links.notifications.title', {}, 'Notifications'),
      description: t(
        'user.dashboard.links.notifications.description',
        {},
        'See new signals from tasks, reviews, and organizations.'
      ),
      href: '/notifications',
      icon: Bell,
    },
  ])
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">
    <section class="space-y-2">
      <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
        {t('user.dashboard.eyebrow', {}, 'User command center')}
      </p>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <h1 class="break-all text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {t('user.dashboard.greeting', { name: userName }, 'Today for :name')}
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t(
              'user.dashboard.subtitle',
              {},
              'Bring personal work, reviews, open tasks, and capability profile into one screen.'
            )}
          </p>
        </div>
        <div class="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm sm:w-auto sm:min-w-72">
          <div class="font-semibold text-foreground">{currentProjectName}</div>
          <div class="mt-1 text-xs text-muted-foreground">
            {t('user.dashboard.organization_count', { count: organizationCount }, ':count organizations in workspace')}
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-black text-foreground">
          {t('user.dashboard.needs_attention', {}, 'Needs attention')}
        </h2>
        <Link
          href={user?.current_project?.id ? `${currentProjectBase}/reviews/tasks` : currentProjectBase}
          class="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          {t('user.dashboard.open_review_board', {}, 'Open review board')}
          <ArrowRight class="h-4 w-4" />
        </Link>
      </div>
      <div class="grid gap-3 md:grid-cols-3">
        {#each attentionLinks as item}
          {@const Icon = item.icon}
          <Link href={item.href} class="group rounded-lg border border-border bg-card p-4 shadow-xs transition hover:border-primary/50 hover:shadow-sm">
            <Icon class="h-5 w-5 text-primary" />
            <h3 class="mt-3 text-base font-black text-foreground">{item.title}</h3>
            <p class="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
            <span class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
              {t('user.dashboard.go_to', {}, 'Go to')}
              <ArrowRight class="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        {/each}
      </div>
    </section>

    <section class="grid gap-5 lg:grid-cols-2">
      <div class="space-y-3">
        <h2 class="text-lg font-black text-foreground">{t('user.dashboard.work', {}, 'Work')}</h2>
        <div class="grid gap-3">
          {#each workLinks as item}
            {@const Icon = item.icon}
            <Link href={item.href} class="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-xs transition hover:border-primary/50 hover:shadow-sm">
              <Icon class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span class="min-w-0 flex-1">
                <span class="block font-black text-foreground">{item.title}</span>
                <span class="mt-1 block text-sm leading-6 text-muted-foreground">{item.description}</span>
              </span>
              <ArrowRight class="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          {/each}
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-lg font-black text-foreground">
          {t('user.dashboard.profile_signals', {}, 'Profile and signals')}
        </h2>
        <div class="grid gap-3">
          {#each profileLinks as item}
            {@const Icon = item.icon}
            <Link href={item.href} class="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-xs transition hover:border-primary/50 hover:shadow-sm">
              <Icon class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span class="min-w-0 flex-1">
                <span class="block font-black text-foreground">{item.title}</span>
                <span class="mt-1 block text-sm leading-6 text-muted-foreground">{item.description}</span>
              </span>
              <ArrowRight class="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          {/each}
        </div>
      </div>
    </section>
  </div>
</AppLayout>

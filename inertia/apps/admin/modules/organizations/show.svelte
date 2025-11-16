<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Organization {
    id: string
    name: string
    slug: string
    description: string | null
    partner_type: string | null
    created_at: string
    updated_at: string
    owner: {
      id: string
      username: string
      email: string | null
    }
    stats: {
      usersCount: number
      projectsCount: number
    }
  }

  interface Props {
    organization: Organization
  }

  const { organization }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  function formatDateTime(date: string): string {
    return new Date(date).toLocaleString(documentLocale)
  }
</script>

<svelte:head>
  <title>Admin - {organization.name}</title>
</svelte:head>

  <div class="space-y-6">
    <div>
      <div>
        <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('organization.admin_organizations.show.eyebrow', {}, 'Admin / Organization detail')}</p>
        <h1 class="text-4xl font-bold tracking-tight">{organization.name}</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          {t('organization.admin_organizations.show.summary', { members: organization.stats.usersCount, projects: organization.stats.projectsCount }, ':members members · :projects projects')}
        </p>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('organization.admin_organizations.show.info_title', {}, 'Organization information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('organization.admin_organizations.show.organization_id', {}, 'Organization ID')}</dt>
              <dd class="mt-1 text-sm font-mono text-foreground">{organization.id}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('organization.admin_organizations.show.name', {}, 'Name')}</dt>
              <dd class="mt-1 text-sm text-foreground">{organization.name}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Slug</dt>
              <dd class="mt-1 text-sm font-mono text-foreground">{organization.slug}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('organization.admin_organizations.show.description', {}, 'Description')}</dt>
              <dd class="mt-1 text-sm text-foreground">{organization.description ?? t('organization.admin_organizations.show.no_description', {}, 'No description')}</dd>
            </div>
            {#if organization.partner_type}
              <div>
                <dt class="text-sm font-medium text-muted-foreground">{t('organization.admin_organizations.show.partner_type', {}, 'Partner type')}</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full px-3 py-1 text-xs font-medium bg-primary text-white">
                    {organization.partner_type}
                  </span>
                </dd>
              </div>
            {/if}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('organization.admin_organizations.show.stats_title', {}, 'Owner and statistics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4">
            <div>
              <dt class="text-sm font-medium text-muted-foreground">Owner</dt>
              <dd class="mt-1">
                <Link href={`/admin/users/${organization.owner.id}`} class="text-foreground hover:underline">
                  {organization.owner.username}
                </Link>
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('organization.admin_organizations.show.owner_email', {}, 'Owner email')}</dt>
              <dd class="mt-1 text-sm text-foreground">{organization.owner.email ?? t('organization.admin_organizations.show.email_missing', {}, 'Not provided')}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('organization.admin_organizations.show.members', {}, 'Members')}</dt>
              <dd class="mt-1 text-sm text-foreground">
                {t('organization.admin_organizations.show.member_count', { count: organization.stats.usersCount }, ':count people')}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('organization.admin_organizations.show.projects', {}, 'Projects')}</dt>
              <dd class="mt-1 text-sm text-foreground">
                {t('organization.admin_organizations.show.project_count', { count: organization.stats.projectsCount }, ':count projects')}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('organization.admin_organizations.show.created_at', {}, 'Created at')}</dt>
              <dd class="mt-1 text-sm text-foreground">
                {formatDateTime(organization.created_at)}
              </dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-muted-foreground">{t('organization.admin_organizations.show.updated_at', {}, 'Last updated')}</dt>
              <dd class="mt-1 text-sm text-foreground">
                {formatDateTime(organization.updated_at)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>

  </div>

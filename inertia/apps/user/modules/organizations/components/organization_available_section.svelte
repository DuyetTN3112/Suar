<script lang="ts">
  import { Building2, Info, MapPin, Earth, Users, FolderKanban } from 'lucide-svelte'

  import type { LucideIconComponent } from '@/apps/user/shared/components/lucide_icon_map'
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import OrganizationPaginationControls from './organization_pagination_controls.svelte'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
    founded_date: string | null
    owner: string | null
    employee_count: number | null
    project_count: number | null
    industry: string | null
    location: string | null
    membership_status?: 'pending' | 'approved' | 'rejected' | null
  }

  interface MembershipInfo {
    isMember: boolean
    status: string | null
  }

  interface ButtonConfig {
    variant: 'outline' | 'default'
    disabled: boolean
    icon?: LucideIconComponent | null
    text: string
    className?: string
    onClick?: () => void
  }

  interface Props {
    pagination: OffsetPagePagination
    organizations: Organization[]
    baseUrl?: string
    pageParam?: string
    queryParams?: Record<string, unknown>
    onPageChange?: (page: number) => void
    onShowDetails: (org: Organization) => void
    checkMembershipStatus: (orgId: string) => MembershipInfo
    renderJoinButton: (org: Organization) => ButtonConfig
    hideHeader?: boolean
  }

  const {
    pagination,
    organizations,
    baseUrl,
    pageParam = 'page',
    queryParams = {},
    onPageChange,
    onShowDetails,
    checkMembershipStatus,
    renderJoinButton,
    hideHeader = false,
  }: Props = $props()
  const { t } = useTranslation()
</script>

<section class="border border-border rounded-2xl bg-card p-5 md:p-8 shadow-suar-xs">
  {#if !hideHeader}
    <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-border/15 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
          {t('organization.index.open_network', {}, 'Open network')}
        </div>
        <h2 class="text-3xl font-black tracking-[-0.07em] md:text-4xl">{t('organization.index.available_title', {}, 'Available organizations')}</h2>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="rounded-full border border-border bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t('organization.index.results_count', { count: pagination.total }, ':count results')}
        </div>
      </div>
    </div>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {#each organizations as org (org.id)}
      {@const membershipInfo = checkMembershipStatus(org.id)}
      {@const buttonConfig = renderJoinButton(org)}

      <article class="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-suar-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-suar-sm">
        <div class="flex items-start gap-3">
          <div class="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border bg-secondary text-primary">
            {#if org.logo}
              <img src={org.logo} alt={org.name} class="h-8 w-8 rounded-lg object-cover" />
            {:else}
              <Building2 class="h-5 w-5" />
            {/if}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="truncate text-lg font-black tracking-[-0.04em]">{org.name}</h3>

              {#if membershipInfo.isMember}
                <Badge variant="outline" class="rounded-full border-border bg-primary/10 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  {t('organization.memberships.joined_badge', {}, 'Joined')}
                </Badge>
              {:else if membershipInfo.status === 'pending'}
                <Badge variant="outline" class="rounded-full border-amber-500/40 bg-amber-500/10 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  {t('organization.detail_dialog.pending_badge', {}, 'Pending approval')}
                </Badge>
              {/if}
            </div>

            <p class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {org.description ?? t('organization.no_description', {}, 'No description.')}
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-2 text-xs font-medium text-muted-foreground sm:grid-cols-2">
          <div class="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/20 px-3 py-2">
            <Users class="h-3.5 w-3.5 text-primary" />
            <span>{t('organization.detail_dialog.employee_count', { count: org.employee_count ?? 0 }, ':count members')}</span>
          </div>
          <div class="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/20 px-3 py-2">
            <FolderKanban class="h-3.5 w-3.5 text-secondary" />
            <span>{t('organization.detail_dialog.project_count', { count: org.project_count ?? 0 }, ':count projects')}</span>
          </div>
          <div class="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/20 px-3 py-2">
            <MapPin class="h-3.5 w-3.5 text-primary" />
            <span class="truncate">{org.location ?? t('organization.memberships.location_unknown', {}, 'Location unknown')}</span>
          </div>
          <div class="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/20 px-3 py-2">
            <Earth class="h-3.5 w-3.5 text-secondary" />
            <span class="truncate">{org.website ?? org.industry ?? t('organization.memberships.website_missing', {}, 'No website')}</span>
          </div>
        </div>

        <div class="mt-4 flex items-end justify-between gap-3">
          <div class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {org.industry ?? t('organization.memberships.uncategorized', {}, 'Uncategorized')}
          </div>

          <div class="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              class="h-10 rounded-full px-4 text-xs font-black"
              onclick={() => { onShowDetails(org) }}
            >
              <Info class="mr-1.5 h-3.5 w-3.5" />
              {t('organization.view_detail', {}, 'View details')}
            </Button>

            <Button
              size="sm"
              variant={buttonConfig.variant}
              class={`h-10 rounded-full px-4 text-xs font-black ${buttonConfig.className ?? ''}`}
              disabled={buttonConfig.disabled}
              onclick={buttonConfig.onClick}
            >
              {buttonConfig.text}
            </Button>
          </div>
        </div>
      </article>
    {/each}
  </div>

  <div class="mt-6 flex justify-end">
    <OrganizationPaginationControls
      {pagination}
      {baseUrl}
      {pageParam}
      {queryParams}
      {onPageChange}
    />
  </div>
</section>

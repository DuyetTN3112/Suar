<script lang="ts">
  import { Building2, CircleCheck, ArrowRightLeft, Info, Sparkles } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

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

  interface Props {
    pagination: OffsetPagePagination
    organizations: Organization[]
    currentOrganizationId: string | null
    baseUrl?: string
    pageParam?: string
    queryParams?: Record<string, unknown>
    onPageChange?: (page: number) => void
    onShowDetails: (org: Organization) => void
    onSwitchOrganization: (id: string) => Promise<void>
    hideHeader?: boolean
  }

  const {
    pagination,
    organizations,
    currentOrganizationId,
    baseUrl,
    pageParam = 'page',
    queryParams = {},
    onPageChange,
    onShowDetails,
    onSwitchOrganization,
    hideHeader = false,
  }: Props = $props()
  const { t } = useTranslation()
</script>

<section class="border border-border rounded-2xl bg-card p-5 md:p-8 shadow-suar-xs">
  {#if !hideHeader}
    <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-border/15 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
          {t('organization.memberships.eyebrow', {}, 'Your workspace')}
        </div>
        <h2 class="text-3xl font-black tracking-[-0.07em] md:text-4xl text-foreground">{t('organization.memberships.title', {}, 'Joined organizations')}</h2>
      </div>
    </div>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {#each organizations as org (org.id)}
      <article class={`flex h-full flex-col rounded-2xl border p-4 shadow-suar-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-suar-sm ${org.id === currentOrganizationId ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary' : 'border-border bg-card text-foreground hover:border-primary/30'}`}>
        <div class="flex items-start gap-3">
          <div class={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-border shadow-suar-xs ${org.id === currentOrganizationId ? 'border-primary/20 bg-card text-primary' : 'border-border bg-muted text-muted-foreground'}`}>
            {#if org.logo}
              <img src={org.logo} alt={org.name} class="h-8 w-8 rounded-lg object-cover" />
            {:else}
              <Building2 class="h-5 w-5" />
            {/if}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="truncate text-lg font-black tracking-[-0.04em] text-foreground">{org.name}</h3>
              {#if org.id === currentOrganizationId}
                <span class="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  {t('organization.memberships.active_badge', {}, 'In use')}
                </span>
              {:else}
                <span class="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  {t('organization.memberships.joined_badge', {}, 'Joined')}
                </span>
              {/if}
            </div>
            <p class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {org.description ?? t('organization.no_description', {}, 'No description.')}
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-2 sm:grid-cols-2">
          <div class="rounded-2xl border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <div class="flex items-center gap-2">
              <Sparkles class="h-3.5 w-3.5 text-primary" />
              <span class="truncate">{org.industry ?? t('organization.memberships.uncategorized', {}, 'Uncategorized')}</span>
            </div>
          </div>
          <div class="rounded-2xl border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <div class="flex items-center gap-2">
              <CircleCheck class="h-3.5 w-3.5 text-secondary" />
              <span>{t('organization.detail_dialog.project_count', { count: org.project_count ?? 0 }, ':count projects')}</span>
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <Button
            size="sm"
            variant="outline"
            class="h-10 rounded-full px-4 text-xs font-bold transition-all border-border bg-background text-foreground hover:bg-secondary"
            onclick={() => { onShowDetails(org) }}
            >
              <Info class="mr-1.5 h-3.5 w-3.5" />
              {t('organization.view_detail', {}, 'View details')}
          </Button>

          {#if org.id === currentOrganizationId}
            <Button
              size="sm"
              variant="outline"
              class="h-10 rounded-full px-4 text-xs font-bold border-primary/20 bg-primary/10 text-primary"
              disabled
            >
              <CircleCheck class="mr-1.5 h-3.5 w-3.5" />
              {t('organization.index.join_current', {}, 'Current')}
            </Button>
          {:else}
            <Button
              size="sm"
              class="h-10 rounded-full px-4 text-xs font-bold transition-all bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
              onclick={() => { void onSwitchOrganization(org.id) }}
            >
              <ArrowRightLeft class="mr-1.5 h-3.5 w-3.5" />
              {t('organization.index.join_switch', {}, 'Switch')}
            </Button>
          {/if}
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

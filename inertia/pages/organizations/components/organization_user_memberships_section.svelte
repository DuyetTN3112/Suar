<script lang="ts">
  import { Building2, CircleCheck, ArrowRightLeft, Info, Sparkles } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'

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
    page: number
    totalPages: number
    organizations: Organization[]
    currentOrganizationId: string | null
    onPrev: () => void
    onNext: () => void
    onShowDetails: (org: Organization) => void
    onSwitchOrganization: (id: string) => Promise<void>
    hideHeader?: boolean
  }

  const {
    page,
    totalPages,
    organizations,
    currentOrganizationId,
    onPrev,
    onNext,
    onShowDetails,
    onSwitchOrganization,
    hideHeader = false,
  }: Props = $props()
</script>

<section class="border border-border rounded-2xl bg-white p-5 md:p-8 shadow-xs">
  {#if !hideHeader}
    <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-border/15 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
          Workspace của bạn
        </div>
        <h2 class="text-3xl font-black tracking-[-0.07em] md:text-4xl text-foreground">Tổ chức đã tham gia</h2>
        <p class="mt-2 max-w-[58ch] text-sm leading-7 text-muted-foreground">
          Đây là các workspace bạn đã có quyền truy cập. Có thể xem chi tiết hoặc đổi tổ chức đang hoạt động ngay tại đây.
        </p>
      </div>

      <OrganizationPaginationControls
        {page}
        {totalPages}
        {onPrev}
        {onNext}
        dark={false}
      />
    </div>
  {:else}
    <div class="mb-5 flex items-center justify-end">
      <OrganizationPaginationControls
        {page}
        {totalPages}
        {onPrev}
        {onNext}
        dark={false}
      />
    </div>
  {/if}

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {#each organizations as org (org.id)}
      <article class={`flex h-full flex-col rounded-[1.6rem] border p-4 shadow-suar-xs transition-transform duration-200 hover:-translate-y-0.5 ${org.id === currentOrganizationId ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary' : 'border-border bg-card text-foreground hover:border-foreground/35'}`}>
        <div class="flex items-start gap-3">
          <div class={`grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] border shadow-xs ${org.id === currentOrganizationId ? 'border-primary/25 bg-white text-primary' : 'border-border bg-muted text-muted-foreground'}`}>
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
                  Đang dùng
                </span>
              {:else}
                <span class="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Có quyền truy cập
                </span>
              {/if}
            </div>
            <p class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {org.description ?? 'Tổ chức này chưa có mô tả.'}
            </p>
          </div>
        </div>

        <div class="mt-4 grid gap-2 sm:grid-cols-2">
          <div class="rounded-2xl border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <div class="flex items-center gap-2">
              <Sparkles class="h-3.5 w-3.5 text-primary" />
              <span class="truncate">{org.industry ?? 'General workspace'}</span>
            </div>
          </div>
          <div class="rounded-2xl border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <div class="flex items-center gap-2">
              <CircleCheck class="h-3.5 w-3.5 text-secondary" />
              <span>{org.project_count ?? 0} dự án</span>
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <Button
            size="sm"
            variant="outline"
            class="h-10 rounded-full px-4 text-xs font-black transition-all border-border bg-background text-foreground hover:bg-muted"
            onclick={() => { onShowDetails(org) }}
          >
            <Info class="mr-1.5 h-3.5 w-3.5" />
            Chi tiết
          </Button>

          {#if org.id === currentOrganizationId}
            <Button
              size="sm"
              variant="outline"
              class="h-10 rounded-full px-4 text-xs font-black border-primary/25 bg-primary/10 text-primary"
              disabled
            >
              <CircleCheck class="mr-1.5 h-3.5 w-3.5" />
              Hiện tại
            </Button>
          {:else}
            <Button
              size="sm"
              class="h-10 rounded-full px-4 text-xs font-black transition-all bg-black text-white hover:bg-black/90 cursor-pointer"
              onclick={() => { void onSwitchOrganization(org.id) }}
            >
              <ArrowRightLeft class="mr-1.5 h-3.5 w-3.5" />
              Chuyển đổi
            </Button>
          {/if}
        </div>
      </article>
    {/each}
  </div>
</section>

<script lang="ts">
  import { router, page  } from '@inertiajs/svelte'
  import { Bookmark, Search, ShieldCheck, Sparkles } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
import OrganizationLayout from '@/layouts/organization_layout.svelte'

  interface TalentItem {
    id: string
    username: string
    status: string
    match_score?: number
    skill_match?: number
    domain_match?: number
    delivery_reliability?: number
    trust_score?: number
    explanations?: string[]
    risks?: string[]
    avatar_url?: string | null
    bio?: string | null
    custom_headline?: string | null
    completed_tasks?: number
    bookmark: {
      id: string | null
      isSaved: boolean
      notes: string | null
      folder: string | null
      rating: number | null
    }
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    talents: TalentItem[]
    filters: {
      q: string | null
      task_id: string | null
    }
    stats: {
      total: number
      saved: number
    }
    page: number
    per_page: number
    total_pages: number
  }

  const props: Props = $props()

  let keyword = $state('')
  let taskId = $state('')

  $effect(() => {
    keyword = props.filters.q ?? ''
    taskId = props.filters.task_id ?? ''
  })

  function applyFilters() {
    router.get(
      '/marketplace/talents',
      {
        q: keyword.trim() || undefined,
        task_id: taskId.trim() || undefined,
      },
      { preserveState: false, preserveScroll: true }
    )
  }

  function resetFilters() {
    keyword = ''
    taskId = ''
    router.get('/marketplace/talents', {}, { preserveState: false, preserveScroll: true })
  }

  function goToPage(pageNumber: number) {
    const params: Record<string, string> = {}
    if (keyword.trim()) params.q = keyword.trim()
    if (taskId.trim()) params.task_id = taskId.trim()
    params.page = String(pageNumber)
    router.get('/marketplace/talents', params, { preserveState: false, preserveScroll: true })
  }

  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
</script>

<svelte:head>
  <title>Talent Directory</title>
</svelte:head>

<Layout title="Talent Directory">
  <div class="min-w-0 marketplace-page">
    <section class="bg-white border border-border rounded-2xl p-6 shadow-xs space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="font-medium uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">Marketplace / Talent</div>
          <h1 class="text-3xl font-bold tracking-tight text-foreground">Talent directory</h1>
          <p class="text-base text-muted-foreground max-w-3xl">
            Browse searchable talent pool, inspect task-fit signals, then jump into recruiter bookmarks.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <div class="inline-flex items-center px-2.5 py-0.5 rounded-full border border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">{props.stats.total} talents</div>
          <div class="inline-flex items-center px-2.5 py-0.5 rounded-full border border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">{props.stats.saved} saved</div>
        </div>
      </div>

      <Card>
        <CardContent class="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
          <div class="space-y-2">
            <Label for="talent-search-keyword">Keyword</Label>
            <Input
              id="talent-search-keyword" data-testid="talent-search-keyword"
              bind:value={keyword}
              placeholder="username, notes, niche"
            />
          </div>
          <div class="space-y-2">
            <Label for="talent-search-task">Task ID</Label>
            <Input
              id="talent-search-task" data-testid="talent-search-task"
              bind:value={taskId}
              placeholder="Optional task id for match ranking"
            />
          </div>
          <div class="flex gap-2">
            <Button onclick={applyFilters}>
              <Search class="mr-2 h-4 w-4" />
              Search
            </Button>
            <Button variant="outline" onclick={resetFilters}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {#if props.talents.length === 0}
        <Card class="py-16">
          <CardContent class="flex flex-col items-center gap-3 text-center">
            <Search class="h-12 w-12 opacity-45" />
            <h2 class="text-xl font-bold">No talent matched current filters</h2>
            <p class="text-muted-foreground">Adjust keyword or remove task context to widen pool.</p>
          </CardContent>
        </Card>
      {:else}
        <div class="grid gap-6 xl:grid-cols-2">
          {#each props.talents as talent (talent.id)}
            <Card class="overflow-hidden border border-border/12 shadow-suar-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-suar-sm bg-white rounded-2xl">
              <CardContent class="space-y-4 p-5">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="flex items-start gap-3.5">
                    <div class="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-primary bg-accent font-black text-primary text-base shadow-suar-xs overflow-hidden">
                      {#if talent.avatar_url}
                        <img src={talent.avatar_url} alt={talent.username} class="h-full w-full object-cover" />
                      {:else}
                        {talent.username.slice(0, 2).toUpperCase()}
                      {/if}
                    </div>

                    <div class="space-y-1 min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <h2 class="text-base font-black tracking-tight text-foreground truncate">{talent.username}</h2>
                        <Badge variant="outline" class="text-[10px] uppercase tracking-wider">{talent.status}</Badge>
                        {#if talent.bookmark.isSaved}
                          <Badge class="border-orange/20 bg-orange/10 text-orange text-[10px] uppercase tracking-wider">
                            <Bookmark class="mr-1 h-3 w-3 fill-current" />
                            Đã lưu
                          </Badge>
                        {/if}
                      </div>

                      <p class="text-xs font-bold text-orange uppercase tracking-wider">
                        {talent.custom_headline ?? 'Thành viên tài năng'}
                      </p>

                      {#if talent.completed_tasks !== undefined && talent.completed_tasks > 0}
                        <p class="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                          <span>✓ {talent.completed_tasks} công việc đã hoàn thành</span>
                        </p>
                      {/if}
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <a class="inline-flex h-9 items-center justify-center rounded-full border border-border/18 px-4 text-xs font-black bg-white hover:bg-muted/50 transition-colors" href={`/users/${talent.id}/profile`}>
                      Xem Hồ Sơ
                    </a>
                    <a class="inline-flex h-9 items-center justify-center rounded-full border border-border/18 px-4 text-xs font-black bg-white hover:bg-muted/50 transition-colors" href="/marketplace/bookmarks">
                      Mục Đã Lưu
                    </a>
                  </div>
                </div>

                {#if talent.bio}
                  <p class="text-sm text-muted-foreground leading-relaxed line-clamp-2 italic bg-muted/20 p-3 rounded-xl border border-border/6">
                    "{talent.bio}"
                  </p>
                {/if}

                <div class="grid gap-3 sm:grid-cols-3">
                  <div class="rounded-xl border border-border/12 bg-[#fffdf8] p-3 text-sm flex flex-col justify-between">
                    <div>
                      <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kỹ năng</div>
                      <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-lg font-black text-foreground">{talent.skill_match ?? 'N/A'}</span>
                        {#if talent.skill_match !== undefined}<span class="text-[10px] text-muted-foreground">/100</span>{/if}
                      </div>
                    </div>
                    {#if talent.skill_match !== undefined}
                      <div class="mt-2 h-1.5 w-full bg-border/20 rounded-full overflow-hidden">
                        <div class="h-full bg-orange rounded-full" style="width: {talent.skill_match}%"></div>
                      </div>
                    {/if}
                  </div>

                  <div class="rounded-xl border border-border/12 bg-[#fffdf8] p-3 text-sm flex flex-col justify-between">
                    <div>
                      <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lĩnh vực</div>
                      <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-lg font-black text-foreground">{talent.domain_match ?? 'N/A'}</span>
                        {#if talent.domain_match !== undefined}<span class="text-[10px] text-muted-foreground">/100</span>{/if}
                      </div>
                    </div>
                    {#if talent.domain_match !== undefined}
                      <div class="mt-2 h-1.5 w-full bg-border/20 rounded-full overflow-hidden">
                        <div class="h-full bg-black rounded-full" style="width: {talent.domain_match}%"></div>
                      </div>
                    {/if}
                  </div>

                  <div class="rounded-xl border border-border/12 bg-[#fffdf8] p-3 text-sm flex flex-col justify-between">
                    <div>
                      <div class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Độ tin cậy</div>
                      <div class="mt-1 flex items-baseline gap-1">
                        <span class="text-lg font-black text-foreground">{talent.delivery_reliability ?? 'N/A'}</span>
                        {#if talent.delivery_reliability !== undefined}<span class="text-[10px] text-muted-foreground">/100</span>{/if}
                      </div>
                    </div>
                    {#if talent.delivery_reliability !== undefined}
                      <div class="mt-2 h-1.5 w-full bg-border/20 rounded-full overflow-hidden">
                        <div class="h-full bg-orange rounded-full" style="width: {talent.delivery_reliability}%"></div>
                      </div>
                    {/if}
                  </div>
                </div>

                <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border/6 pt-3">
                  <span class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    Điểm tín nhiệm: <strong class="text-foreground text-sm font-black">{talent.trust_score ?? 0}</strong>
                  </span>
                  {#if talent.match_score !== undefined}
                    <span class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange">
                      <Sparkles class="h-3.5 w-3.5" />
                      Phù hợp: {talent.match_score}
                    </span>
                  {/if}
                </div>

                {#if talent.explanations?.length}
                  <div class="space-y-2">
                    <div class="flex items-center gap-2 text-sm font-bold">
                      <Sparkles class="h-4 w-4" />
                      Tại sao chọn talent này
                    </div>
                    <ul class="space-y-1 text-sm text-muted-foreground">
                      {#each talent.explanations as explanation}
                        <li>• {explanation}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                {#if talent.risks?.length}
                  <div class="space-y-2">
                    <div class="flex items-center gap-2 text-sm font-bold">
                      <ShieldCheck class="h-4 w-4" />
                      Rủi ro cần lưu ý
                    </div>
                    <ul class="space-y-1 text-sm text-muted-foreground">
                      {#each talent.risks as risk}
                        <li>• {risk}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                {#if talent.bookmark.isSaved}
                  <div class="rounded-lg border border-amber-500/25 bg-amber-50/70 p-3 text-sm dark:bg-amber-950/20">
                    <div class="font-bold">Bookmark note</div>
                    <div class="mt-1 text-muted-foreground">
                      Thư mục {talent.bookmark.folder ?? 'Chung'} · Đánh giá {talent.bookmark.rating ?? 'N/A'}
                    </div>
                    {#if talent.bookmark.notes}
                      <p class="mt-2 text-foreground">{talent.bookmark.notes}</p>
                    {/if}
                  </div>
                {/if}
              </CardContent>
            </Card>
          {/each}
        </div>
      {/if}

      {#if props.total_pages > 1}
        <div class="flex justify-center items-center gap-3 pt-4">
          <button
            class="inline-flex items-center rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50"
            onclick={() => { goToPage(props.page - 1); }}
            disabled={props.page === 1}
          >
            Trước
          </button>
          <span class="text-sm font-bold">{props.page} / {props.total_pages}</span>
          <button
            class="inline-flex items-center rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50"
            onclick={() => { goToPage(props.page + 1); }}
            disabled={props.page === props.total_pages}
          >
            Sau
          </button>
        </div>
      {/if}
    </section>
  </div>
</Layout>

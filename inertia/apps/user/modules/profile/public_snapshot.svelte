<script lang="ts">
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface PublicSnapshotSkill {
    skillName?: string
    skill_name?: string
    verifiedPublicProficiencyCode?: string | null
    verified_public_proficiency_code?: string | null
    totalReviews?: number
    total_reviews?: number
    avgPercentage?: number | null
    avg_percentage?: number | null
  }

  interface PublicSnapshotWorkHighlight {
    taskTitle?: string
    task_title?: string
    overallQualityScore?: number | null
    overall_quality_score?: number | null
    wasOnTime?: boolean | null
    was_on_time?: boolean | null
    completedAt?: string | null
    completed_at?: string | null
    taskType?: string | null
    task_type?: string | null
    businessDomain?: string | null
    business_domain?: string | null
    problemCategory?: string | null
    problem_category?: string | null
    roleInTask?: string | null
    role_in_task?: string | null
    collaborationType?: string | null
    collaboration_type?: string | null
    verification?: {
      status?: 'review_confirmed' | 'retrospective'
      confidence?: 'high' | 'limited'
    }
  }

  interface PublicProfileSnapshot {
    id: string
    userId?: string
    version: number
    snapshotName?: string | null
    isCurrent?: boolean
    isPublic?: boolean
    shareableSlug?: string | null
    summary?: Record<string, unknown> | null
    skillsVerified?: PublicSnapshotSkill[] | null
    workHighlights?: PublicSnapshotWorkHighlight[] | null
    performanceMetrics?: Record<string, unknown> | null
    trustMetrics?: Record<string, unknown> | null
    scoringVersion?: string
    createdAt?: string
    updatedAt?: string
  }

  interface Props {
    snapshot: PublicProfileSnapshot
  }

  const { snapshot }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  const pageTitle = $derived(
    snapshot.snapshotName ?? t('user.public_snapshot.title', {}, 'Public capability snapshot')
  )
  const skills = $derived(snapshot.skillsVerified ?? [])
  const workHighlights = $derived(snapshot.workHighlights ?? [])
  const summary = $derived(snapshot.summary ?? {})
  const trustMetrics = $derived(snapshot.trustMetrics ?? {})
  const performanceMetrics = $derived(snapshot.performanceMetrics ?? {})
  const verifiedSkillCount = $derived(readNumber(summary.totalVerifiedSkills) ?? skills.length)
  const trustTier = $derived(readString(trustMetrics.currentTierCode) ?? readString(summary.trustTier) ?? 'community')
  const completedTaskCount = $derived(
    readNumber(performanceMetrics.totalTasksCompleted) ?? readNumber(summary.totalTasksCompleted) ?? workHighlights.length
  )

  function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null
  }

  function readNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }

  function formatDate(value?: string | null): string {
    if (!value) return t('user.public_snapshot.date_unavailable', {}, 'Not dated')
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return t('user.public_snapshot.date_unavailable', {}, 'Not dated')
    return new Intl.DateTimeFormat(documentLocale, { dateStyle: 'medium' }).format(date)
  }

  function formatPercent(value: unknown): string {
    const numeric = readNumber(value)
    return numeric === null ? 'N/A' : `${numeric.toFixed(1)}%`
  }

  function skillName(skill: PublicSnapshotSkill): string {
    return skill.skillName ?? skill.skill_name ?? t('user.public_snapshot.unknown_skill', {}, 'Unknown skill')
  }

  function skillLevel(skill: PublicSnapshotSkill): string {
    return skill.verifiedPublicProficiencyCode ?? skill.verified_public_proficiency_code ?? 'unqualified'
  }

  function skillReviewCount(skill: PublicSnapshotSkill): number {
    return skill.totalReviews ?? skill.total_reviews ?? 0
  }

  function skillScore(skill: PublicSnapshotSkill): string {
    return formatPercent(skill.avgPercentage ?? skill.avg_percentage)
  }

  function taskTitle(work: PublicSnapshotWorkHighlight): string {
    return work.taskTitle ?? work.task_title ?? t('user.public_snapshot.unknown_task', {}, 'Untitled work')
  }

  function workCompletedAt(work: PublicSnapshotWorkHighlight): string {
    return formatDate(work.completedAt ?? work.completed_at)
  }

  function workVerificationStatus(work: PublicSnapshotWorkHighlight): string {
    return work.verification?.status === 'review_confirmed'
      ? t('user.public_snapshot.review_confirmed', {}, 'Review confirmed')
      : t('user.public_snapshot.retrospective', {}, 'Retrospective')
  }

  function workVerificationConfidence(work: PublicSnapshotWorkHighlight): string {
    return work.verification?.confidence === 'high'
      ? t('user.public_snapshot.high_confidence', {}, 'high')
      : t('user.public_snapshot.limited_confidence', {}, 'limited')
  }

  function workContextTags(work: PublicSnapshotWorkHighlight): string[] {
    return [
      work.taskType ?? work.task_type,
      work.businessDomain ?? work.business_domain,
      work.problemCategory ?? work.problem_category,
      work.roleInTask ?? work.role_in_task,
      work.collaborationType ?? work.collaboration_type,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="min-h-screen bg-background text-foreground">
  <section class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
    <div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
        {t('user.public_snapshot.eyebrow', {}, 'Public capability artifact')}
      </p>
      <div class="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-black tracking-tight text-foreground">{pageTitle}</h1>
          <p class="mt-2 text-sm text-muted-foreground">
            {t(
              'user.public_snapshot.subtitle',
              { version: snapshot.version, date: formatDate(snapshot.updatedAt) },
              `Snapshot v${snapshot.version} · ${formatDate(snapshot.updatedAt)}`
            )}
          </p>
        </div>
        <div class="rounded-xl border border-border bg-background px-4 py-3 text-sm">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            {t('user.public_snapshot.scoring_version', {}, 'Scoring version')}
          </p>
          <p class="mt-1 font-black">{snapshot.scoringVersion ?? 'v1'}</p>
        </div>
      </div>
    </div>

    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
        {t('user.public_snapshot.work_eyebrow', {}, 'Demonstrated work')}
      </p>
      <h2 class="mt-2 text-2xl font-black">{t('user.public_snapshot.work_title', {}, 'Work highlights')}</h2>
      <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
        {t('user.public_snapshot.work_description', {}, 'Work context is shown before aggregate statistics. Verification labels explain how strongly each record can support a public claim.')}
      </p>

      {#if workHighlights.length === 0}
        <p class="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t('user.public_snapshot.no_work', {}, 'No work highlights in this snapshot.')}
        </p>
      {:else}
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          {#each workHighlights as work, index (`${taskTitle(work)}-${index}`)}
            <article class="rounded-xl border border-border bg-background p-4">
              <p class="font-black">{taskTitle(work)}</p>
              <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                <span>{workCompletedAt(work)}</span>
                <span>{workVerificationStatus(work)}</span>
                <span>{workVerificationConfidence(work)}</span>
              </div>
              {#if workContextTags(work).length > 0}
                <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                  {#each workContextTags(work) as tag}
                    <span class="rounded-full border border-border px-2 py-1">{tag}</span>
                  {/each}
                </div>
              {/if}
            </article>
          {/each}
        </div>
      {/if}
    </section>

    <section class="rounded-2xl border border-border bg-card p-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
            {t('user.public_snapshot.skills_eyebrow', {}, 'Verified capability')}
          </p>
          <h2 class="mt-2 text-2xl font-black">{t('user.public_snapshot.skills_title', {}, 'Skill evidence')}</h2>
        </div>
        <span class="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold">
          {t('user.public_snapshot.skill_count', { count: skills.length }, ':count skills')}
        </span>
      </div>

      {#if skills.length === 0}
        <p class="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t('user.public_snapshot.no_skills', {}, 'No verified skills in this snapshot.')}
        </p>
      {:else}
        <div class="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {#each skills as skill, index (`${skillName(skill)}-${index}`)}
            <article class="rounded-xl border border-border bg-background p-4">
              <p class="font-black">{skillName(skill)}</p>
              <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                <span class="rounded-full border border-border px-2 py-1">{skillLevel(skill)}</span>
                <span>{t('user.public_snapshot.review_count', { count: skillReviewCount(skill) }, ':count reviews')}</span>
                <span>{skillScore(skill)}</span>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>

    <section class="rounded-2xl border border-border bg-card p-5">
      <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
        {t('user.public_snapshot.summary_eyebrow', {}, 'Supporting statistics')}
      </p>
      <div class="mt-3 grid gap-3 md:grid-cols-3">
        <article class="rounded-xl border border-border bg-background p-4">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t('user.public_snapshot.verified_skills', {}, 'Verified skills')}
          </p>
          <p class="mt-2 text-3xl font-black">{verifiedSkillCount}</p>
        </article>
        <article class="rounded-xl border border-border bg-background p-4">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t('user.public_snapshot.trust_tier', {}, 'Trust tier')}
          </p>
          <p class="mt-2 text-3xl font-black capitalize">{trustTier}</p>
        </article>
        <article class="rounded-xl border border-border bg-background p-4">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t('user.public_snapshot.completed_tasks', {}, 'Completed tasks')}
          </p>
          <p class="mt-2 text-3xl font-black">{completedTaskCount}</p>
        </article>
      </div>
    </section>
  </section>
</main>

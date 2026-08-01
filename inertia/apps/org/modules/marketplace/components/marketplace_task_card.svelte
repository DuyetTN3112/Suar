<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import {
    Building2,
    Calendar,
    Tag,
    CircleCheckBig,
    FolderKanban,
    Sparkles,
    User,
    Clock3,
    RefreshCw,
  } from 'lucide-svelte'

  import { getFrontendCanonicalProficiencyLevelLabel } from '@/apps/org/modules/profile/lib/proficiency_level_catalog'
  import { normalizeMarketplaceFitScore } from '@/apps/shared/marketplace/fit_score'
  import { getTaskApplicationsRoute, getTaskDetailRoute } from '@/apps/org/shared/constants/routes'
  import { formatTaskVerificationMethodForDisplay } from '@/apps/org/modules/tasks/lib/rules/task_verification_methods'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import {
    BUSINESS_DOMAIN_OPTIONS,
    DIFFICULTY_CONFIG,
    PROBLEM_CATEGORY_OPTIONS,
    ROLE_IN_TASK_OPTIONS,
    TASK_TYPE_OPTIONS,
    type MarketplaceTask,
  } from '../types.svelte'

  interface Props {
    task: MarketplaceTask
    onApply?: (task: MarketplaceTask) => void
    marketplaceContext?: {
      mode: 'user' | 'organization'
      canRecruit: boolean
      currentOrganizationId?: string | null
      currentUserId?: string | null
    }
  }

  const { task, onApply, marketplaceContext }: Props = $props()
  const { t } = useTranslation()

  const orgName = $derived(task.organization?.name ?? t('task.marketplace_card.unknown_organization', {}, 'Unknown organization'))
  const projectName = $derived(task.project?.name ?? t('task.marketplace_card.no_project', {}, 'No project'))

  const projectOwnerName = $derived(
    (task.project?.owner?.username as string | undefined) ??
      (task.project?.owner?.email as string | undefined) ??
      (task.creator?.username as string | undefined) ??
      t('task.marketplace_card.unknown_owner', {}, 'Unknown owner')
  )

  const difficultyInfo = $derived(
    task.difficulty
      ? {
          ...DIFFICULTY_CONFIG[task.difficulty],
          label: t(
            `task.marketplace_card.difficulty.${task.difficulty}`,
            {},
            DIFFICULTY_CONFIG[task.difficulty].label
          ),
        }
      : null
  )

  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  function formatDate(value: string | null | undefined, withTime = false): string | null {
    if (!value) return null
    return new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(new Date(value))
  }

  const dueDateDisplay = $derived(formatDate(task.due_date))

  const deadlineDisplay = $derived(formatDate(task.application_deadline))

  const descriptionPreview = $derived((task.description ?? '').trim().slice(0, 170))

  const createdAtDisplay = $derived(formatDate(task.created_at, true))

  const startDateDisplay = $derived.by(() => {
    const startDate = (task as { start_date?: string | null }).start_date ?? task.created_at
    return formatDate(startDate, true)
  })

  const updatedAtDisplay = $derived(formatDate(task.updated_at, true))

  function readLevelCode(level: unknown): string | null {
    if (!level || typeof level !== 'object') return null
    const record = level as {
      code?: string | null
      shortName?: string | null
      short_name?: string | null
      displayName?: string | null
      display_name?: string | null
    }
    return (
      record.code ??
      record.shortName ??
      record.short_name ??
      record.displayName?.match(/^L\d+/i)?.[0] ??
      record.display_name?.match(/^L\d+/i)?.[0] ??
      null
    )
  }

  function compactLevelLabel(code: string | null | undefined): string | null {
    const value = code?.trim()
    if (!value) return null
    const canonical = value.match(/^l\d+$/i)?.[0]
    if (canonical) return canonical.toUpperCase()
    const label = getFrontendCanonicalProficiencyLevelLabel(value, value)
    return label.match(/^L\d+/i)?.[0] ?? label
  }

  function pickRequirementLevelCode(
    requirement: MarketplaceTask['required_skills_rel'] extends (infer Item)[] | undefined
      ? Item
      : never,
    camelKey: 'minimumLevel' | 'targetLevel' | 'assessmentCeilingLevel',
    snakeKey: 'minimum_level' | 'target_level' | 'assessment_ceiling_level'
  ): string | null {
    const record = requirement as unknown as Record<string, unknown>
    return readLevelCode(record[camelKey]) ?? readLevelCode(record[snakeKey])
  }

  const skills = $derived(
    task.required_skills_rel
      ?.map((r) => {
        const skillData = r.skill as {
          skill_name?: string
          skillName?: string
          skill_code?: string
          skillCode?: string
          name?: string
        } | undefined
        const skillName =
          [
            skillData?.skill_name,
            skillData?.skillName,
            skillData?.name,
            skillData?.skill_code,
            skillData?.skillCode,
          ]
            .map((value) => value?.trim())
            .find((value): value is string => value !== undefined && value.length > 0) ??
          (r.skill_id ? `Skill #${r.skill_id}` : t('task.marketplace_card.unnamed_skill', {}, 'Unnamed skill'))

        const minimumCode =
          pickRequirementLevelCode(r, 'minimumLevel', 'minimum_level') ??
          r.required_public_proficiency_code ??
          null
        const targetCode = pickRequirementLevelCode(r, 'targetLevel', 'target_level')
        const ceilingCode = pickRequirementLevelCode(
          r,
          'assessmentCeilingLevel',
          'assessment_ceiling_level'
        )
        const minimumLevel = compactLevelLabel(minimumCode)
        const targetLevel = compactLevelLabel(targetCode)
        const ceilingLevel = compactLevelLabel(ceilingCode)
        const hasLevel = Boolean(minimumLevel || targetLevel || ceilingLevel)
        const range =
          minimumLevel && targetLevel && minimumLevel !== targetLevel
            ? `${minimumLevel}-${targetLevel}`
            : (targetLevel ?? minimumLevel ?? (ceilingLevel ? `<= ${ceilingLevel}` : t('task.marketplace_card.range_missing', {}, 'Range missing')))
        const detailParts = [
          minimumLevel ? `${t('task.marketplace_card.min_level', {}, 'Min')} ${minimumLevel}` : null,
          targetLevel ? `${t('task.marketplace_card.target_level', {}, 'Target')} ${targetLevel}` : null,
          ceilingLevel ? `${t('task.marketplace_card.ceiling_level', {}, 'Ceiling')} ${ceilingLevel}` : null,
        ].filter(Boolean)

        return {
          id: r.id,
          name: skillName,
          level: range,
          range,
          detail: detailParts.length > 0 ? detailParts.join(' · ') : t('task.marketplace_card.range_missing', {}, 'Range missing'),
          label: `${skillName} · ${range}`,
          hasLevel,
          isMandatory: Boolean(r.is_mandatory),
          importance: r.importance ?? null,
        }
      })
      .filter(Boolean) ?? []
  )

  const currentUserApplication = $derived(task.current_user_application ?? null)
  const hasApplied = $derived(currentUserApplication !== null || (task.user_applied ?? 0) > 0)
  const isWithdrawable = $derived(currentUserApplication?.status === 'pending')
  const taskCreatorId = $derived(
    ((task as { creator_id?: string | null }).creator_id ?? task.creator?.id) ?? null
  )
  const isOwnTask = $derived(
    Boolean(marketplaceContext?.currentUserId && taskCreatorId === marketplaceContext.currentUserId)
  )
  const isRecruitingMode = $derived(Boolean(marketplaceContext?.canRecruit))
  const isOwnOrganizationTask = $derived(
    Boolean(
      marketplaceContext?.canRecruit &&
        marketplaceContext.currentOrganizationId &&
        task.organization?.id === marketplaceContext.currentOrganizationId
    )
  )
  const canReviewApplications = $derived(
    Boolean(task.can_review_applications) || isOwnOrganizationTask
  )
  const isApplicationDeadlinePassed = $derived.by(() => {
    if (!task.application_deadline) return false
    const deadline = new Date(task.application_deadline).getTime()
    return Number.isFinite(deadline) && deadline < Date.now()
  })
  const canApplyPersonally = $derived(
    !canReviewApplications &&
      !hasApplied &&
      !isOwnTask &&
      !isApplicationDeadlinePassed
  )
  const visibilityLabel = $derived(
    t(
      `task.create.visibility.${task.task_visibility}`,
      {},
      t('task.marketplace_card.unknown_visibility', {}, 'Unknown visibility')
    )
  )
  const priorityScore = $derived(normalizeMarketplaceFitScore(task.priority_score ?? task.match_score))
  const recommendationReasons = $derived(task.recommendation_reasons ?? [])
  const evidenceWarnings = $derived(task.evidence_warnings ?? [])
  const recommendationRisks = $derived(task.recommendation_risks ?? [])

  const taskSummaryItems = $derived.by(() => {
    const items: { label: string; value: string }[] = []
    if (task.task_type) items.push({ label: t('task.marketplace_card.task_type', {}, 'Task type'), value: optionLabel('task_type', TASK_TYPE_OPTIONS, task.task_type) })
    if (task.role_in_task) items.push({ label: t('task.marketplace_card.role', {}, 'Role'), value: optionLabel('role_in_task', ROLE_IN_TASK_OPTIONS, task.role_in_task) })
    if (task.business_domain) items.push({ label: t('task.marketplace_card.domain', {}, 'Domain'), value: optionLabel('business_domain', BUSINESS_DOMAIN_OPTIONS, task.business_domain) })
    if (task.problem_category) items.push({ label: t('task.marketplace_card.problem', {}, 'Problem'), value: optionLabel('problem_category', PROBLEM_CATEGORY_OPTIONS, task.problem_category) })
    if (task.verification_method) {
      items.push({
        label: t('task.marketplace_card.acceptance', {}, 'Acceptance'),
        value: formatTaskVerificationMethodForDisplay(task.verification_method, t).join(', '),
      })
    }
    return items
  })

  const applicationState = $derived.by(() => {
    if (currentUserApplication) {
      return {
        title: applicationStatusLabel(currentUserApplication.status),
        detail: isWithdrawable
          ? t('task.marketplace_card.can_withdraw_pending', {}, 'Can withdraw while pending')
          : t('task.marketplace_card.track_my_applications', {}, 'Track it in my applications'),
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100',
      }
    }
    if (canReviewApplications) {
      return {
        title: t('task.marketplace_card.can_review_applications', {}, 'Can review applications'),
        detail: t('task.marketplace_card.open_candidates', {}, 'Open this task candidate list'),
        tone: 'border-primary/25 bg-primary/10 text-foreground',
      }
    }
    if (isOwnTask) {
      return {
        title: t('task.marketplace_card.own_task', {}, 'Your task'),
        detail: t('task.marketplace_card.cannot_apply_own_task', {}, 'You cannot apply to your own task'),
        tone: 'border-border bg-background text-foreground',
      }
    }
    if (isApplicationDeadlinePassed) {
      return {
        title: t('task.marketplace_card.application_deadline_passed', {}, 'Application deadline passed'),
        detail: t('task.marketplace_card.reference_only', {}, 'Task remains visible for reference'),
        tone: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
      }
    }
    if (canApplyPersonally) {
      return {
        title: t('task.marketplace_card.can_apply', {}, 'Can apply'),
        detail: deadlineDisplay
          ? t('task.marketplace_card.deadline', { date: deadlineDisplay }, 'Deadline: :date')
          : t('task.marketplace_card.marketplace_open', {}, 'Task is open on Marketplace'),
        tone: 'border-border bg-background text-foreground',
      }
    }
    return {
      title: isRecruitingMode
        ? t('task.marketplace_card.viewing_marketplace', {}, 'Viewing marketplace')
        : t('task.marketplace_card.not_applied', {}, 'No application sent'),
      detail: t('task.marketplace_card.marketplace', {}, 'Marketplace'),
      tone: 'border-border bg-background text-foreground',
    }
  })

  function formatPercentMetric(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)))
  }

  const recommendationSummary = $derived.by(() => {
    const signals: string[] = []
    if (typeof task.skill_match === 'number') {
      signals.push(`Skill ${formatPercentMetric(task.skill_match)}%`)
    }
    if (typeof task.domain_match === 'number') {
      signals.push(`Domain ${formatPercentMetric(task.domain_match)}%`)
    }
    if (task.evidence_confidence) {
      signals.push(
        task.evidence_confidence === 'high'
          ? t('task.marketplace_card.evidence.high', {}, 'High evidence')
          : task.evidence_confidence === 'medium'
            ? t('task.marketplace_card.evidence.medium', {}, 'Medium evidence')
            : t('task.marketplace_card.evidence.low', {}, 'Low evidence')
      )
    }
    return signals
  })

  function optionLabel(
    group: 'task_type' | 'business_domain' | 'problem_category' | 'role_in_task',
    options: readonly { value: string; label: string }[],
    value: string | null | undefined
  ): string {
    if (!value) return ''
    const fallback = options.find((option) => option.value === value)?.label ?? value
    return t(`task.taxonomy.${group}.${value}`, {}, fallback)
  }

  let withdrawing = $state(false)

  function applicationStatusLabel(status: 'pending' | 'approved' | 'rejected'): string {
    switch (status) {
      case 'pending':
        return t('task.marketplace_card.application.pending', {}, 'Pending review')
      case 'approved':
        return t('task.marketplace_card.application.approved', {}, 'Approved')
      case 'rejected':
        return t('task.marketplace_card.application.rejected', {}, 'Rejected')
    }
  }

  function handleClick() {
    if (canApplyPersonally) {
      onApply?.(task)
    }
  }

  function handleWithdraw() {
    if (!currentUserApplication || !isWithdrawable) return
    withdrawing = true
    router.post(`/applications/${currentUserApplication.id}/withdraw`, undefined, {
      preserveScroll: true,
      onFinish: () => {
        withdrawing = false
      },
    })
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }
</script>

<article class="marketplace-opportunity rounded-[24px] border border-border bg-card p-5 shadow-suar-xs">
  <div class="flex flex-wrap items-start justify-between gap-4 rounded-[20px] border border-border bg-background p-4">
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <span>{visibilityLabel}</span>
        {#if priorityScore !== null}
          <span class="inline-flex items-center gap-1 rounded-full border border-border bg-accent px-2.5 py-1 text-foreground">
            <Sparkles class="h-3.5 w-3.5" />
            {t('task.marketplace_card.fit_score', { score: priorityScore }, 'Fit :score')}
          </span>
        {/if}
      </div>
      <div>
        <a href={getTaskDetailRoute(task.id)} class="hover:underline hover:text-primary transition-colors">
          <h2 class="text-xl font-black tracking-tight text-foreground">{task.title}</h2>
        </a>
      {#if descriptionPreview}
          <p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{descriptionPreview}</p>
      {/if}
      </div>
    </div>
    {#if difficultyInfo}
      <span class="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
          {difficultyInfo.marker} {difficultyInfo.label}
        </span>
    {/if}
  </div>

  <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
    <div class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><Building2 class="h-4 w-4" /> {orgName}</span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><FolderKanban class="h-4 w-4" /> {projectName}</span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><User class="h-4 w-4" /> {t('task.marketplace_card.project_owner', { owner: projectOwnerName }, 'Project owner: :owner')}</span>
      </div>

      <div class="grid gap-3 rounded-[20px] border border-border bg-muted/30 p-4 text-sm text-muted-foreground md:grid-cols-2">
        <div><Tag class="mr-2 inline h-4 w-4" /> {t('task.marketplace_card.visibility', { value: visibilityLabel }, 'Visibility: :value')}</div>
        {#if createdAtDisplay}<div><Clock3 class="mr-2 inline h-4 w-4" /> {t('task.marketplace_card.created_at', { date: createdAtDisplay }, 'Created: :date')}</div>{/if}
        {#if startDateDisplay}<div><Clock3 class="mr-2 inline h-4 w-4" /> {t('task.marketplace_card.started_at', { date: startDateDisplay }, 'Started: :date')}</div>{/if}
        {#if updatedAtDisplay}<div><RefreshCw class="mr-2 inline h-4 w-4" /> {t('task.marketplace_card.updated_at', { date: updatedAtDisplay }, 'Updated: :date')}</div>{/if}
      </div>

      <div class="flex flex-wrap gap-2">
        {#if dueDateDisplay}
          <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><Calendar class="h-4 w-4" /> {t('task.marketplace_card.due_date', { date: dueDateDisplay }, 'Due: :date')}</span>
        {/if}
        {#if deadlineDisplay}
          <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><Calendar class="h-4 w-4" /> {t('task.marketplace_card.application_deadline', { date: deadlineDisplay }, 'Application deadline: :date')}</span>
        {/if}
      </div>

      <div class="rounded-[20px] border border-border bg-background p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="inline-flex items-center gap-2 text-sm font-bold text-foreground">
            <Tag class="h-4 w-4 text-muted-foreground" />
            {t('task.marketplace_card.required_skills', {}, 'Required task skills')}
          </div>
          <span class="text-xs font-semibold text-muted-foreground">{t('task.marketplace_card.skill_count', { count: skills.length }, ':count skills')}</span>
        </div>
        {#if skills.length > 0}
          <div class="mt-3 flex flex-wrap gap-2">
            {#each skills.slice(0, 4) as skill}
              <span class={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${skill.hasLevel ? 'border-border text-foreground' : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200'}`}>
                {skill.label}{skill.isMandatory ? ` · ${t('task.marketplace_card.mandatory', {}, 'mandatory')}` : ''}
              </span>
            {/each}
            {#if skills.length > 4}
              <span class="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-semibold">{t('task.marketplace_card.more_skills', { count: skills.length - 4 }, '+:count more skills')}</span>
            {/if}
          </div>
        {:else}
          <p class="mt-3 text-sm text-muted-foreground">{t('task.marketplace_card.no_required_skills', {}, 'No required skills declared yet.')}</p>
        {/if}
        {#if skills.some((skill) => !skill.hasLevel)}
          <p class="mt-3 text-xs leading-5 text-amber-900 dark:text-amber-100">
            {t('task.marketplace_card.missing_skill_range_note', {}, 'Some skills have no declared range, so the system only uses skill names for matching.')}
          </p>
        {/if}
      </div>

      {#if taskSummaryItems.length > 0}
        <div class="flex flex-wrap gap-2">
          {#each taskSummaryItems.slice(0, 5) as item}
            <span class="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
              <span class="text-muted-foreground">{item.label}:</span>&nbsp;{item.value}
            </span>
          {/each}
        </div>
      {/if}

      {#if recommendationReasons.length > 0 || recommendationSummary.length > 0 || evidenceWarnings.length > 0 || recommendationRisks.length > 0}
        <div class="rounded-[20px] border border-border bg-background p-4">
          <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles class="h-3.5 w-3.5" />
            {t('task.marketplace_card.profile_recommendation', {}, 'Profile recommendation')}
          </div>
          {#if recommendationSummary.length > 0}
            <div class="mt-3 flex flex-wrap gap-2">
              {#each recommendationSummary as signal}
                <span class="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-foreground">
                  {signal}
                </span>
              {/each}
            </div>
          {/if}
          {#if recommendationReasons.length > 0}
            <ul class="mt-3 space-y-1 text-sm leading-6 text-muted-foreground">
              {#each recommendationReasons.slice(0, 2) as reason}
                <li>{reason}</li>
              {/each}
            </ul>
          {/if}
          {#if evidenceWarnings.length > 0 || recommendationRisks.length > 0}
            <div class="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200">
                {t('task.marketplace_card.needs_verification', {}, 'Needs verification')}
              </div>
              <ul class="mt-1 space-y-1">
                {#each evidenceWarnings.slice(0, 2) as warning}
                  <li>{warning}</li>
                {/each}
                {#each recommendationRisks.slice(0, 2) as risk}
                  <li>{risk}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}

      <div class="flex flex-wrap gap-2">
        <a
          href={getTaskDetailRoute(task.id)}
          class="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"
        >
          {t('task.marketplace_card.view_task_profile', {}, 'View task profile')}
        </a>

        {#if canReviewApplications}
          <a
            href={getTaskApplicationsRoute(task.id)}
            class="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {t('task.marketplace_card.view_applications', {}, 'View applications')}
          </a>
        {:else if canApplyPersonally}
          <button
            type="button"
            class="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onclick={handleClick}
            onkeydown={handleKeydown}
          >
            {t('task.marketplace_card.apply_to_join', {}, 'Apply to join')}
          </button>
        {:else if isApplicationDeadlinePassed && !hasApplied && !isOwnTask}
          <span class="inline-flex items-center rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-semibold text-muted-foreground">
            {t('task.marketplace_card.application_deadline_passed', {}, 'Application deadline passed')}
          </span>
        {:else if isRecruitingMode}
          <span class="inline-flex items-center rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-semibold text-muted-foreground">
            {t('task.marketplace_card.market_signal', {}, 'Market signal')}
          </span>
        {/if}
      </div>

    </div>

    <aside class="self-start rounded-[20px] border border-border bg-muted/30 p-4">
      <h3 class="text-sm font-black text-foreground">{t('task.marketplace_card.join', {}, 'Join')}</h3>
      <div class={`mt-3 rounded-2xl border p-3 text-sm ${applicationState.tone}`}>
        <strong class="block">{applicationState.title}</strong>
        <span class="mt-1 block text-xs opacity-80">{applicationState.detail}</span>
      </div>
      {#if currentUserApplication}
        {#if isWithdrawable}
          <button
            type="button"
            class="mt-4 w-full rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"
            disabled={withdrawing}
            onclick={handleWithdraw}
          >
            {withdrawing ? t('task.marketplace_card.withdraw_application_progress', {}, 'Withdrawing application...') : t('task.marketplace_card.withdraw_application', {}, 'Withdraw application')}
          </button>
        {/if}
      {:else if canReviewApplications}
        <a
          href={getTaskApplicationsRoute(task.id)}
          class="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {t('task.marketplace_card.view_applications', {}, 'View applications')}
        </a>
      {:else if canApplyPersonally}
        <button
          type="button"
          class="mt-4 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          onclick={handleClick}
          onkeydown={handleKeydown}
        >
          {t('task.marketplace_card.apply', {}, 'Apply')}
        </button>
      {/if}
      {#if hasApplied}
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <div class="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
            <CircleCheckBig class="h-4 w-4" /> {t('task.marketplace_card.sent_application', {}, 'Application sent')}
          </div>
          <a
            href="/my-applications"
            class="inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
          >
            {t('task.marketplace_card.manage_applications', {}, 'Manage applications')}
          </a>
        </div>
      {/if}
    </aside>
  </div>
</article>

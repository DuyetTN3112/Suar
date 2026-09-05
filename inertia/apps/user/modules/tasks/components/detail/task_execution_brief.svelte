<script lang="ts">
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import { formatTaskVerificationMethodForDisplay } from '@/apps/user/modules/tasks/lib/rules/task_verification_methods'
  import { projectBusinessDomainLabel } from '@/apps/shared/projects/project_business_domains'
  import { isTaskBriefV2 } from '@/apps/shared/tasks/task_brief_contract'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { TaskResolvedBriefProjection } from '@/apps/user/modules/tasks/types/index.svelte.js'
  import TaskStructuredBrief from '@/apps/user/modules/tasks/components/detail/task_structured_brief.svelte'

  type Deliverable = string | Record<string, unknown>
  type ContractListItem = { id: string; title: string; description?: string | null; state?: string | null }

  interface TaskExecutionBriefTask {
    description?: string | null
    context_background?: string | null
    acceptance_criteria?: string | null
    verification_method?: string | null
    role_in_task?: string | null
    expected_deliverables?: Deliverable[]
    project_business_domains?: string[]
  }

  interface Props {
    task: TaskExecutionBriefTask
    resolvedBrief?: TaskResolvedBriefProjection | null
    onReloadBrief?: () => void
    section?: 'all' | 'content' | 'acceptance'
  }

  const { task, resolvedBrief = null, onReloadBrief, section = 'all' }: Props = $props()
  const { t } = useTranslation()
  const verificationMethods = $derived(
    formatTaskVerificationMethodForDisplay(task.verification_method, t)
  )
  let briefStale = $state(false)
  const staleBrief = $derived(
    briefStale || resolvedBrief?.restrictionCode === 'TASK_BRIEF_ASSIGNMENT_ACCESS_STALE'
  )
  $effect(() => {
    if (resolvedBrief?.restrictionCode === 'TASK_BRIEF_ASSIGNMENT_ACCESS_STALE') {
      briefStale = true
    } else if (resolvedBrief) {
      briefStale = false
    }
  })

  function reloadBrief() {
    if (onReloadBrief) {
      onReloadBrief()
      return
    }
    if (typeof window !== 'undefined') window.location.reload()
  }

  const resolvedWork = $derived(resolvedBrief?.resolvedContract?.work ?? null)
  const structuredBrief = $derived.by(() => {
    const richContent = resolvedBrief?.resolvedContract?.specification?.richContent
    return isTaskBriefV2(richContent) ? richContent : null
  })
  const contractScope = $derived(resolvedWork?.scope ?? [])
  const contractOutOfScope = $derived(resolvedWork?.outOfScope ?? [])
  const contractDeliverables = $derived(resolvedWork?.deliverables ?? [])
  const contractAcceptanceCriteria = $derived(resolvedWork?.acceptanceCriteria ?? [])
  const contractQualityRequirements = $derived(resolvedWork?.qualityRequirements ?? [])
  const contractConstraints = $derived(resolvedWork?.constraints ?? [])
  const contractDependencies = $derived(resolvedWork?.dependencies ?? [])
  const hasContractWork = $derived(
    Boolean(
      resolvedWork &&
        (resolvedWork.action ||
          resolvedWork.object ||
          resolvedWork.problemStatement ||
          resolvedWork.desiredOutcome ||
          resolvedWork.roleInTask ||
          contractScope.length > 0 ||
          contractOutOfScope.length > 0 ||
          contractDeliverables.length > 0 ||
          contractAcceptanceCriteria.length > 0 ||
          contractQualityRequirements.length > 0 ||
          contractConstraints.length > 0 ||
          contractDependencies.length > 0)
    )
  )

  const deliverables = $derived(
    Array.isArray(task.expected_deliverables) ? task.expected_deliverables : []
  )
  const projectBusinessDomains = $derived(
    Array.isArray(task.project_business_domains) ? task.project_business_domains : []
  )

  function formatLabel(value: string): string {
    const normalized = value.replaceAll('_', ' ').trim()
    if (normalized.length === 0) {
      return t('task.execution_brief.metric', {}, 'Metric')
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  function formatDeliverable(item: Deliverable): string {
    if (typeof item === 'string') {
      return item
    }
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    const description = typeof item.description === 'string' ? item.description.trim() : ''
    if (!title) return ''
    return description ? `${title} — ${description}` : title
  }

  const legacyDeliverables = $derived(
    contractDeliverables.length === 0
      ? deliverables.map(formatDeliverable).filter((item) => item.length > 0)
      : []
  )

  function formatContractItem(item: ContractListItem): string {
    return item.description ? `${item.title} — ${item.description}` : item.title
  }

  function formatState(value: TaskResolvedBriefProjection['state']): string {
    return value === 'published'
      ? t('task.execution_brief.state_published', {}, 'Đã chốt')
      : value === 'restricted'
        ? t('task.execution_brief.state_restricted', {}, 'Bị giới hạn')
        : value === 'draft'
          ? t('task.execution_brief.state_draft', {}, 'Bản nháp')
          : t('task.execution_brief.state_legacy', {}, 'Dữ liệu cũ')
  }

  const supportingReferences = $derived(
    resolvedBrief?.resolvedContract?.supportingReferences ?? []
  )

  const hasBriefContent = $derived(
    Boolean(
      resolvedBrief?.resolvedContract ||
        resolvedBrief?.authoring ||
        resolvedBrief?.state === 'restricted' ||
        task.context_background ||
        task.description ||
        task.acceptance_criteria ||
        task.verification_method ||
        task.role_in_task ||
        projectBusinessDomains.length > 0 ||
        hasContractWork ||
        legacyDeliverables.length > 0
    )
  )

  function referenceAccessLabel(
    state: (typeof supportingReferences)[number]['accessState']
  ): string {
    const labels: Record<string, string> = {
      available: t('task.execution_brief.reference_available', {}, 'Có thể truy cập'),
      unavailable: t('task.execution_brief.reference_unavailable', {}, 'Không thể truy cập'),
      restricted: t('task.execution_brief.reference_restricted', {}, 'Bị giới hạn'),
    }
    return labels[state] ?? formatLabel(state)
  }
</script>

{#if hasBriefContent}
  <div class="space-y-6 border-t pt-5" data-testid="task-execution-brief">
    <div>
      <h4 class="text-base font-bold text-foreground">
        {t('task.execution_brief.title', {}, 'Thông tin để thực hiện task')}
      </h4>
      <p class="mt-1 text-sm text-muted-foreground">
        {t('task.execution_brief.description', {}, 'Thông tin người nhận cần để bắt tay làm ngay; tệp đính kèm chỉ là tài liệu hỗ trợ.')}
      </p>
    </div>

    {#if projectBusinessDomains.length > 0}
      <section class="rounded-xl border border-primary/20 bg-primary/[0.03] p-4" data-testid="task-project-business-domains">
        <h5 class="text-sm font-bold">Lĩnh vực nghiệp vụ của Project</h5>
        <p class="mt-1 text-xs text-muted-foreground">
          Task kế thừa ngữ cảnh này từ Project tại thời điểm được tạo; không khai báo riêng ở Task.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          {#each projectBusinessDomains as domain}
            <Badge variant="outline">{projectBusinessDomainLabel(domain)}</Badge>
          {/each}
        </div>
      </section>
    {/if}

    {#if resolvedBrief && hasBriefContent}
      <section class="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4" data-testid="resolved-brief">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('task.execution_brief.contract_label', {}, 'Task information')}
            </p>
            <h5 class="mt-1 text-base font-bold">{staleBrief ? t('task.execution_brief.stale_title', {}, 'Task information changed') : resolvedBrief.resolvedContract?.title ?? t('task.execution_brief.contract_fallback', {}, 'Task instructions')}</h5>
          </div>
          {#if resolvedBrief.state !== 'legacy'}
            <Badge variant={resolvedBrief.state === 'restricted' ? 'outline' : 'secondary'}>{formatState(resolvedBrief.state)}</Badge>
          {/if}
        </div>
        {#if resolvedBrief.changeSummary?.isSuccessor && !staleBrief}
          <section class="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3" data-testid="material-change-reack">
            <h6 class="text-sm font-bold">{t('task.execution_brief.material_change_title', {}, 'Task information updated')}</h6>
            <p class="text-xs text-amber-900 dark:text-amber-100">{t('task.execution_brief.material_change_class', {}, 'Change class')}: {formatLabel(resolvedBrief.changeSummary.changeClass ?? 'material change')}</p>
            {#if (resolvedBrief.changeSummary.changedPaths?.length ?? 0) > 0}<p class="text-xs font-semibold text-amber-900 dark:text-amber-100">{t('task.execution_brief.material_change_paths', {}, 'Changed fields')}</p><ul class="list-disc space-y-1 pl-5 text-xs text-amber-900 dark:text-amber-100">{#each resolvedBrief.changeSummary.changedPaths ?? [] as path}<li>{path}</li>{/each}</ul>{/if}
          </section>
        {/if}
        {#if staleBrief}
          <section class="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3" role="alert" data-testid="stale-brief-recovery">
            <p class="text-sm text-amber-900 dark:text-amber-100">{t('task.execution_brief.stale_message', {}, 'The task information changed. Reload it before continuing.')}</p>
            <Button type="button" size="sm" onclick={reloadBrief}>{t('task.execution_brief.reload_brief', {}, 'Reload task information')}</Button>
          </section>
        {:else if resolvedBrief.state === 'restricted'}
          <p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            {t('task.execution_brief.unavailable', {}, 'The detailed task instructions are not available for this viewer.')}
          </p>
        {:else if !resolvedBrief.resolvedContract && resolvedBrief.authoring}
          {#if resolvedBrief.authoring.specification.plainText}<p class="rounded-lg border bg-background/80 p-3 text-sm">{resolvedBrief.authoring.specification.plainText}</p>{/if}
          <section class="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3" data-testid="readiness-card" aria-labelledby="readiness-card-heading">
            <div class="flex flex-wrap items-center justify-between gap-2"><h6 id="readiness-card-heading" class="text-sm font-bold">Readiness</h6><span class="text-xs font-semibold">{resolvedBrief.authoring.readiness.assignmentReady ? 'Assignment ready' : 'Assignment blocked'}</span></div>
            {#if resolvedBrief.authoring.readiness.blockers.length > 0}<ul class="space-y-2 text-sm" aria-label="Readiness blockers">{#each resolvedBrief.authoring.readiness.blockers as finding}<li class="rounded-lg border border-amber-500/30 bg-background/80 p-2"><p class="font-semibold">{finding.message}</p><p class="text-xs text-muted-foreground">{finding.remediationHint}</p></li>{/each}</ul>{/if}
            {#if resolvedBrief.authoring.readiness.warnings.length > 0}<ul class="space-y-2 text-sm" aria-label="Readiness warnings">{#each resolvedBrief.authoring.readiness.warnings as finding}<li class="rounded-lg border border-border/70 bg-background/80 p-2"><p class="font-semibold">{finding.message}</p><p class="text-xs text-muted-foreground">{finding.remediationHint}</p></li>{/each}</ul>{/if}
          </section>
        {:else if !resolvedBrief.resolvedContract}
          <p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            {t('task.execution_brief.unavailable', {}, 'The detailed task instructions are not available for this viewer.')}
          </p>
        {:else}
          {#if !structuredBrief && resolvedBrief.resolvedContract.specification?.plainText}
            <div class="rounded-lg border bg-background/80 p-3 text-sm leading-6 whitespace-pre-wrap">
              {resolvedBrief.resolvedContract.specification.plainText}
            </div>
          {/if}
          {#if structuredBrief}
            <TaskStructuredBrief brief={structuredBrief} section={section} />
          {:else if hasContractWork}
            <section class="space-y-5" data-testid="task-contract-work">
              <div>
                <h6 class="text-sm font-bold">{t('task.execution_brief.work_contract', {}, 'Yêu cầu công việc')}</h6>
                <p class="mt-1 text-xs text-muted-foreground">{t('task.execution_brief.work_contract_help', {}, 'Đây là nội dung người tạo đã chốt trước khi giao task.')}</p>
              </div>

              {#if resolvedWork?.action || resolvedWork?.object || resolvedWork?.problemStatement || resolvedWork?.desiredOutcome}
                <div class="grid gap-3 md:grid-cols-2">
                  {#if resolvedWork?.action || resolvedWork?.object}
                    <div class="rounded-lg border bg-background/80 p-3 md:col-span-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('task.execution_brief.task_action', {}, 'Việc cần làm')}</span>
                      <p class="mt-1 text-sm font-semibold">{[resolvedWork?.action, resolvedWork?.object].filter(Boolean).join(' — ')}</p>
                    </div>
                  {/if}
                  {#if resolvedWork?.problemStatement}
                    <div class="rounded-lg border bg-background/80 p-3">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('task.execution_brief.problem_statement', {}, 'Vấn đề / bối cảnh')}</span>
                      <p class="mt-1 text-sm leading-6 whitespace-pre-wrap">{resolvedWork.problemStatement}</p>
                    </div>
                  {/if}
                  {#if resolvedWork?.desiredOutcome}
                    <div class="rounded-lg border bg-background/80 p-3">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('task.execution_brief.desired_outcome', {}, 'Kết quả kỳ vọng')}</span>
                      <p class="mt-1 text-sm leading-6 whitespace-pre-wrap">{resolvedWork.desiredOutcome}</p>
                    </div>
                  {/if}
                </div>
              {/if}

              {#if resolvedWork?.roleInTask || resolvedWork?.ownershipLevel}
                <div class="flex flex-wrap gap-2 text-sm">
                  {#if resolvedWork?.roleInTask}<Badge variant="outline">{t('task.execution_brief.role', {}, 'Vai trò')}: {resolvedWork.roleInTask}</Badge>{/if}
                  {#if resolvedWork?.ownershipLevel}<Badge variant="outline">{t('task.execution_brief.ownership', {}, 'Mức sở hữu')}: {formatLabel(resolvedWork.ownershipLevel)}</Badge>{/if}
                </div>
              {/if}

              <div class="grid gap-4 md:grid-cols-2">
                {#if contractScope.length > 0}
                  <div class="rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
                    <h6 class="text-sm font-bold">{t('task.execution_brief.scope', {}, 'Phạm vi thực hiện')}</h6>
                    <p class="mt-1 text-xs text-muted-foreground">{t('task.execution_brief.scope_help', {}, 'Những phần người nhận cần thực hiện trong task.')}</p>
                    <ul class="mt-3 space-y-2 text-sm">{#each contractScope as item}<li class="rounded-lg border bg-background/80 px-3 py-2">{formatContractItem(item)}</li>{/each}</ul>
                  </div>
                {/if}
                {#if contractOutOfScope.length > 0}
                  <div class="rounded-lg border bg-background/80 p-4">
                    <h6 class="text-sm font-bold">{t('task.execution_brief.out_of_scope', {}, 'Ngoài phạm vi')}</h6>
                    <p class="mt-1 text-xs text-muted-foreground">{t('task.execution_brief.out_of_scope_help', {}, 'Những phần không thuộc trách nhiệm của task này.')}</p>
                    <ul class="mt-3 space-y-2 text-sm">{#each contractOutOfScope as item}<li class="rounded-lg border bg-muted/30 px-3 py-2">{formatContractItem(item)}</li>{/each}</ul>
                  </div>
                {/if}
              </div>

              {#if (section === 'all' || section === 'acceptance') && contractDeliverables.length > 0}
                <div>
                  <h6 class="text-sm font-bold">{t('task.execution_brief.deliverables', {}, 'Đầu ra kỳ vọng')}</h6>
                  <p class="mt-1 text-xs text-muted-foreground">{t('task.execution_brief.deliverables_help', {}, 'Sản phẩm task phải tạo ra; không phải báo cáo chứng minh của người làm.')}</p>
                  <ul class="mt-3 space-y-2 text-sm">{#each contractDeliverables as item}<li class="rounded-lg border bg-background/80 px-3 py-2"><span class="font-semibold">{item.title}</span>{#if item.description}<span class="text-muted-foreground"> — {item.description}</span>{/if}</li>{/each}</ul>
                </div>
              {/if}

              {#if (section === 'all' || section === 'acceptance') && contractAcceptanceCriteria.length > 0}
                <div>
                  <h6 class="text-sm font-bold">{t('task.execution_brief.acceptance', {}, 'Tiêu chí nghiệm thu')}</h6>
                  <p class="mt-1 text-xs text-muted-foreground">{t('task.execution_brief.acceptance_help', {}, 'Tester dùng các điều kiện này để kiểm tra kết quả sau khi người làm chuyển task.')}</p>
                  <ul class="mt-3 space-y-2 text-sm">{#each contractAcceptanceCriteria as criterion}<li class="rounded-lg border bg-background/80 px-3 py-2">{criterion.statement}</li>{/each}</ul>
                </div>
              {/if}

              <div class="grid gap-4 md:grid-cols-2">
                {#if (section === 'all' || section === 'acceptance') && contractQualityRequirements.length > 0}<div><h6 class="text-sm font-bold">{t('task.execution_brief.quality', {}, 'Yêu cầu chất lượng')}</h6><ul class="mt-2 space-y-2 text-sm">{#each contractQualityRequirements as item}<li class="rounded-lg border bg-background/80 px-3 py-2">{formatContractItem(item)}</li>{/each}</ul></div>{/if}
                {#if (section === 'all' || section === 'content') && contractConstraints.length > 0}<div><h6 class="text-sm font-bold">{t('task.execution_brief.constraints', {}, 'Ràng buộc')}</h6><ul class="mt-2 space-y-2 text-sm">{#each contractConstraints as item}<li class="rounded-lg border bg-background/80 px-3 py-2">{formatContractItem(item)}</li>{/each}</ul></div>{/if}
                {#if (section === 'all' || section === 'content') && contractDependencies.length > 0}<div><h6 class="text-sm font-bold">{t('task.execution_brief.dependencies', {}, 'Phụ thuộc')}</h6><ul class="mt-2 space-y-2 text-sm">{#each contractDependencies as item}<li class="rounded-lg border bg-background/80 px-3 py-2">{formatContractItem(item)}{#if item.state}<span class="ml-1 text-xs text-muted-foreground">({item.state})</span>{/if}</li>{/each}</ul></div>{/if}
              </div>
            </section>
          {/if}
          {#if (section === 'all' || section === 'acceptance') && supportingReferences.length > 0}
            <section class="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3" data-testid="supporting-references">
              <div>
                <h6 class="text-sm font-bold">{t('task.execution_brief.supporting_references', {}, 'Tài liệu tham khảo')}</h6>
                <p class="mt-1 text-xs text-muted-foreground">{t('task.execution_brief.supporting_references_help', {}, 'Tài liệu chỉ bổ sung bối cảnh; thông tin task ở trên mới là căn cứ thực hiện.')}</p>
              </div>
              <ul class="space-y-2 text-sm">
                {#each supportingReferences as reference}
                  <li class="rounded-lg border border-border/70 bg-background/80 px-3 py-2">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      {#if reference.uri}<a class="font-semibold underline underline-offset-2" href={reference.uri} target="_blank" rel="noreferrer">{reference.title}</a>{:else}<span class="font-semibold">{reference.title}</span>{/if}
                      <span class="text-xs text-muted-foreground">{referenceAccessLabel(reference.accessState)}</span>
                    </div>
                    {#if reference.accessState !== 'available'}<p class="mt-1 text-xs text-amber-800 dark:text-amber-200" role="status">{t('task.execution_brief.reference_status_help', { state: referenceAccessLabel(reference.accessState) }, 'Tài liệu này :state; thông tin task ở trên vẫn là căn cứ chính.')}</p>{/if}
                  </li>
                {/each}
              </ul>
            </section>
          {/if}
        {/if}
      </section>
    {/if}

    {#if !structuredBrief && !resolvedBrief?.resolvedContract && !resolvedBrief?.authoring && (task.description || task.context_background || task.acceptance_criteria || task.verification_method)}
      <section class="space-y-4 rounded-xl border bg-background/80 p-4" data-testid="legacy-task-instructions">
        <div>
          <h5 class="text-sm font-bold">{t('task.execution_brief.local_instructions', {}, 'Thông tin thực hiện')}</h5>
          <p class="mt-1 text-xs text-muted-foreground">{t('task.execution_brief.local_instructions_help', {}, 'Thông tin trực tiếp trên task để người nhận và tester cùng tham chiếu.')}</p>
        </div>
        {#if (section === 'all' || section === 'content') && task.description}<div><h6 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mô tả / hướng dẫn</h6><p class="mt-2 rounded-lg border bg-muted/20 p-3 text-sm leading-6 whitespace-pre-wrap">{task.description}</p></div>{/if}
        {#if (section === 'all' || section === 'content') && task.context_background}<div><h6 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.execution_brief.context', {}, 'Bối cảnh')}</h6><p class="mt-2 rounded-lg border bg-muted/20 p-3 text-sm leading-6 whitespace-pre-wrap">{task.context_background}</p></div>{/if}
        {#if (section === 'all' || section === 'acceptance') && task.acceptance_criteria}<div><h6 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.execution_brief.acceptance', {}, 'Tiêu chí nghiệm thu')}</h6><p class="mt-2 rounded-lg border bg-muted/20 p-3 text-sm leading-6 whitespace-pre-wrap">{task.acceptance_criteria}</p></div>{/if}
        {#if (section === 'all' || section === 'acceptance') && task.verification_method}<div><h6 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('task.execution_brief.verification', {}, 'Cách tester kiểm tra')}</h6><ul class="mt-2 list-disc space-y-1 pl-5 text-sm">{#each verificationMethods as method}<li>{method}</li>{/each}</ul></div>{/if}
      </section>
    {/if}

    {#if (section === 'all' || section === 'acceptance') && legacyDeliverables.length > 0}
      <div class="rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
        <h5 class="text-sm font-bold">{t('task.execution_brief.deliverables', {}, 'Đầu ra kỳ vọng')}</h5>
        <p class="mt-1 text-xs text-muted-foreground">{t('task.execution_brief.deliverables_help', {}, 'Sản phẩm task phải tạo ra; không phải báo cáo chứng minh của người làm.')}</p>
        <ul class="mt-3 space-y-2 text-sm text-muted-foreground">
          {#each legacyDeliverables as item}
            <li class="rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-foreground">{item}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
{/if}
